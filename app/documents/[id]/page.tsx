"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

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
            .then(r => r.json())
            .then(data => {
                setTitle(data.document.title)
                setContent(data.document.content)
            })
    }, [id])

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
            {/* Header */}
            <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
                <Link href="/" className="text-xs text-neutral-600 hover:text-neutral-400 transition">
                    ← back
                </Link>
                <span className="text-[10px] text-neutral-600">
                    {saving ? "saving..." : saved ? "saved" : "unsaved"}
                </span>
            </header>

            {/* Title */}
            <div className="px-12 pt-10">
                <input
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Untitled"
                    className="w-full bg-transparent text-2xl text-neutral-100 outline-none placeholder:text-neutral-700 caret-green-400"
                />
                <div className="mt-2 h-px bg-neutral-800" />
            </div>

            {/* Content */}
            <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="> start writing..."
                className="flex-1 resize-none bg-transparent px-12 py-6 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 caret-green-400 leading-relaxed"
            />
        </div>
    )
}