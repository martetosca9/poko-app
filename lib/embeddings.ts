import { prisma } from "@/lib/db"

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

// Embeddings desactivados hasta tener API — devuelve vacío
async function getEmbedding(_text: string): Promise<number[]> {
    return []
}

export async function chunkAndEmbed(_documentId: string, _content: string) {
    // Desactivado hasta tener API de embeddings
    return
}

export async function searchRelevantChunks(_query: string, _userId: string, _limit = 5) {
    // Desactivado hasta tener API de embeddings
    return []
}