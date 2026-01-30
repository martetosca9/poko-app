"use client"

import MessageBubble from "./MessageBubble"

type Message = {
    id: string
    role: "user" | "assistant"
    content: string
}

type ChatMessagesProps = {
    messages: Message[]
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
    return (
        <section className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.map((msg: Message) => (
                <MessageBubble key={msg.id} message={msg} />
            ))}
        </section>
    )
}