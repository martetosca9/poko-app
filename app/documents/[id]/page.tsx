"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { BACK_ASCII, SIDEBAR_OPEN, SIDEBAR_CLOSED } from "@/lib/ascii-titles"

type Doc = { id: string; title: string }
type Chat = { id: string; title: string | null }

export default function DocumentPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [docs, setDocs] = useState<Doc[]>([])
    const [chats, setChats] = useState<Chat[]>([])
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        fetch(`/api/documents/${id}`)
            .then(r => {
                if (r.status === 401) { router.push("/"); return null }
                return r.json()
            })
            .then(data => {
                if (!data) return
                setTitle(data.document.title)
                setContent(data.document.content)
            })
    }, [id, router])

    useEffect(() => {
        fetch("/api/documents")
            .then(r => r.json())
            .then(data => setDocs(data.documents ?? []))
            .catch(() => { })

        fetch("/api/conversations")
            .then(r => r.json())
            .then(data => setChats(data.conversations ?? []))
            .catch(() => { })
    }, [])

    function scheduleSave(newTitle: string, newContent: string) {
        setSaved(false)
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(async () => {
            setSaving(true)
            await fetch(`/api/documents/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle, content: newContent })
            })
            setSaving(false)
            setSaved(true)
        }, 800)
    }

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setTitle(e.target.value)
        scheduleSave(e.target.value, content)
    }

    function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setContent(e.target.value)
        scheduleSave(title, e.target.value)
    }

    return (
        <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
            <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="group">
                        <pre
                            className="text-[5px] leading-tight text-green-800 transition-colors duration-300 group-hover:text-green-400"
                            style={{ textShadow: "0 0 4px #14532d" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textShadow = "0 0 8px #22c55e, 0 0 16px #16a34a" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textShadow = "0 0 4px #14532d" }}
                        >
                            {sidebarOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED}
                        </pre>
                    </button>
                    <button onClick={() => router.push("/?section=docs")} className="group">
                        <pre
                            className="text-[3px] leading-tight text-green-800 transition-colors duration-300 group-hover:text-green-400"
                            style={{ textShadow: "0 0 4px #14532d" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textShadow = "0 0 8px #22c55e, 0 0 16px #16a34a" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textShadow = "0 0 4px #14532d" }}
                        >
                            {BACK_ASCII}
                        </pre>
                    </button>
                </div>

                <span
                    className="text-[10px] transition-colors duration-300"
                    style={{
                        color: saving ? "#22c55e" : saved ? "#15803d" : "#854d0e",
                        textShadow: saving ? "0 0 8px #22c55e, 0 0 16px #16a34a" : saved ? "0 0 4px #15803d" : "0 0 4px #854d0e"
                    }}
                >
                    {saving ? "saving..." : saved ? "saved" : "unsaved"}
                </span>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {sidebarOpen && (
                    <aside className="w-56 shrink-0 border-r border-neutral-800 flex flex-col overflow-hidden">
                        <div className="flex flex-col overflow-hidden flex-1">
                            <div className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-600 border-b border-neutral-800">
                                Documents
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {docs.length === 0 && (
                                    <p className="px-4 py-3 text-xs text-neutral-700">No documents</p>
                                )}
                                {docs.map(doc => (
                                    <button
                                        key={doc.id}
                                        onClick={() => router.push(`/documents/${doc.id}`)}
                                        className={`w-full text-left px-4 py-2 text-xs transition truncate ${
                                            doc.id === id
                                                ? "text-green-400 bg-neutral-900"
                                                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                                        }`}
                                    >
                                        {doc.id === id ? "> " : "  "}{doc.title || "Untitled"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col overflow-hidden flex-1 border-t border-neutral-800">
                            <div className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-600 border-b border-neutral-800">
                                Chats
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {chats.length === 0 && (
                                    <p className="px-4 py-3 text-xs text-neutral-700">No chats</p>
                                )}
                                {chats.map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => router.push("/?section=chat")}
                                        className="w-full text-left px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition truncate"
                                    >
                                        {chat.title || "Untitled chat"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                )}

                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="px-12 pt-10">
                        <input
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Untitled"
                            className="w-full bg-transparent text-2xl text-neutral-100 outline-none placeholder:text-neutral-700 caret-green-400"
                        />
                        <div className="mt-2 h-px bg-neutral-800" />
                    </div>

                    <textarea
                        value={content}
                        onChange={handleContentChange}
                        placeholder="> start writing..."
                        className="flex-1 resize-none bg-transparent px-12 py-6 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 caret-green-400 leading-relaxed"
                    />
                </div>
            </div>
        </div>
    )
}