"use client"

import { useEffect, useRef, useState } from "react"
import MessageBubble from "./MessageBubble"
import AsciiBot from "@/components/AsciiBot"

type Message = {
    id: string
    role: "user" | "assistant"
    content: string
}

type ChatMessagesProps = {
    messages: Message[]
}

function TypewriterMessage({ message }: { message: Message }) {
    const [displayed, setDisplayed] = useState(
        message.role === "user" ? message.content : ""
    )

    useEffect(() => {
        if (message.role === "user") return

        setDisplayed("")
        let i = 0
        const interval = setInterval(() => {
            i++
            setDisplayed(message.content.slice(0, i))
            if (i >= message.content.length) clearInterval(interval)
        }, 18)

        return () => clearInterval(interval)
    }, [message.id])

    return <MessageBubble message={{ ...message, content: displayed }} />
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    return (
        <section className="h-full overflow-y-auto px-4 py-6 space-y-4">
            <div className="text-[10px] leading-none text-neutral-300 pb-4">
                <AsciiBot state="waiting" />
            </div>

            {messages.map((msg) => (
                <TypewriterMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
        </section>
    )
}