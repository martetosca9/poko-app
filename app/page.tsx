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
import { Volume2, VolumeX } from "lucide-react"

const CHAT_SOUND_STORAGE_KEY = "poko-chat-sound-enabled"

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
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0)
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null)
  const [chatSoundEnabled, setChatSoundEnabled] = useState(true)
  const handleTalkingDone = useCallback(() => {
    setBotState("waiting")
    setAnimatedMessageId(null)
  }, [])

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

  useEffect(() => {
    const stored = localStorage.getItem(CHAT_SOUND_STORAGE_KEY)
    if (stored !== null) setChatSoundEnabled(stored === "true")
  }, [])

  function toggleChatSound() {
    setChatSoundEnabled(prev => {
      const next = !prev
      localStorage.setItem(CHAT_SOUND_STORAGE_KEY, String(next))
      return next
    })
  }

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
      setAnimatedMessageId(assistantMessage.id)
      setMessages(prev => [...prev, assistantMessage])
      if (data.documentUpdated || data.createdDocument) {
        setDocumentsRefreshKey(prev => prev + 1)
      }
      setBotState("talking")
    } catch {
      setAnimatedMessageId(null)
      setMessages(prev => [...prev, { id: nanoid(), role: "assistant", content: "Error talking to the AI." }])
      setBotState("waiting")
    }
  }

  function handleNewConversation() {
    setConversationId(null)
    setMessages(createInitialMessages())
    setAnimatedMessageId(null)
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
      setAnimatedMessageId(null)
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

        <div className="flex w-full flex-1 overflow-hidden pt-14">
          {sidebarOpen && (
            <Sidebar
              activeSection={activeSection}
              activeConversationId={conversationId}
              conversationsRefreshKey={conversationsRefreshKey}
              documentsRefreshKey={documentsRefreshKey}
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversation}
            />
          )}

          <main className="m-3 mt-5 flex flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/35 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <header className="mx-3 mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-black/45 px-4 py-2 backdrop-blur-xl">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-md px-2 py-1 text-neutral-400 transition hover:bg-white/10 hover:text-neutral-100"
              >
                ☰
              </button>
              <h1 className="text-sm font-medium tracking-wide text-neutral-200">
                {activeSection === "chat" && "Chat"}
                {activeSection === "docs" && "Documents"}
                {activeSection === "graph" && "Graph"}
                {activeSection === "profile" && "Profile"}
              </h1>
              {activeSection === "chat" && (
                <button
                  type="button"
                  onClick={toggleChatSound}
                  title={chatSoundEnabled ? "Desactivar sonido del bot" : "Activar sonido del bot"}
                  aria-label={chatSoundEnabled ? "Desactivar sonido del bot" : "Activar sonido del bot"}
                  aria-pressed={chatSoundEnabled}
                  className={`ml-auto rounded-md border px-2 py-1 text-xs transition ${
                    chatSoundEnabled
                      ? "border-white/15 bg-black/50 text-neutral-300 hover:border-green-700 hover:text-green-300"
                      : "border-white/10 bg-black/35 text-neutral-500 hover:border-white/20 hover:text-neutral-300"
                  }`}
                >
                  {chatSoundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              )}
            </header>

            {activeSection === "chat" && (
              <>
                <div className="flex-1 overflow-hidden px-4">
                  <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0 overflow-hidden flex flex-col">
                      <ChatMessages
                        messages={messages}
                        botState={botState}
                        animatedMessageId={animatedMessageId}
                        onTalkingDone={handleTalkingDone}
                        soundEnabled={chatSoundEnabled}
                      />
                    </div>

                    <div className="relative hidden min-w-0 px-4 pt-8 xl:block">
                      <div className="bot-panel-border mx-auto w-fit">
                        <div className="rounded-lg bg-black/75 backdrop-blur-xl">
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

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <AsciiCat />
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="border-t border-white/10 px-4 py-3">
                  <div className="mx-auto w-full max-w-6xl">
                    <div className="w-full xl:max-w-[calc(100%-320px)]">
                      <ChatInput onSend={handleSend} />
                    </div>
                  </div>
                </footer>
              </>
            )}

            {activeSection === "docs" && (
              <DocumentsSection key={documentsRefreshKey} onCreate={() => {}} />
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
