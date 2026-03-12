"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { BACK_ASCII } from "@/lib/ascii-titles"

export default function DocumentPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(true)
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        fetch(`/api/documents/${id}`)
            .then(r => {
                if (r.status === 401) {
                    router.push("/")
                    return null
                }
                return r.json()
            })
            .then(data => {
                if (!data) return
                setTitle(data.document.title)
                setContent(data.document.content)
            })
    }, [id, router])

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
            <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
                <button
                    onClick={() => router.push("/?section=docs")}
                    className="group"
                >
                    <pre
                        className="text-[3px] leading-tight text-green-800 transition-colors duration-300 group-hover:text-green-400"
                        style={{ textShadow: "0 0 4px #14532d" }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.textShadow = "0 0 8px #22c55e, 0 0 16px #16a34a"
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.textShadow = "0 0 4px #14532d"
                        }}
                    >
                        {BACK_ASCII}
                    </pre>
                </button>

                <span
                    className="text-[10px] transition-colors duration-300"
                    style={{
                        color: saving ? "#22c55e" : saved ? "#15803d" : "#854d0e",
                        textShadow: saving
                            ? "0 0 8px #22c55e, 0 0 16px #16a34a"
                            : saved
                                ? "0 0 4px #15803d"
                                : "0 0 4px #854d0e"
                    }}
                >
                    {saving ? "saving..." : saved ? "saved" : "unsaved"}
                </span>
            </header>

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
    )
}