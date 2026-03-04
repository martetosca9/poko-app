"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import MessageBubble from "./MessageBubble"

type Message = {
    id: string
    role: "user" | "assistant"
    content: string
}

type ChatMessagesProps = {
    messages: Message[]
    botState: "waiting" | "thinking" | "talking" | "researching"
    onTalkingDone: () => void
}

const animatedIds = new Set<string>()

function TypewriterMessage({ message, onDone }: { message: Message, onDone?: () => void }) {
    const [displayed, setDisplayed] = useState(
        message.role === "user" || animatedIds.has(message.id) ? message.content : ""
    )
    const [stopped, setStopped] = useState(animatedIds.has(message.id))
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const stableOnDone = useCallback(() => onDone?.(), [onDone])

    useEffect(() => {
        if (message.role === "user") return
        if (animatedIds.has(message.id)) return

        setDisplayed("")
        setStopped(false)
        let i = 0

        intervalRef.current = setInterval(() => {
            i++
            setDisplayed(message.content.slice(0, i))
            if (i >= message.content.length) {
                clearInterval(intervalRef.current!)
                animatedIds.add(message.id)
                setStopped(true)
                stableOnDone()
            }
        }, 18)

        return () => clearInterval(intervalRef.current!)
    }, [message.id, message.content, message.role, stableOnDone])

    const isTyping = message.role === "assistant" && !stopped && displayed.length < message.content.length

    function handleStop() {
        clearInterval(intervalRef.current!)
        let current = displayed.length
        intervalRef.current = setInterval(() => {
            current--
            setDisplayed(message.content.slice(0, current))
            if (current <= 0) {
                clearInterval(intervalRef.current!)
                animatedIds.add(message.id)
                setStopped(true)
                stableOnDone()
            }
        }, 12)
    }

    return (
        <div className="relative group">
            {isTyping && (
                <button
                    onClick={handleStop}
                    className="absolute -top-2 -right-2 z-10 text-[10px] border border-neutral-700 bg-neutral-950 text-neutral-500 px-2 py-0.5 hover:border-red-800 hover:text-red-400 transition"
                >
                    stop
                </button>
            )}
            <MessageBubble message={{ ...message, content: displayed }} />
        </div>
    )
}

export default function ChatMessages({ messages, botState, onTalkingDone }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null)
    const stableDone = useCallback(() => onTalkingDone(), [onTalkingDone])
    const lastMessageId = messages[messages.length - 1]?.id

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    return (
        <section className="h-full overflow-y-auto px-4 py-6 space-y-4">
            {messages.map((msg) => (
                <TypewriterMessage
                    key={msg.id}
                    message={msg}
                    onDone={msg.id === lastMessageId && msg.role === "assistant" ? stableDone : undefined}
                />
            ))}
            <div ref={bottomRef} />
        </section>
    )
}