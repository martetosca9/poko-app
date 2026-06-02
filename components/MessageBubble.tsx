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
            <span className="select-none text-[10px] text-neutral-500">
                {isUser ? "user@poko:~$" : "poko@system:~>"}
            </span>
            <div
                className={`max-w-full whitespace-pre-wrap break-words rounded-lg border px-4 py-3 text-sm font-mono leading-relaxed shadow-xl shadow-black/20 backdrop-blur-md ${
                    isUser
                        ? "border-white/15 bg-black/45 text-neutral-200"
                        : "border-green-900/50 bg-black/65 text-green-300 shadow-[0_0_28px_rgba(34,197,94,0.06)]"
                }`}
            >
                {message.content}
            </div>
        </div>
    )
}
