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

// Embeddings are disabled for now; chunks still power document retrieval.
export async function chunkAndEmbed(_documentId: string, _content: string) {
    const content = _content.trim()
    if (!content) return

    const chunks = splitIntoChunks(content)
    await prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
            documentId: _documentId,
            content: chunk,
            chunkIndex: index,
        }))
    })
}

export async function searchRelevantChunks(_query: string, _userId: string, _limit = 5) {
    void _query
    void _userId
    void _limit

    // Search is disabled until embeddings are available.
    return []
}
