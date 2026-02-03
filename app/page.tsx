"use client"

import { useState } from "react"
import { nanoid } from "nanoid"

import AsciiBot from "@/components/AsciiBot"
import AsciiLogo from "@/components/AsciiLogo"
import ChatMessages from "@/components/ChatMessages"
import ChatInput from "@/components/ChatInput"
import AppHeader from "@/components/AppHeader"
import Sidebar from "@/components/Sidebar"
import DocumentsSection from "@/components/DocumentsSection";


type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type Doc = {
  id: string;
  title: string;
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<"chat" | "docs" | "graph">("chat")
  const [documents, setDocuments] = useState<Doc[]>([]);

  function createDocument() {
    const untitledCount =
      documents.filter(doc => doc.title.startsWith("Untitled")).length + 1;

    const newDoc = {
      id: nanoid(),
      title: untitledCount === 1 ? "Untitled" : `Untitled ${untitledCount}`,
    };

    setDocuments((prev) => [...prev, newDoc]);
  }


  function openDocument(id: string) {
    console.log("Open document:", id);
  }


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
      {/* ===== HEADER GLOBAL (FIJO, NO SE MUEVE) ===== */}
      <AppHeader
        active={activeSection}
        onChange={setActiveSection}
      />

      {/* ===== CONTENIDO DEBAJO DEL HEADER ===== */}
      <div className="flex w-full pt-10">
        {/* Sidebar */}
        {sidebarOpen && <Sidebar activeSection={activeSection} />}

        {/* Main Area */}
        <main className="flex flex-1 flex-col bg-neutral-900">
          {/* Sub-header interno del área (muy fino) */}
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
            </h1>
          </header>

          {/* ===== CONTENIDO POR SECCIÓN ===== */}

          {activeSection === "chat" && (
            <>
              <div className="flex-1 overflow-hidden">
                <div className="px-4 pt-4">
                  <div className="max-w-[80%] text-[10px] leading-none text-neutral-300">
                    <AsciiBot state="waiting" />
                  </div>
                </div>

                <ChatMessages messages={messages} />
              </div>

              <footer className="border-t border-neutral-800 px-4 py-3">
                <ChatInput onSend={handleSend} />
              </footer>
            </>
          )}

          {activeSection === "docs" && (
            <DocumentsSection
              documents={documents}
              onCreate={createDocument}
              onOpen={openDocument}
            />
          )}


          {activeSection === "graph" && (
            <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
              Graph view (coming soon)
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
