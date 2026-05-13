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

export async function chunkAndEmbed(documentId: string, content: string) {
    const chunks = splitIntoChunks(content)

    await prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
            documentId,
            content: chunk,
            chunkIndex: index,
        })),
    })
}

type RelevantChunk = {
    documentId: string
    title: string
    content: string
    score: number
}

type DocumentInventoryItem = {
    id: string
    title: string
    excerpt: string
    updatedAt: Date
}

function tokenize(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9#]+/i)
        .filter(token => token.length > 2)
}

function scoreText(text: string, queryTokens: string[]) {
    const normalized = tokenize(text).join(" ")
    return queryTokens.reduce((score, token) => {
        if (normalized.includes(token)) return score + 1
        return score
    }, 0)
}

function excerpt(text: string, maxLength = 900) {
    const compact = text.replace(/\s+/g, " ").trim()
    return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact
}

export async function getDocumentInventory(userId: string, limit = 30): Promise<DocumentInventoryItem[]> {
    const documents = await prisma.document.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, content: true, updatedAt: true },
        take: limit,
    })

    return documents.map(document => ({
        id: document.id,
        title: document.title,
        excerpt: excerpt(document.content, 180),
        updatedAt: document.updatedAt,
    }))
}

export async function searchRelevantChunks(query: string, userId: string, limit = 5): Promise<RelevantChunk[]> {
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const chunks = await prisma.documentChunk.findMany({
        where: { document: { userId } },
        include: { document: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 80,
    })

    const documents = await prisma.document.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, content: true },
        take: 50,
    })

    const chunkMatches = chunks.map(chunk => ({
        documentId: chunk.document.id,
        title: chunk.document.title,
        content: excerpt(chunk.content),
        score: scoreText(`${chunk.document.title} ${chunk.content}`, queryTokens),
    }))

    const documentMatches = documents
        .map(document => ({
            documentId: document.id,
            title: document.title,
            content: excerpt(document.content),
            score: scoreText(`${document.title} ${document.content}`, queryTokens),
        }))

    const matchesByDocument = new Map<string, RelevantChunk>()

    for (const match of [...chunkMatches, ...documentMatches].filter(document => document.score > 0)) {
        const current = matchesByDocument.get(match.documentId)
        if (!current || match.score > current.score) {
            matchesByDocument.set(match.documentId, match)
        }
    }

    return [...matchesByDocument.values()]
        .filter(document => document.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
}
