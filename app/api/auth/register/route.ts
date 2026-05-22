import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/db"
import { signToken } from "@/lib/auth"

export async function POST(req: Request) {
    const { name, email, password } = await req.json()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return NextResponse.json({ error: "Email ya registrado" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
        data: { name, email, password: hashed }
    })

    const token = signToken({ id: user.id, email: user.email! })

    const res = NextResponse.json({ ok: true })
    res.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    })

    return res
}
