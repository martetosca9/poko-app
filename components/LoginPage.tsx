"use client"

import { useState } from "react"
import { LOGIN_TITLE, REGISTER_TITLE } from "@/lib/ascii-titles"

type Mode = "login" | "register"

type Props = {
    onSuccess: () => void
}

export default function LoginPage({ onSuccess }: Props) {
    const [mode, setMode] = useState<Mode>("login")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit() {
        setError("")
        setLoading(true)

        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
        const body = mode === "login"
            ? { email, password }
            : { name, email, password }

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error ?? "Error desconocido")
            } else {
                onSuccess()
            }
        } catch {
            setError("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const playClick = () => {
        const audio = new Audio("/sounds/617256__cpfcfan10__quick-computer-mouse-scroll.wav")
        audio.volume = 0.5
        audio.play().catch(() => {})
    }

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-neutral-950 px-8">

            {/* Títulos ASCII lado a lado */}
            <div className="mb-10 flex gap-16 overflow-x-auto">
                <pre
                    onClick={() => { playClick(); setMode("login"); setError("") }}
                    className={`cursor-pointer text-[9px] leading-tight transition-all select-none ${
                        mode === "login"
                            ? "text-green-400 drop-shadow-[0_0_8px_#22c55e]"
                            : "text-neutral-700 hover:text-neutral-500"
                    }`}
                >
                    {LOGIN_TITLE}
                </pre>

                <pre
                    onClick={() => { playClick(); setMode("register"); setError("") }}
                    className={`cursor-pointer text-[9px] leading-tight transition-all select-none ${
                        mode === "register"
                            ? "text-green-400 drop-shadow-[0_0_8px_#22c55e]"
                            : "text-neutral-700 hover:text-neutral-500"
                    }`}
                >
                    {REGISTER_TITLE}
                </pre>
            </div>

            {/* Form */}
            <div className="w-full max-w-sm border border-neutral-800 bg-neutral-900 p-8">
                <div className="space-y-4">

                    {/* name - siempre ocupa espacio, solo se oculta */}
                    <div style={{ visibility: mode === "register" ? "visible" : "hidden" }}>
                        <label className="text-xs text-neutral-500">{">"} name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none caret-green-400 focus:border-neutral-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-neutral-500">{">"} email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none caret-green-400 focus:border-neutral-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-neutral-500">{">"} password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            className="mt-1 w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none caret-green-400 focus:border-neutral-500"
                        />
                    </div>
                </div>

                {error && (
                    <p className="mt-4 text-xs text-red-400">{"> "}{error}</p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-6 w-full border border-neutral-700 py-2 text-sm text-neutral-300 transition hover:border-green-800 hover:bg-green-950 hover:text-green-400 disabled:opacity-50"
                >
                    {loading ? "..." : mode === "login" ? "[ enter ]" : "[ register ]"}
                </button>
            </div>
        </div>
    )
}