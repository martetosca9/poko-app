"use client"

import { nanoid } from "nanoid"
import { useState, useCallback } from "react"
import AsciiBot from "@/components/AsciiBot"
import AsciiCat from "@/components/AsciiPoko"
import AsciiLogo from "@/components/AsciiLogo"
import AsciiBackground from "@/components/AsciiBackground"
import ChatMessages from "@/components/ChatMessages"
import ChatInput from "@/components/ChatInput"
import AppHeader from "@/components/AppHeader"
import Sidebar from "@/components/Sidebar"
import DocumentsSection from "@/components/DocumentsSection"
import ProfileSection from "@/components/ProfileSection"
import LoginPage from "@/components/LoginPage"
import GraphView from "@/components/Graphview"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function Home() {
  const [authed, setAuthed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<"chat" | "docs" | "graph" | "profile">("chat")
  const [botState, setBotState] = useState<"waiting" | "thinking" | "talking" | "researching">("waiting")
  const handleTalkingDone = useCallback(() => setBotState("waiting"), [])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: nanoid(),
      role: "assistant",
      content: "Ask any question..."
    }
  ])

  async function handleSend(text: string) {
    const userMessage: Message = { id: nanoid(), role: "user", content: text }
    setMessages(prev => [...prev, userMessage])
    setBotState("thinking")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      const assistantMessage: Message = { id: nanoid(), role: "assistant", content: data.reply }
      setMessages(prev => [...prev, assistantMessage])
      setBotState("talking")
    } catch (err) {
      setMessages(prev => [...prev, { id: nanoid(), role: "assistant", content: "Error talking to the AI." }])
      setBotState("waiting")
    }
  }

  function handleLogout() {
    setAuthed(false)
    setActiveSection("chat")
  }

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />
  }

  return (
    <div className="relative flex h-screen w-full bg-neutral-950 text-neutral-100">
      <AsciiBackground />

      <div className="relative z-10 flex h-full w-full flex-col">
        <AppHeader
          active={activeSection}
          onChange={setActiveSection}
        />

        <div className="flex w-full flex-1 overflow-hidden pt-10">
          {sidebarOpen && <Sidebar activeSection={activeSection} />}

          <main className="flex flex-1 flex-col bg-neutral-900/40">
            <header className="flex items-center gap-3 border-b border-neutral-800 px-4 py-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                ☰
              </button>
              <h1 className="text-sm font-medium tracking-wide text-neutral-200">
                {activeSection === "chat" && "Chat"}
                {activeSection === "docs" && "Documents"}
                {activeSection === "graph" && "Graph"}
                {activeSection === "profile" && "Profile"}
              </h1>
            </header>

            {activeSection === "chat" && (
              <>
                <div className="flex-1 overflow-hidden flex flex-row">
                  <div className="flex-1 overflow-hidden flex flex-col max-w-3xl">
                    <ChatMessages messages={messages} botState={botState} onTalkingDone={handleTalkingDone} />
                  </div>

                  <div className="hidden lg:block relative pt-8 px-6">
                    <div className="bot-panel-border">
                      <div className="bg-neutral-950">
                        <div
                          className="p-4"
                          style={{
                            filter: botState === "waiting"
                              ? "drop-shadow(0 0 2px #14532d)"
                              : botState === "thinking"
                                ? "drop-shadow(0 0 10px #22c55e) drop-shadow(0 0 20px #16a34a)"
                                : "drop-shadow(0 0 15px #22c55e) drop-shadow(0 0 30px #16a34a) drop-shadow(0 0 45px #15803d)",
                            transition: "filter 0.4s ease"
                          }}
                        >
                          <div className="text-[10px] leading-none text-green-400">
                            <AsciiBot state={botState} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-6">
                      <AsciiCat />
                    </div>
                  </div>
                </div>

                <footer className="border-t border-neutral-800 px-4 py-3">
                  <div className="max-w-3xl">
                    <ChatInput onSend={handleSend} />
                  </div>
                </footer>
              </>
            )}

            {activeSection === "docs" && (
              <DocumentsSection onCreate={() => {}} />
            )}

            {activeSection === "graph" && (
              <GraphView />
            )}

            {activeSection === "profile" && (
              <div className="flex flex-1 items-center justify-center">
                <ProfileSection onLogout={handleLogout} onNavigate={setActiveSection} />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}