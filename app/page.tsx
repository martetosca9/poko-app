"use client"

import { nanoid } from "nanoid"
import { useState, useCallback, useEffect } from "react"
import AsciiBot from "@/components/AsciiBot"
import AsciiCat from "@/components/AsciiPoko"
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

type User = {
  id: string
  email: string
  name: string | null
  createdAt: string
}

function createInitialMessages(): Message[] {
  return [
    {
      id: nanoid(),
      role: "assistant",
      content: "Ask any question..."
    }
  ]
}

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<"chat" | "docs" | "graph" | "profile">("docs")
  const [botState, setBotState] = useState<"waiting" | "thinking" | "talking" | "researching">("waiting")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationsRefreshKey, setConversationsRefreshKey] = useState(0)
  const handleTalkingDone = useCallback(() => setBotState("waiting"), [])

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user)
          setAuthed(true)
        } else {
          setAuthed(false)
        }
      })
      .catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (authed !== true) return
    const params = new URLSearchParams(window.location.search)
    const section = params.get("section")
    if (section === "docs" || section === "chat" || section === "graph" || section === "profile") {
      setActiveSection(section)
    }
  }, [authed])

  const [messages, setMessages] = useState<Message[]>(createInitialMessages)

  async function handleSend(text: string) {
    const wasNewConversation = conversationId === null
    const userMessage: Message = { id: nanoid(), role: "user", content: text }
    setMessages(prev => [...prev, userMessage])
    setBotState("thinking")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, activeSection })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Chat request failed")
      if (data.conversationId) setConversationId(data.conversationId)
      if (wasNewConversation && data.conversationId) {
        setConversationsRefreshKey(key => key + 1)
      }
      const assistantMessage: Message = { id: nanoid(), role: "assistant", content: data.reply }
      setMessages(prev => [...prev, assistantMessage])
      setBotState("talking")
    } catch {
      setMessages(prev => [...prev, { id: nanoid(), role: "assistant", content: "Error talking to the AI." }])
      setBotState("waiting")
    }
  }

  function handleNewConversation() {
    setConversationId(null)
    setMessages(createInitialMessages())
    setBotState("waiting")
    setActiveSection("chat")
  }

  async function handleSelectConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Conversation request failed")

      setConversationId(data.conversation.id)
      setMessages(
        data.conversation.messages
          .filter((msg: { role: string }) => msg.role === "user" || msg.role === "assistant")
          .map((msg: { id: string; role: "user" | "assistant"; content: string }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          }))
      )
      setBotState("waiting")
      setActiveSection("chat")
    } catch {
      setMessages(prev => [...prev, { id: nanoid(), role: "assistant", content: "Error loading conversation." }])
    }
  }

  function handleLogout() {
    fetch("/api/auth/logout", { method: "POST" })
    setAuthed(false)
    setUser(null)
    setActiveSection("chat")
  }

  if (authed === null) return (
    <div className="flex h-screen items-center justify-center bg-neutral-950 text-xs text-neutral-600">
      loading...
    </div>
  )

  if (!authed) {
    return <LoginPage onSuccess={() => {
      fetch("/api/auth/me")
        .then(r => r.json())
        .then(data => {
          if (data?.user) setUser(data.user)
        })
      setAuthed(true)
      const params = new URLSearchParams(window.location.search)
      const section = params.get("section")
      if (section === "docs" || section === "chat" || section === "graph" || section === "profile") {
        setActiveSection(section)
      }
    }} />
  }

  return (
    <div className="relative flex h-screen w-full bg-neutral-950 text-neutral-100">
      <AsciiBackground />

      <div className="relative z-10 flex h-full w-full flex-col">
        <AppHeader
          active={activeSection}
          onChange={setActiveSection}
          user={user}
        />

        <div className="flex w-full flex-1 overflow-hidden pt-10">
          {sidebarOpen && (
            <Sidebar
              activeSection={activeSection}
              activeConversationId={conversationId}
              conversationsRefreshKey={conversationsRefreshKey}
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversation}
            />
          )}

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
                <ProfileSection onLogout={handleLogout} onNavigate={setActiveSection} user={user} />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
