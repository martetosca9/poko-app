import { prisma } from "@/lib/db"

export const MEMORY_CONVERSATION_TITLE = "__poko_memory__"

type UserMemory = {
    notes: string[]
}

function parseMemory(content: string): UserMemory {
    try {
        const parsed = JSON.parse(content) as Partial<UserMemory>
        return { notes: Array.isArray(parsed.notes) ? parsed.notes.filter(note => typeof note === "string") : [] }
    } catch {
        return { notes: [] }
    }
}

function extractMemoryNote(message: string) {
    const compact = message.replace(/\s+/g, " ").trim()
    const lower = compact.toLowerCase()
    const triggers = [
        "prefiero",
        "me gusta",
        "no me gusta",
        "llamame",
        "mi nombre",
        "trabajo en",
        "estoy trabajando",
        "quiero que recuerdes",
        "recordá",
        "siempre que",
        "cuando te pida",
    ]

    if (!triggers.some(trigger => lower.includes(trigger))) return null
    return compact.length > 240 ? `${compact.slice(0, 240)}...` : compact
}

export async function getUserMemory(userId: string): Promise<UserMemory> {
    const memoryConversation = await prisma.conversation.findFirst({
        where: { userId, title: MEMORY_CONVERSATION_TITLE },
        select: {
            messages: {
                where: { role: "system" },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { content: true },
            },
        },
    })

    const latest = memoryConversation?.messages[0]?.content
    return latest ? parseMemory(latest) : { notes: [] }
}

export async function rememberFromMessage(userId: string, message: string): Promise<UserMemory> {
    const note = extractMemoryNote(message)
    const currentMemory = await getUserMemory(userId)
    if (!note || currentMemory.notes.includes(note)) return currentMemory

    const memoryConversation = await ensureMemoryConversation(userId)

    const nextMemory = {
        notes: [note, ...currentMemory.notes].slice(0, 12),
    }

    await prisma.message.create({
        data: {
            conversationId: memoryConversation.id,
            role: "system",
            content: JSON.stringify(nextMemory),
        },
    })

    return nextMemory
}

export async function ensureMemoryConversation(userId: string) {
    const existing = await prisma.conversation.findFirst({
        where: { userId, title: MEMORY_CONVERSATION_TITLE },
        select: { id: true },
    })

    if (existing) return existing

    return prisma.conversation.create({
        data: {
            userId,
            title: MEMORY_CONVERSATION_TITLE,
        },
        select: { id: true },
    })
}

export function formatUserMemory(memory: UserMemory) {
    if (memory.notes.length === 0) return "No hay notas persistentes guardadas."
    return memory.notes.map(note => `- ${note}`).join("\n")
}
