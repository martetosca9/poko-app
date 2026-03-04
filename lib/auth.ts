import jwt from "jsonwebtoken"

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