import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

// GET /api/documents — listar docs del usuario
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const documents = await prisma.document.findMany({
        where: { userId: session.userId },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            // No incluimos content en el listado — solo al abrir el doc
        }
    })

    return NextResponse.json({ documents })
}

// POST /api/documents — crear nuevo documento
export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const title = body.title ?? "Untitled"

    const document = await prisma.document.create({
        data: {
            title,
            content: "",
            userId: session.userId,
        }
    })

    // Crear nodo en el grafo automáticamente
    await prisma.graphNode.create({
        data: {
            label: title,
            type: "doc",
            documentId: document.id,
            userId: session.userId,
            x: Math.random() * 600 + 100,
            y: Math.random() * 400 + 100,
        }
    })

    return NextResponse.json({ document }, { status: 201 })
}
