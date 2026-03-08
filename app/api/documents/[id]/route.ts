import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { chunkAndEmbed } from "@/lib/embeddings"

type Params = { params: Promise<{ id: string }> }

// GET /api/documents/[id]
export async function GET(_req: Request, { params }: Params) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const document = await prisma.document.findFirst({
        where: { id, userId: session.userId }
    })

    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ document })
}

// PUT /api/documents/[id]
export async function PUT(req: Request, { params }: Params) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { title, content } = await req.json()

    const document = await prisma.document.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
        }
    })

    if (title !== undefined) {
        await prisma.graphNode.updateMany({
            where: { documentId: id },
            data: { label: title }
        })
    }

    if (content !== undefined && content.trim().length > 0) {
        await prisma.documentChunk.deleteMany({
            where: { documentId: id }
        })
        chunkAndEmbed(id, content).catch(console.error)
    }

    return NextResponse.json({ document })
}

// DELETE /api/documents/[id]
export async function DELETE(_req: Request, { params }: Params) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await prisma.graphNode.deleteMany({
        where: { documentId: id }
    })

    await prisma.document.delete({
        where: { id }
    })

    return NextResponse.json({ ok: true })
}