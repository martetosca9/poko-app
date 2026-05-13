import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const conversation = await prisma.conversation.findFirst({
        where: { id, userId: session.userId },
        select: {
            id: true,
            title: true,
            messages: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    role: true,
                    content: true,
                    createdAt: true,
                },
            },
        },
    })

    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ conversation })
}
