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
        <div className="flex items-center gap-2 border border-neutral-700 bg-neutral-950 px-4 py-3 focus-within:border-neutral-500">
            <span className="text-neutral-500 select-none">{">"}</span>
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