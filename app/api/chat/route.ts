import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { chunkAndEmbed, getDocumentInventory, searchRelevantChunks } from "@/lib/embeddings"
import { formatUserMemory, MEMORY_CONVERSATION_TITLE, rememberFromMessage } from "@/lib/memory"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function makeTitle(message: string) {
    const compact = message.replace(/\s+/g, " ").trim()
    return compact.length > 48 ? `${compact.slice(0, 48)}...` : compact || "Untitled chat"
}

function normalize(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
}

function isDocumentListRequest(message: string) {
    const normalized = normalize(message)
    const asksForDocs = /\b(doc|docs|documento|documentos)\b/.test(normalized)
    const asksForList = /\b(lista|listar|listame|mostra|mostrar|explora|explorar|cuales|cuantos)\b/.test(normalized)

    return asksForDocs && asksForList
}

function formatDocumentList(documents: Awaited<ReturnType<typeof getDocumentInventory>>) {
    if (documents.length === 0) return "No hay documentos guardados."

    return [
        "Estos son tus documentos:",
        "",
        ...documents.map(document => {
            const preview = document.excerpt ? `: ${document.excerpt}` : ""
            return `- ${document.title}${preview}`
        }),
    ].join("\n")
}

function extractQuotedValue(message: string, patterns: RegExp[]) {
    for (const pattern of patterns) {
        const match = message.match(pattern)
        if (match?.[1]?.trim()) return match[1].trim()
    }

    return null
}

function getCreateDocumentRequest(message: string) {
    const normalized = normalize(message)
    if (!/\b(crea|crear|crees|crear|hace|hacer|genera|generar)\b/.test(normalized)) return null
    if (!/\b(doc|documento)\b/.test(normalized)) return null

    const title = extractQuotedValue(message, [
        /(?:se llame|llamado|t[ií]tulo sea|titulo sea)\s+["'“”]([^"'“”]+)["'“”]/i,
        /(?:se llame|llamado|t[ií]tulo sea|titulo sea)\s+([^,.]+?)(?:\s+y|\s+con|\s+que|\s*$)/i,
    ]) ?? "Untitled"

    const contentInstruction = extractQuotedValue(message, [
        /(?:contenido sea|contenido es|con contenido)\s+["'“”]([^"'“”]+)["'“”]/i,
        /(?:contenido sea|contenido es|con contenido)\s+(.+)$/i,
    ]) ?? "Escribí un texto breve para el documento."

    return { title, contentInstruction }
}

function getUpdateDocumentRequest(message: string) {
    const normalized = normalize(message)
    const asksForUpdate = /\b(rellena|rellenar|completa|completar|actualiza|actualizar|edita|editar|modifica|modificar|escribe|escribir|agrega|agregar|anade|anadir|añade|añadir)\b/.test(normalized)
    const mentionsDocument = /\b(doc|documento)\b/.test(normalized)
    if (!asksForUpdate || !mentionsDocument) return null

    const title = extractQuotedValue(message, [
        /documento\s+["'“”]([^"'“”]+)["'“”]/i,
        /doc\s+["'“”]([^"'“”]+)["'“”]/i,
        /(?:llamado|llamada|titulado|titulada)\s+["'“”]([^"'“”]+)["'“”]/i,
    ])

    if (!title) return null

    const contentInstruction = extractQuotedValue(message, [
        /(?:con|sobre|acerca de)\s+(.+)$/i,
    ]) ?? message

    return { title, contentInstruction }
}

async function generateDocumentContent(title: string, instruction: string) {
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: "Escribí solo el contenido del documento. No agregues explicación, título, markdown ni comillas.",
            },
            {
                role: "user",
                content: `Título: ${title}\nInstrucción: ${instruction}`,
            },
        ],
    })

    return completion.choices[0].message.content?.trim() || instruction
}

async function updateDocumentForUser(userId: string, title: string, content: string) {
    const document = await prisma.document.findFirst({
        where: {
            userId,
            title: { equals: title, mode: "insensitive" },
        },
        select: { id: true, title: true },
    })

    if (!document) return null

    const updatedDocument = await prisma.document.update({
        where: { id: document.id },
        data: { content },
    })

    await prisma.documentChunk.deleteMany({ where: { documentId: document.id } })

    if (content.trim().length > 0) {
        await chunkAndEmbed(document.id, content)
    }

    return updatedDocument
}

async function createDocumentForUser(userId: string, title: string, content: string) {
    const document = await prisma.document.create({
        data: {
            title,
            content,
            userId,
        },
    })

    await prisma.graphNode.create({
        data: {
            label: title,
            type: "doc",
            documentId: document.id,
            userId,
            x: Math.random() * 600 + 100,
            y: Math.random() * 400 + 100,
        },
    })

    if (content.trim().length > 0) {
        await chunkAndEmbed(document.id, content)
    }

    return document
}

async function getRecentConversationMemory(userId: string, currentConversationId: string) {
    const conversations = await prisma.conversation.findMany({
        where: {
            userId,
            id: { not: currentConversationId },
            title: { not: MEMORY_CONVERSATION_TITLE },
        },
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: {
            title: true,
            messages: {
                orderBy: { createdAt: "desc" },
                take: 4,
                select: { role: true, content: true },
            },
        },
    })

    if (conversations.length === 0) return "No hay conversaciones anteriores relevantes."

    return conversations
        .map((conversation, index) => {
            const turns = conversation.messages
                .reverse()
                .map(message => `${message.role}: ${message.content.replace(/\s+/g, " ").slice(0, 240)}`)
                .join("\n")

            return `Conversación ${index + 1}: ${conversation.title ?? "Untitled chat"}\n${turns}`
        })
        .join("\n\n")
}

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { message, conversationId, activeSection } = await req.json()
    if (typeof message !== "string" || message.trim().length === 0) {
        return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const conversation = conversationId
        ? await prisma.conversation.findFirst({
            where: { id: conversationId, userId: session.userId },
        })
        : await prisma.conversation.create({
            data: {
                title: makeTitle(message),
                userId: session.userId,
            },
        })

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    await prisma.message.create({
        data: {
            conversationId: conversation.id,
            role: "user",
            content: message,
        },
    })

    const updateDocumentRequest = getUpdateDocumentRequest(message)
    if (updateDocumentRequest) {
        const content = await generateDocumentContent(
            updateDocumentRequest.title,
            updateDocumentRequest.contentInstruction
        )

        const document = await updateDocumentForUser(session.userId, updateDocumentRequest.title, content)
        const reply = document
            ? [
                `Actualicé el documento "${document.title}".`,
                "",
                "Contenido:",
                content,
            ].join("\n")
            : `No encontré un documento llamado "${updateDocumentRequest.title}".`

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "assistant",
                content: reply,
            },
        })

        return NextResponse.json({
            reply,
            conversationId: conversation.id,
            updatedDocument: document
                ? {
                    id: document.id,
                    title: document.title,
                }
                : null,
        })
    }

    const createDocumentRequest = getCreateDocumentRequest(message)
    if (createDocumentRequest) {
        const content = await generateDocumentContent(
            createDocumentRequest.title,
            createDocumentRequest.contentInstruction
        )

        const document = await createDocumentForUser(session.userId, createDocumentRequest.title, content)
        const reply = [
            `Creé el documento "${document.title}".`,
            "",
            "Contenido:",
            content,
        ].join("\n")

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "assistant",
                content: reply,
            },
        })

        return NextResponse.json({
            reply,
            conversationId: conversation.id,
            createdDocument: {
                id: document.id,
                title: document.title,
            },
        })
    }

    if (isDocumentListRequest(message)) {
        const documentInventory = await getDocumentInventory(session.userId)
        const reply = formatDocumentList(documentInventory)

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "assistant",
                content: reply,
            },
        })

        return NextResponse.json({ reply, conversationId: conversation.id })
    }

    const [recentMessages, relevantChunks, documentInventory, conversationMemory, userMemory] = await Promise.all([
        prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { role: true, content: true },
        }),
        searchRelevantChunks(message, session.userId, 5),
        getDocumentInventory(session.userId),
        getRecentConversationMemory(session.userId, conversation.id),
        rememberFromMessage(session.userId, message),
    ])

    const documentList = documentInventory.length > 0
        ? documentInventory
            .map((document, index) => {
                const preview = document.excerpt ? `\nVista previa: ${document.excerpt}` : ""
                return `${index + 1}. ${document.title} (id: ${document.id})${preview}`
            })
            .join("\n")
        : "No hay documentos guardados."

    const relevantContext = relevantChunks.length > 0
        ? relevantChunks
            .map((chunk, index) => `Fragmento relevante ${index + 1}\nFuente: ${chunk.title}\nContenido: ${chunk.content}`)
            .join("\n\n")
        : "No se encontraron fragmentos relevantes para esta pregunta."

    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: [
                    "Eres poko, un asistente inteligente dentro de una app estilo Obsidian.",
                    "Respondés de forma concisa y directa.",
                    `La sección activa actual de la app es: ${typeof activeSection === "string" ? activeSection : "desconocida"}.`,
                    "Tenés memoria de los mensajes recientes de esta conversación.",
                    "Tenés una memoria breve de conversaciones anteriores, pero tratala como contexto secundario.",
                    "Tenés memoria persistente de preferencias/hechos del usuario, pero no la menciones salvo que ayude.",
                    "Tenés acceso al inventario real de documentos del usuario incluido abajo.",
                    "Para afirmar que un documento existe, usá solo el Inventario de documentos o Fragmentos relevantes.",
                    "La memoria de conversación puede contener errores sobre documentos; no la uses como fuente autorizada para listar, contar o confirmar documentos.",
                    "Si el usuario pide listar, contar, explorar o nombrar documentos, usá el Inventario de documentos, no la memoria de la charla.",
                    "Cuando listes documentos, respondé como lista vertical: una línea por documento, usando '- Título: vista previa'.",
                    "No incluyas IDs salvo que el usuario los pida explícitamente.",
                    "Para responder sobre el contenido de un documento, usá Fragmentos relevantes y Vista previa del inventario.",
                    "Si respondés usando contenido de documentos, mencioná la fuente con 'Fuente: Nombre del documento'.",
                    "Si el usuario usa referencias como 'ese documento' o 'el último', inferí el referente desde los mensajes recientes y el inventario.",
                    "No afirmes que creaste, actualizaste, editaste o borraste un documento salvo que la app haya ejecutado una acción real y esa acción aparezca en el contexto inmediato.",
                    "Si el inventario o los fragmentos no contienen la respuesta, decilo con claridad y no inventes.",
                    "Evitá cerrar con preguntas genéricas cuando solo estás listando o resumiendo datos.",
                    "",
                    "Memoria breve de conversaciones anteriores:",
                    conversationMemory,
                    "",
                    "Memoria persistente del usuario:",
                    formatUserMemory(userMemory),
                    "",
                    "Inventario de documentos:",
                    documentList,
                    "",
                    "Fragmentos relevantes:",
                    relevantContext,
                ].join("\n")
            },
            ...recentMessages
                .reverse()
                .map(msg => ({
                    role: msg.role,
                    content: msg.content,
                })),
        ],
    })

    const reply = completion.choices[0].message.content ?? "Sin respuesta."

    await prisma.message.create({
        data: {
            conversationId: conversation.id,
            role: "assistant",
            content: reply,
        },
    })

    return NextResponse.json({ reply, conversationId: conversation.id })
}
