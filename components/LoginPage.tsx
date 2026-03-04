"use client"

import { useState } from "react"

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

    return (
        <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
            <div className="w-full max-w-sm border border-neutral-800 bg-neutral-900 p-8">

                {/* Header */}
                <div className="mb-8 text-center">
                    <p className="text-xs text-neutral-500">poko v0.1</p>
                    <h1 className="mt-1 text-2xl text-neutral-100">
                        {mode === "login" ? "sign in" : "register"}
                    </h1>
                </div>

                {/* Campos */}
                <div className="space-y-4">
                    {mode === "register" && (
                        <div>
                            <label className="text-xs text-neutral-500">{">"} name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none caret-green-400 focus:border-neutral-500"
                            />
                        </div>
                    )}

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

                {/* Error */}
                {error && (
                    <p className="mt-4 text-xs text-red-400">{"> "}{error}</p>
                )}

                {/* Botón */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-6 w-full border border-neutral-700 py-2 text-sm text-neutral-300 transition hover:border-green-800 hover:bg-green-950 hover:text-green-400 disabled:opacity-50"
                >
                    {loading ? "..." : mode === "login" ? "[ enter ]" : "[ register ]"}
                </button>

                {/* Toggle */}
                <p className="mt-4 text-center text-xs text-neutral-600">
                    {mode === "login" ? "no account? " : "have account? "}
                    <button
                        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
                        className="text-neutral-400 hover:text-neutral-200"
                    >
                        {mode === "login" ? "register" : "sign in"}
                    </button>
                </p>
            </div>
        </div>
    )
}