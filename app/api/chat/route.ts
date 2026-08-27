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

function cleanExtractedTitle(title: string) {
    return title
        .replace(/^["'“”]+|["'“”]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

function stripDocumentReference(message: string, title: string) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    return message
        .replace(new RegExp(`\\b(?:el\\s+|mi\\s+)?doc(?:umento)?\\s+(?:que\\s+)?(?:se\\s+llama|llamado|llamada|titulado|titulada)\\s+["'“”]?${escapedTitle}["'“”]?`, "i"), "")
        .replace(new RegExp(`\\b(?:el\\s+|mi\\s+)?doc(?:umento)?\\s+["'“”]${escapedTitle}["'“”]`, "i"), "")
        .replace(/\s+/g, " ")
        .trim()
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

function isDocumentUpdateFollowUp(message: string) {
    const normalized = normalize(message)
    return /\b(fijate|fijate de nuevo|intentalo|intentalo de nuevo|prueba otra vez|de nuevo|otra vez|ahora si|revisa|revisalo|volve a intentar|ahora esa info|esa info|no veo|no aparece|no esta guardado|no lo rellenaste|no lo guardaste|porque no)\b/.test(normalized)
}

const DOCUMENT_EDIT_VERB =
    /\b(rellen\w*|complet\w*|actualiz\w*|edit\w*|modific\w*|escrib\w*|agreg\w*|anad\w*|añad\w*|pon\w*|guard\w*|llen\w*|met\w*|insert\w*|copi\w*|pas\w*)\b/

function getUpdateDocumentRequest(message: string) {
    const normalized = normalize(message)
    const asksForUpdate = DOCUMENT_EDIT_VERB.test(normalized)
    const mentionsDocument = /\b(doc|documento|nota|archivo)\b/.test(normalized)
    if (!asksForUpdate || !mentionsDocument) return null

    const rawTitle = extractQuotedValue(message, [
        /documento\s+["'“”]([^"'“”]+)["'“”]/i,
        /doc\s+["'“”]([^"'“”]+)["'“”]/i,
        /(?:llamado|llamada|titulado|titulada)\s+["'“”']([^"'“”']+)["'“”']/i,
        /(?:llamado|llamada|titulado|titulada)\s+["'“”]([^"'“”]+)["'“”]/i,
        /(?:documento|doc)\s+(?:que\s+)?(?:se\s+llama|llamado|llamada|titulado|titulada)\s+([^,.]+?)(?:\s*$|\s+con\b|\s+sobre\b|\s+acerca\s+de\b|[,.])/i,
    ])

    if (!rawTitle) return null

    const title = cleanExtractedTitle(rawTitle)
    if (!title) return null

    const messageWithoutDocumentReference = stripDocumentReference(message, title)

    const contentInstruction =
        extractQuotedValue(messageWithoutDocumentReference, [
            /(?:rellen\w*|complet\w*|actualiz\w*|edit\w*|modific\w*|escrib\w*|agreg\w*|anad\w*|añad\w*|pon\w*|guard\w*|llen\w*|met\w*)\s+(.+)$/i,
        ]) ?? messageWithoutDocumentReference

    return { title, contentInstruction }
}

function hasDocumentEditCue(message: string) {
    return DOCUMENT_EDIT_VERB.test(normalize(message))
}

function wantsDocumentPersist(message: string) {
    const normalized = normalize(message)
    return (
        hasDocumentEditCue(message) ||
        isDocumentUpdateFollowUp(message) ||
        (/\b(doc|documento|nota|archivo)\b/.test(normalized) &&
            /\b(mete|mete\w*|guard\w*|insert\w*|copi\w*|pas\w*|ahi)\b/.test(normalized))
    )
}

function findReferencedDocumentTitle(message: string, documents: { title: string }[]) {
    const normalizedMessage = normalize(message)
    const sorted = [...documents].sort((a, b) => b.title.length - a.title.length)

    for (const document of sorted) {
        const normalizedTitle = normalize(document.title)
        if (normalizedTitle.length < 2) continue
        if (normalizedMessage.includes(normalizedTitle)) return document.title
    }

    // Título parcial: "consonantes" → "consonantes (creado por mi)"
    for (const document of sorted) {
        const normalizedTitle = normalize(document.title)
        const tokens = normalizedMessage.split(/\s+/).filter(token => token.length >= 4)
        for (const token of tokens) {
            if (normalizedTitle.includes(token) && token.length >= Math.min(6, normalizedTitle.length)) {
                return document.title
            }
        }
    }

    const quotedMatch = message.match(/["'“”']([^"'“”']{2,})["'“”']/)
    if (quotedMatch?.[1]) {
        const quoted = normalize(quotedMatch[1])
        const match = sorted.find(document => {
            const normalizedTitle = normalize(document.title)
            return normalizedTitle.includes(quoted) || quoted.includes(normalizedTitle)
        })
        if (match) return match.title
    }

    return null
}

function findDocumentTitleFromRecentUserMessages(
    recentMessages: { role: string; content: string }[],
    documents: { title: string }[]
) {
    for (const recentMessage of recentMessages) {
        if (recentMessage.role !== "user") continue
        const title = findReferencedDocumentTitle(recentMessage.content, documents)
        if (title) return title
    }
    return null
}

function extractDocumentBodyFromAssistantReply(content: string) {
    const lines = content.split("\n")
    const body: string[] = []

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
            if (body.length > 0) body.push("")
            continue
        }
        if (/^(en el documento|fuente:|puedo rellenarlo|ahora se encuentra)/i.test(trimmed)) continue
        if (/^["'“”].*["'“”']$/.test(trimmed)) continue
        body.push(line)
    }

    return body.join("\n").trim()
}

function getPersistFromPriorAssistantContent(
    message: string,
    recentMessages: { role: string; content: string }[],
    documents: { title: string }[]
) {
    const normalized = normalize(message)
    const wantsPriorContent =
        /\b(mete|mete\w*|guard\w*|insert\w*|pon\w*|esa info|ahora esa|lo que dijiste|el texto)\b/.test(normalized) ||
        /\b(no\s+veo|no\s+aparece|no\s+esta|rellenaste|guardaste)\b/.test(normalized)

    if (!wantsPriorContent) return null

    const title =
        findReferencedDocumentTitle(message, documents) ??
        findDocumentTitleFromRecentUserMessages(recentMessages, documents)

    if (!title) return null

    const lastAssistant = recentMessages.find(
        turn => turn.role === "assistant" && turn.content.trim().length > 80
    )
    if (!lastAssistant) return null

    const content = extractDocumentBodyFromAssistantReply(lastAssistant.content)
    if (content.length < 40) return null

    return { title, content }
}

function getUpdateDocumentRequestFromInventory(
    message: string,
    documents: { title: string }[]
) {
    if (!hasDocumentEditCue(message)) return null

    const title = findReferencedDocumentTitle(message, documents)
    if (!title) return null

    const contentInstruction = stripDocumentReference(message, title).trim() || message.trim()
    if (!contentInstruction) return null

    return { title, contentInstruction }
}

function getUpdateDocumentRequestFromHistory(
    message: string,
    recentMessages: { role: string; content: string }[],
    documents: { title: string }[]
) {
    if (!isDocumentUpdateFollowUp(message)) return null

    for (const recentMessage of recentMessages) {
        if (recentMessage.role !== "user") continue
        const priorRequest =
            getUpdateDocumentRequest(recentMessage.content) ??
            getUpdateDocumentRequestFromInventory(recentMessage.content, documents)

        if (!priorRequest) continue

        return {
            title: priorRequest.title,
            contentInstruction: priorRequest.contentInstruction,
        }
    }

    return null
}

async function detectDocumentEditIntentWithLLM(
    message: string,
    documents: { title: string }[],
    recentMessages: { role: string; content: string }[]
) {
    if (documents.length === 0) return null

    const referencedTitle = findReferencedDocumentTitle(message, documents)
    const hasEditCue = hasDocumentEditCue(message)
    const followUp = isDocumentUpdateFollowUp(message)

    if (!hasEditCue && !followUp) return null
    if (!referencedTitle && !followUp && !/\b(doc|documento|nota|archivo)\b/.test(normalize(message))) {
        return null
    }

    const titles = documents.map(document => document.title).join(" | ")
    const conversation = recentMessages
        .slice()
        .reverse()
        .slice(-8)
        .map(turn => `${turn.role}: ${turn.content.replace(/\s+/g, " ").slice(0, 320)}`)
        .join("\n")

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: [
                        "Detectá si el usuario quiere MODIFICAR y GUARDAR el contenido de un documento existente de su inventario.",
                        `Títulos válidos (usá uno EXACTO): ${titles}`,
                        'Respondé solo JSON: {"action":"none"} o {"action":"update","title":"<título exacto>","contentInstruction":"<qué debe contener el documento>"}',
                        "Si el mensaje es un seguimiento (ej. fijate de nuevo), usá mensajes anteriores del usuario para inferir título e instrucción.",
                        'Si no pide editar/guardar contenido en un documento existente, respondé {"action":"none"}.',
                    ].join(" "),
                },
                {
                    role: "user",
                    content: `Conversación reciente:\n${conversation || "(vacía)"}\n\nMensaje actual:\n${message}`,
                },
            ],
        })

        const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as {
            action?: string
            title?: string
            contentInstruction?: string
        }

        if (parsed.action !== "update" || !parsed.title || !parsed.contentInstruction) return null

        const parsedTitle = parsed.title.trim()
        const exactTitle =
            documents.find(document => normalize(document.title) === normalize(parsedTitle))?.title ??
            findReferencedDocumentTitle(parsedTitle, documents) ??
            referencedTitle

        if (!exactTitle) return null

        return {
            title: exactTitle,
            contentInstruction: parsed.contentInstruction.trim(),
        }
    } catch {
        return null
    }
}

type DocumentSaveRequest = {
    title: string
    contentInstruction: string
    useRawContent?: boolean
}

async function resolveDocumentSaveRequest(
    message: string,
    recentMessages: { role: string; content: string }[],
    documents: { title: string }[]
): Promise<DocumentSaveRequest | null> {
    const priorContent = getPersistFromPriorAssistantContent(message, recentMessages, documents)
    if (priorContent) {
        return {
            title: priorContent.title,
            contentInstruction: priorContent.content,
            useRawContent: true,
        }
    }

    const structured =
        getUpdateDocumentRequest(message) ??
        getUpdateDocumentRequestFromInventory(message, documents) ??
        getUpdateDocumentRequestFromHistory(message, recentMessages, documents) ??
        (await detectDocumentEditIntentWithLLM(message, documents, recentMessages))

    if (structured) {
        const inventoryTitle = findReferencedDocumentTitle(structured.title, documents)
        return {
            ...structured,
            title: inventoryTitle ?? structured.title,
        }
    }

    return structured
}

async function resolveDocumentForUser(userId: string, title: string) {
    const exact = await prisma.document.findFirst({
        where: {
            userId,
            title,
        },
        select: { id: true, title: true },
    })
    if (exact) return exact

    const documents = await prisma.document.findMany({
        where: { userId },
        select: { id: true, title: true },
    })

    const normalizedSearch = normalize(title)
    const sorted = [...documents].sort((a, b) => b.title.length - a.title.length)

    return (
        sorted.find(document => normalize(document.title) === normalizedSearch) ??
        sorted.find(document => normalize(document.title).includes(normalizedSearch)) ??
        sorted.find(document => normalizedSearch.includes(normalize(document.title))) ??
        null
    )
}

async function persistDocumentUpdate(
    userId: string,
    title: string,
    contentInstruction: string,
    useRawContent = false
) {
    const content = useRawContent
        ? contentInstruction
        : await generateDocumentContent(title, contentInstruction)

    const document = await updateDocumentForUser(userId, title, content)

    const reply = document
        ? savedDocumentReply(document.title, content)
        : `No encontré un documento llamado "${title}". Revisá el título exacto en Documents.`

    return { reply, document, content }
}

const DOCUMENT_TOOLS = [
    {
        type: "function" as const,
        function: {
            name: "update_document",
            description: "Reemplaza el contenido de un documento existente y lo guarda en la sección Documents. Llamá esta herramienta cuando el usuario pida rellenar, actualizar, editar o meter texto en un documento. El título debe coincidir con uno del inventario.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Título del documento existente" },
                    content: { type: "string", description: "Contenido completo a guardar" },
                },
                required: ["title", "content"],
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "create_document",
            description: "Crea un documento nuevo y lo guarda en Documents.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                },
                required: ["title", "content"],
            },
        },
    },
]

type GroqToolCall = {
    id?: string
    type?: string
    function?: {
        name?: string
        arguments?: string
    }
}

function parseToolArguments(raw: string | undefined) {
    try {
        const parsed = JSON.parse(raw || "{}") as { title?: string; content?: string }
        return {
            title: typeof parsed.title === "string" ? parsed.title.trim() : "",
            content: typeof parsed.content === "string" ? parsed.content.trim() : "",
        }
    } catch {
        return { title: "", content: "" }
    }
}

function savedDocumentReply(title: string, content: string) {
    return [
        `Guardé los cambios en el documento "${title}". Podés verlo en la sección Documents.`,
        "",
        "Contenido:",
        content,
    ].join("\n")
}

function claimsUnverifiedDocumentWrite(text: string) {
    const normalized = normalize(text)
    return (
        /\b(guarde|actualice|rellene|edite|cree el documento|lo rellene|lo actualice|lo guarde|se ha rellenado|puedo rellenarlo|ahora se encuentra)\b/.test(normalized) ||
        /en el documento[\s\S]{0,80}(puedo|ahora|se encuentra|se ha)/i.test(text)
    )
}

function sanitizeUnverifiedWriteClaim(text: string) {
    if (!claimsUnverifiedDocumentWrite(text)) return text

    const body = extractDocumentBodyFromAssistantReply(text)
    return [
        "Todavía no guardé nada en Documents. Esto es solo texto del chat.",
        'Si querés persistirlo, decime: "guardá esto en el documento [título]".',
        "",
        body || text,
    ].join("\n")
}

async function applyDocumentTool(
    userId: string,
    name: string,
    args: { title: string; content: string }
) {
    if (!args.title || !args.content) {
        return { ok: false as const, reply: "Faltó título o contenido para guardar el documento." }
    }

    if (name === "create_document") {
        const document = await createDocumentForUser(userId, args.title, args.content)
        return {
            ok: true as const,
            document,
            created: true,
            reply: savedDocumentReply(document.title, args.content),
        }
    }

    if (name === "update_document") {
        const document = await updateDocumentForUser(userId, args.title, args.content)
        if (!document) {
            return {
                ok: false as const,
                reply: `No encontré un documento llamado "${args.title}". Revisá el título exacto en Documents.`,
            }
        }
        return {
            ok: true as const,
            document,
            created: false,
            reply: savedDocumentReply(document.title, args.content),
        }
    }

    return { ok: false as const, reply: "Herramienta de documento desconocida." }
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
    const document = await resolveDocumentForUser(userId, title)

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

    const [recentMessagesForFollowUp, documentInventory] = await Promise.all([
        prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { role: true, content: true },
        }),
        getDocumentInventory(session.userId),
    ])

    const documentSaveRequest = await resolveDocumentSaveRequest(
        message,
        recentMessagesForFollowUp,
        documentInventory
    )

    if (documentSaveRequest) {
        const { reply, document } = await persistDocumentUpdate(
            session.userId,
            documentSaveRequest.title,
            documentSaveRequest.contentInstruction,
            documentSaveRequest.useRawContent
        )

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
            documentUpdated: Boolean(document),
            updatedDocument: document
                ? {
                    id: document.id,
                    title: document.title,
                }
                : null,
        })
    }

    if (wantsDocumentPersist(message)) {
        const titles = documentInventory.map(document => document.title).join(", ") || "(ninguno)"
        const reply = `No pude guardar en un documento. Títulos disponibles: ${titles}. Nombrá uno exacto, por ejemplo: "guardá esto en el documento consonantes (creado por mi)".`

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "assistant",
                content: reply,
            },
        })

        return NextResponse.json({ reply, conversationId: conversation.id })
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
            documentUpdated: true,
            createdDocument: {
                id: document.id,
                title: document.title,
            },
        })
    }

    if (isDocumentListRequest(message)) {
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

    const [recentMessages, relevantChunks, conversationMemory, userMemory] = await Promise.all([
        prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { role: true, content: true },
        }),
        searchRelevantChunks(message, session.userId, 5),
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
                    "Si el usuario pide rellenar, actualizar, editar, crear o guardar un documento, DEBÉS llamar a update_document o create_document. No describas el contenido como si ya estuviera guardado.",
                    "Nunca digas que rellenaste, actualizaste, creaste o guardaste un documento en el texto. Eso solo ocurre si llamás a una herramienta y la app confirma el guardado.",
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
                    role: (msg.role === "assistant" || msg.role === "system" ? msg.role : "user") as "user" | "assistant" | "system",
                    content: msg.content,
                })),
        ],
        tools: DOCUMENT_TOOLS,
        tool_choice: "auto",
    })

    const assistantMessage = completion.choices[0].message
    const toolCalls = (assistantMessage.tool_calls ?? []) as GroqToolCall[]
    const writeToolCall = toolCalls.find(call => {
        const name = call.function?.name
        return name === "update_document" || name === "create_document"
    })

    if (writeToolCall) {
        const result = await applyDocumentTool(
            session.userId,
            writeToolCall.function?.name ?? "",
            parseToolArguments(writeToolCall.function?.arguments)
        )

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "assistant",
                content: result.reply,
            },
        })

        return NextResponse.json({
            reply: result.reply,
            conversationId: conversation.id,
            documentUpdated: result.ok,
            updatedDocument: result.ok && !result.created
                ? { id: result.document.id, title: result.document.title }
                : null,
            createdDocument: result.ok && result.created
                ? { id: result.document.id, title: result.document.title }
                : null,
        })
    }

    const reply = sanitizeUnverifiedWriteClaim(assistantMessage.content ?? "Sin respuesta.")

    await prisma.message.create({
        data: {
            conversationId: conversation.id,
            role: "assistant",
            content: reply,
        },
    })

    return NextResponse.json({ reply, conversationId: conversation.id })
}
