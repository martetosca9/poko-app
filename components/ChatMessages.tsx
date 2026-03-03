"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import MessageBubble from "./MessageBubble"
import AsciiBot from "@/components/AsciiBot"

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

function TypewriterMessage({ message, onDone }: { message: Message, onDone?: () => void }) {
    const [displayed, setDisplayed] = useState(
        message.role === "user" ? message.content : ""
    )
    const [stopped, setStopped] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const stableOnDone = useCallback(() => onDone?.(), [onDone])

    useEffect(() => {
        if (message.role === "user") return

        setDisplayed("")
        setStopped(false)
        let i = 0

        intervalRef.current = setInterval(() => {
            i++
            setDisplayed(message.content.slice(0, i))
            if (i >= message.content.length) {
                clearInterval(intervalRef.current!)
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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const lastIndex = messages.length - 1

    return (
        <section className="h-full overflow-y-auto px-4 py-6 space-y-4">
            <div className="text-[10px] leading-none text-neutral-300 pb-4">
                <AsciiBot state={botState} />
            </div>

            {messages.map((msg, i) => (
                <TypewriterMessage
                    key={msg.id}
                    message={msg}
                    onDone={i === lastIndex && msg.role === "assistant" ? stableDone : undefined}
                />
            ))}
            <div ref={bottomRef} />
        </section>
    )
}