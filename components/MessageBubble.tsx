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
        <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
            <span className="text-[10px] text-neutral-600 select-none">
                {isUser ? "user@poko:~$" : "poko@system:~>"}
            </span>
            <div
                className={`px-4 py-2 text-sm font-mono border ${
                    isUser
                        ? "border-neutral-600 bg-neutral-900 text-neutral-300"
                        : "border-neutral-700 bg-neutral-950 text-green-400"
                }`}
            >
                {message.content}
            </div>
        </div>
    )
}