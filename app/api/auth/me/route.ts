import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, name: true, createdAt: true }
    })

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 401 })

    return NextResponse.json({ ok: true, user })
}