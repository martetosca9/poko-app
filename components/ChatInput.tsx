"use client"

import { SendHorizontal } from "lucide-react"
import { useState } from "react"

type ChatInputProps = {
    onSend: (message: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
    const [input, setInput] = useState("")

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!input.trim()) return

        onSend(input)
        setInput("")
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInput(e.target.value)
                }
                placeholder="Type your message..."
                className="flex-1 bg-neutral-800 px-4 py-3 text-sm outline-none"
            />
            <button
                type="submit"
                className="bg-neutral-700 px-4 py-3"
            >
                <SendHorizontal />
            </button>
        </form>
    )
}