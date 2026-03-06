import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { chunkAndEmbed } from "@/lib/embeddings"

type Params = { params: { id: string } }

// GET /api/documents/[id]
export async function GET(_req: Request, { params }: Params) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const document = await prisma.document.findFirst({
        where: { id: params.id, userId: session.userId }
    })

    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ document })
}

// PUT /api/documents/[id] — guardar contenido y regenerar chunks/embeddings
export async function PUT(req: Request, { params }: Params) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { title, content } = await req.json()

    const document = await prisma.document.update({
        where: { id: params.id },
        data: {
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
        }
    })

    // Actualizar label del nodo en el grafo si cambió el título
    if (title !== undefined) {
        await prisma.graphNode.updateMany({
            where: { documentId: params.id },
            data: { label: title }
        })
    }

    // Regenerar chunks y embeddings si cambió el contenido
    if (content !== undefined && content.trim().length > 0) {
        // Borrar chunks anteriores
        await prisma.documentChunk.deleteMany({
            where: { documentId: params.id }
        })
        // Generar nuevos (async, no bloqueamos la respuesta)
        chunkAndEmbed(params.id, content).catch(console.error)
    }

    return NextResponse.json({ document })
}

// DELETE /api/documents/[id]
export async function DELETE(_req: Request, { params }: Params) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Borrar nodo del grafo (cascadea edges)
    await prisma.graphNode.deleteMany({
        where: { documentId: params.id }
    })

    await prisma.document.delete({
        where: { id: params.id }
    })

    return NextResponse.json({ ok: true })
}