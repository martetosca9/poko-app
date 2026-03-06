import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const SECRET = process.env.JWT_SECRET!

export function signToken(payload: { id: string; email: string }) {
    return jwt.sign(payload, SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, SECRET) as { id: string; email: string }
    } catch {
        return null
    }
}

export async function getSession(): Promise<{ userId: string; email: string } | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    return { userId: payload.id, email: payload.email }
}