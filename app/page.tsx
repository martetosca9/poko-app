"use client"

import { useState } from "react"
import { nanoid } from "nanoid"

import AsciiBot from "@/components/AsciiBot"
import AsciiLogo from "@/components/AsciiLogo"
import ChatMessages from "@/components/ChatMessages"
import ChatInput from "@/components/ChatInput"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: nanoid(),
      role: "assistant",
      content: "Ask any question..."
    }
  ])

  async function handleSend(text: string) {
    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: text
    }

    setMessages(prev => [...prev, userMessage])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      })

      const data = await res.json()

      const assistantMessage: Message = {
        id: nanoid(),
        role: "assistant",
        content: data.reply
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "Error talking to the AI."
        }
      ])
    }
  }

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-300">
            Conversations
          </h2>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="cursor-pointer hover:text-neutral-200">Chat 1</li>
            <li className="cursor-pointer hover:text-neutral-200">Chat 2</li>
            <li className="cursor-pointer hover:text-neutral-200">Chat 3</li>
          </ul>
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col bg-neutral-900">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ☰
          </button>
          <h1 className="text-sm font-medium tracking-wide text-neutral-200">
            <AsciiLogo />
          </h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <div className="px-4 pt-4">
            <div className="max-w-[80%] text-[10px] leading-none text-neutral-300">
              <AsciiBot state="waiting" />
            </div>
          </div>

          <ChatMessages messages={messages} />
        </div>

        {/* Input */}
        <footer className="border-t border-neutral-800 px-4 py-3">
          <ChatInput onSend={handleSend} />
        </footer>
      </main>
    </div>
  )
}
