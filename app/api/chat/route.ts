import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getSession } from "@/lib/auth"
import { searchRelevantChunks } from "@/lib/embeddings"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { message, conversationId } = await req.json()

    // Buscar chunks relevantes en los documentos del usuario
    const relevantChunks = await searchRelevantChunks(message, session.userId).catch(() => [])

    // Construir contexto RAG
    const ragContext = relevantChunks.length > 0
        ? `\n\nContexto relevante de los documentos del usuario:\n${relevantChunks.map(c => `[${c.title}]: ${c.content}`).join("\n\n")
        }\n\n`
        : ""

    const systemPrompt = `Eres poko, un asistente inteligente dentro de una app estilo Obsidian. Respondés de forma concisa y directa.${ragContext}Si el contexto de documentos es relevante para la pregunta, usalo para responder con precisión. Si no es relevante, ignoralo.`

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: message }] }],
        systemInstruction: systemPrompt,
    })

    const reply = result.response.text() ?? "Sin respuesta."

    return NextResponse.json({
        reply,
        usedChunks: relevantChunks.length,
    })
}