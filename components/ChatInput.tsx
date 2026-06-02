"use client"

import { useState } from "react"

type ChatInputProps = {
    onSend: (message: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
    const [input, setInput] = useState("")

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && input.trim()) {
            onSend(input)
            setInput("")
        }
    }

    return (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-md transition focus-within:border-green-700 focus-within:shadow-[0_0_28px_rgba(34,197,94,0.10)]">
            <span className="select-none text-green-400">{">"}</span>
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="..."
                className="flex-1 bg-transparent text-sm text-neutral-200 outline-none placeholder:text-neutral-600 caret-green-400"
            />
        </div>
    )
}
