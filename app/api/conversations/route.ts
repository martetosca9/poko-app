import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { MEMORY_CONVERSATION_TITLE } from "@/lib/memory"

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const conversations = await prisma.conversation.findMany({
        where: {
            userId: session.userId,
            title: { not: MEMORY_CONVERSATION_TITLE },
        },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    return NextResponse.json({ conversations })
}
