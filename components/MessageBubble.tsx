"use client"

type Message = {
    id: string
    role: "user" | "assistant"
    content: string
}

type MessageBubbleProps = {
    message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === "user"

    return (
        <div
            className={`max-w-[80%] px-4 py-3 text-sm ${isUser
                    ? "ml-auto bg-neutral-700"
                    : "bg-neutral-800"
                }`}
        >
            {message.content}
        </div>
    )
}