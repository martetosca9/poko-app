import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/db"
import { signToken } from "@/lib/auth"

export async function POST(req: Request) {
    const { email, password } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) {
        return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
        return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const token = signToken({ id: user.id, email: user.email! })

    const res = NextResponse.json({ ok: true })
    res.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7
    })

    return res
}