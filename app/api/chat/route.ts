import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getDocumentInventory, searchRelevantChunks } from "@/lib/embeddings"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function makeTitle(message: string) {
    const compact = message.replace(/\s+/g, " ").trim()
    return compact.length > 48 ? `${compact.slice(0, 48)}...` : compact || "Untitled chat"
}

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { message, conversationId } = await req.json()
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

    const [recentMessages, relevantChunks, documentInventory] = await Promise.all([
        prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { role: true, content: true },
        }),
        searchRelevantChunks(message, session.userId, 5),
        getDocumentInventory(session.userId),
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
            .map((chunk, index) => `Fragmento relevante ${index + 1}: ${chunk.title}\n${chunk.content}`)
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
                    "Tenés memoria de los mensajes recientes de esta conversación.",
                    "Tenés acceso al inventario real de documentos del usuario incluido abajo.",
                    "Si el usuario pide listar, contar, explorar o nombrar documentos, usá el Inventario de documentos, no la memoria de la charla.",
                    "Cuando listes documentos, respondé como lista vertical: una línea por documento, usando '- Título: vista previa'.",
                    "No incluyas IDs salvo que el usuario los pida explícitamente.",
                    "Para responder sobre el contenido de un documento, usá Fragmentos relevantes y Vista previa del inventario.",
                    "Si el inventario o los fragmentos no contienen la respuesta, decilo con claridad y no inventes.",
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
