import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "@/lib/db"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" })

// Fragmenta el contenido en chunks de ~500 palabras con overlap
function splitIntoChunks(text: string, chunkSize = 500, overlap = 50): string[] {
    const words = text.split(/\s+/).filter(Boolean)
    const chunks: string[] = []

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(" ")
        if (chunk.trim()) chunks.push(chunk)
        if (i + chunkSize >= words.length) break
    }

    return chunks.length > 0 ? chunks : [text]
}

// Genera embedding para un texto via Gemini
async function getEmbedding(text: string): Promise<number[]> {
    const result = await embeddingModel.embedContent(text)
    return result.embedding.values
}

// Fragmenta, embeddea y guarda en DB
export async function chunkAndEmbed(documentId: string, content: string) {
    const chunks = splitIntoChunks(content)

    for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbedding(chunks[i])
        const vectorLiteral = `[${embedding.join(",")}]`

        await prisma.$executeRaw`
            INSERT INTO "DocumentChunk" (id, content, embedding, "documentId", "chunkIndex", "createdAt")
            VALUES (
                gen_random_uuid()::text,
                ${chunks[i]},
                ${vectorLiteral}::vector(768),
                ${documentId},
                ${i},
                NOW()
            )
        `
    }
}

// Busca los chunks más similares a una query (para RAG)
export async function searchRelevantChunks(query: string, userId: string, limit = 5) {
    const embedding = await getEmbedding(query)
    const vectorLiteral = `[${embedding.join(",")}]`

    const chunks = await prisma.$queryRaw<{ content: string; documentId: string; title: string }[]>`
        SELECT
            dc.content,
            dc."documentId",
            d.title
        FROM "DocumentChunk" dc
        JOIN "Document" d ON d.id = dc."documentId"
        WHERE d."userId" = ${userId}
        ORDER BY dc.embedding <=> ${vectorLiteral}::vector(768)
        LIMIT ${limit}
    `

    return chunks
}