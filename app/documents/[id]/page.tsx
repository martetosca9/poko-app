"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import AppHeader from "@/components/AppHeader"
import AsciiBackground from "@/components/AsciiBackground"
import Sidebar from "@/components/Sidebar"
import CodeMirror from "@uiw/react-codemirror"
import { EditorView, Decoration, ViewPlugin, ViewUpdate, DecorationSet } from "@codemirror/view"
import { RangeSetBuilder } from "@codemirror/state"

type User = {
    id: string
    email: string
    name: string | null
    createdAt: string
}

const tagHighlighter = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet
        constructor(view: EditorView) { this.decorations = this.build(view) }
        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged)
                this.decorations = this.build(update.view)
        }
        build(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>()
            const tagMark = Decoration.mark({ class: "cm-tag" })
            for (const { from, to } of view.visibleRanges) {
                const text = view.state.doc.sliceString(from, to)
                let match: RegExpExecArray | null
                const re = /#[\w]+/g
                while ((match = re.exec(text)) !== null) {
                    builder.add(from + match.index, from + match.index + match[0].length, tagMark)
                }
            }
            return builder.finish()
        }
    },
    { decorations: v => v.decorations }
)

const darkTheme = EditorView.theme({
    "&": {
        background: "transparent !important",
        color: "#d4d4d8",
        fontSize: "14px",
        fontFamily: "ui-monospace, monospace",
        height: "100%",
    },
    ".cm-editor": { background: "transparent !important" },
    ".cm-scroller": {
        background: "transparent !important",
        overflow: "auto",
    },
    ".cm-content": {
        padding: "24px 48px",
        lineHeight: "1.75",
        caretColor: "#4ade80",
        background: "transparent !important",
    },
    ".cm-line": { padding: "0", background: "transparent !important" },
    ".cm-cursor": { borderLeftColor: "#4ade80" },
    ".cm-focused": { outline: "none" },
    ".cm-tag": {
        color: "#4ade80",
        textShadow: "0 0 8px #22c55e, 0 0 16px #16a34a",
        fontWeight: "600",
    },
    ".cm-selectionBackground": { background: "#14532d55 !important" },
    "&.cm-focused .cm-selectionBackground": { background: "#14532d88 !important" },
    ".cm-gutters": { display: "none" },
    ".cm-activeLine": { background: "transparent !important" },
    ".cm-placeholder": { color: "#404040" },
}, { dark: true })

export default function DocumentPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [user, setUser] = useState<User | null>(null)
    const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0)
    const [loaded, setLoaded] = useState(false)
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
                setLoaded(true)
            })
    }, [id, router])

    useEffect(() => {
        fetch("/api/auth/me")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.user) setUser(data.user)
                else router.push("/")
            })
            .catch(() => router.push("/"))
    }, [router])

    async function handleNewDoc() {
        const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Untitled" })
        })
        const data = await res.json()
        if (data.document?.id) {
            setDocumentsRefreshKey(key => key + 1)
            router.push(`/documents/${data.document.id}`)
        }
    }

    function handleSectionChange(section: "chat" | "docs" | "graph" | "profile") {
        router.push(`/?section=${section}`)
    }

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

    const handleContentChange = useCallback((value: string) => {
        setContent(value)
        scheduleSave(title, value)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, id])

    return (
        <div className="relative flex h-screen w-full bg-neutral-950 text-neutral-100">
            <AsciiBackground />

            <div className="relative z-10 flex h-full w-full flex-col">
                <AppHeader active="docs" onChange={handleSectionChange} user={user} />

                <div className="flex w-full flex-1 overflow-hidden pt-10">
                    {sidebarOpen && (
                        <Sidebar
                            activeSection="docs"
                            activeDocumentId={id}
                            documentsRefreshKey={documentsRefreshKey}
                            onNewDocument={handleNewDoc}
                        />
                    )}

                    <main className="flex flex-1 flex-col overflow-hidden bg-neutral-900/40">
                        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-800 px-4 py-2">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-neutral-400 hover:text-neutral-200"
                            >
                                ☰
                            </button>
                            <h1 className="truncate text-sm font-medium tracking-wide text-neutral-200">
                                {title.trim() || "Document"}
                            </h1>
                            <span
                                className={`ml-auto text-xs ${
                                    saving
                                        ? "text-green-400"
                                        : saved
                                          ? "text-neutral-500"
                                          : "text-amber-600"
                                }`}
                            >
                                {saving ? "Saving..." : saved ? "Saved" : "Unsaved"}
                            </span>
                        </header>

                        <div className="flex flex-1 flex-col overflow-hidden">
                            <div className="shrink-0 px-12 pt-10">
                                <input
                                    value={title}
                                    onChange={handleTitleChange}
                                    placeholder="Untitled"
                                    className="w-full bg-transparent text-2xl text-neutral-100 outline-none placeholder:text-neutral-700 caret-green-400"
                                />
                                <div className="mt-2 h-px bg-neutral-800" />
                            </div>

                            <div className="flex-1 overflow-hidden">
                                {loaded && (
                                    <CodeMirror
                                        value={content}
                                        onChange={handleContentChange}
                                        extensions={[tagHighlighter, darkTheme, EditorView.lineWrapping]}
                                        placeholder="> start writing..."
                                        basicSetup={{
                                            lineNumbers: false,
                                            foldGutter: false,
                                            dropCursor: false,
                                            allowMultipleSelections: false,
                                            indentOnInput: false,
                                            highlightActiveLine: false,
                                            highlightSelectionMatches: false,
                                            bracketMatching: false,
                                            closeBrackets: false,
                                            autocompletion: false,
                                            rectangularSelection: false,
                                            crosshairCursor: false,
                                            highlightActiveLineGutter: false,
                                        }}
                                        height="100%"
                                        style={{ height: "100%" }}
                                    />
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}