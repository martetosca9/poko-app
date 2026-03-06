import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

// GET /api/graph — nodos y edges del usuario para el grafo
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [nodes, edges] = await Promise.all([
        prisma.graphNode.findMany({
            where: { userId: session.userId },
            select: { id: true, label: true, type: true, x: true, y: true, documentId: true }
        }),
        prisma.graphEdge.findMany({
            where: { userId: session.userId },
            select: { id: true, sourceId: true, targetId: true }
        })
    ])

    return NextResponse.json({ nodes, edges })
}

// POST /api/graph/edge — crear edge entre dos nodos
export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { sourceId, targetId } = await req.json()

    const edge = await prisma.graphEdge.create({
        data: { sourceId, targetId, userId: session.userId }
    })

    return NextResponse.json({ edge }, { status: 201 })
}