import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
    const { message } = await req.json()

    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: "Eres poko, un asistente inteligente dentro de una app estilo Obsidian. Respondés de forma concisa y directa."
            },
            {
                role: "user",
                content: message
            }
        ],
    })

    const reply = completion.choices[0].message.content ?? "Sin respuesta."

    return NextResponse.json({ reply })
}