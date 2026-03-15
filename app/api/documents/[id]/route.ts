import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { chunkAndEmbed } from "@/lib/embeddings"

type Params = { params: Promise<{ id: string }> }

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
        await prisma.documentChunk.deleteMany({ where: { documentId: id } })
        chunkAndEmbed(id, content).catch(console.error)

        // Parsear #tags del contenido
        const tagMatches = [...content.matchAll(/#([\w]+)/g)].map(m => m[1].toLowerCase())
        const uniqueTags = [...new Set(tagMatches)]

        // Obtener el nodo del doc
        const docNode = await prisma.graphNode.findFirst({ where: { documentId: id } })
        if (docNode) {
            // Eliminar edges anteriores hacia tags
            const oldTagNodes = await prisma.graphNode.findMany({
                where: { userId: session.userId, type: "tag" }
            })
            const oldTagIds = oldTagNodes.map(n => n.id)
            await prisma.graphEdge.deleteMany({
                where: {
                    sourceId: docNode.id,
                    targetId: { in: oldTagIds }
                }
            })

            // Crear/reusar nodos de tag y edges
            for (const tag of uniqueTags) {
                let tagNode = await prisma.graphNode.findFirst({
                    where: { userId: session.userId, type: "tag", label: `#${tag}` }
                })

                if (!tagNode) {
                    tagNode = await prisma.graphNode.create({
                        data: {
                            label: `#${tag}`,
                            type: "tag",
                            userId: session.userId,
                            x: Math.random() * 600 + 100,
                            y: Math.random() * 400 + 100,
                        }
                    })
                }

                // Crear edge si no existe
                await prisma.graphEdge.upsert({
                    where: {
                        sourceId_targetId: {
                            sourceId: docNode.id,
                            targetId: tagNode.id
                        }
                    },
                    update: {},
                    create: {
                        sourceId: docNode.id,
                        targetId: tagNode.id,
                        userId: session.userId
                    }
                })
            }
        }
    }

    return NextResponse.json({ document })
}

export async function DELETE(_req: Request, { params }: Params) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await prisma.graphNode.deleteMany({ where: { documentId: id } })
    await prisma.document.delete({ where: { id } })

    return NextResponse.json({ ok: true })
}