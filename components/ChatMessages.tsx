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
    animatedMessageId: string | null
    onTalkingDone: () => void
    soundEnabled?: boolean
}

const animatedIds = new Set<string>()

function TypewriterMessage({ message, shouldAnimate, onDone, soundEnabled = true }: { message: Message, shouldAnimate: boolean, onDone?: () => void, soundEnabled?: boolean }) {
    const [displayed, setDisplayed] = useState(
        shouldAnimate && !animatedIds.has(message.id) ? "" : message.content
    )
    const [stopped, setStopped] = useState(!shouldAnimate || animatedIds.has(message.id))
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const stableOnDone = useCallback(() => onDone?.(), [onDone])
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const soundEnabledRef = useRef(soundEnabled)

    useEffect(() => {
        soundEnabledRef.current = soundEnabled
    }, [soundEnabled])

    function playTypewriterSound(volume: number) {
        if (!soundEnabledRef.current) return
        if (!audioRef.current) {
            audioRef.current = new Audio("/sounds/537033__fivebrosstopmosyt__ui-menu-close-2.wav")
        }
        audioRef.current.volume = volume
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
    }

    useEffect(() => {
        if (!shouldAnimate) {
            setDisplayed(message.content)
            setStopped(true)
            return
        }

        if (animatedIds.has(message.id)) return

        setDisplayed("")
        setStopped(false)
        let i = 0

        intervalRef.current = setInterval(() => {
            i++
            setDisplayed(message.content.slice(0, i))

            if (i % 3 === 0) {
                const progress = i / message.content.length
                playTypewriterSound(Math.max(0.02, 0.3 * (1 - progress)))
            }
            
            if (i >= message.content.length) {
                clearInterval(intervalRef.current!)
                animatedIds.add(message.id)
                setStopped(true)
                playTypewriterSound(0.3)
                stableOnDone()
            }
        }, 18)

        return () => clearInterval(intervalRef.current!)
    }, [message.id, message.content, shouldAnimate, stableOnDone])

    const isTyping = shouldAnimate && !stopped && displayed.length < message.content.length

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

export default function ChatMessages({ messages, animatedMessageId, onTalkingDone, soundEnabled = true }: ChatMessagesProps) {
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
                    shouldAnimate={msg.id === animatedMessageId && msg.role === "assistant"}
                    onDone={msg.id === lastMessageId && msg.id === animatedMessageId ? stableDone : undefined}
                    soundEnabled={soundEnabled}
                />
            ))}
            <div ref={bottomRef} />
        </section>
    )
}
