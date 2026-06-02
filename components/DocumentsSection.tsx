"use client";

import { useEffect, useState } from "react";
import DocumentsGrid from "./DocumentsGrid";

type Doc = {
    id: string;
    title: string;
    updatedAt: string;
};

type Props = {
    onCreate: (doc: Doc) => void;
};

export default function DocumentsSection({ onCreate }: Props) {
    const [documents, setDocuments] = useState<Doc[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)

    useEffect(() => {
        fetch("/api/documents")
            .then(r => r.json())
            .then(data => setDocuments(data.documents ?? []))
            .finally(() => setLoading(false))
    }, [])

    async function handleCreate() {
        const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Untitled" })
        })
        const data = await res.json()
        setDocuments(prev => [data.document, ...prev])
        onCreate(data.document)
    }

    async function handleDelete(id: string) {
        await fetch(`/api/documents/${id}`, { method: "DELETE" })
        setDocuments(prev => prev.filter(d => d.id !== id))
    }

    const filtered = documents.filter(d =>
        d.title.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/50 px-5 py-3 shadow-xl shadow-black/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm text-neutral-200">Your documents</h2>
                    <span className="text-xs text-neutral-500">{documents.length} docs</span>
                </div>
                <div className="flex items-center gap-3">
                    <div
                        style={{
                            filter: searchFocused
                                ? "drop-shadow(0 0 6px #22c55e)"
                                : "drop-shadow(0 0 2px #14532d)",
                            transition: "filter 0.3s ease"
                        }}
                    >
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            placeholder="> search..."
                            className="rounded-md border border-green-900/60 bg-black/65 px-3 py-1.5 text-xs text-green-300 outline-none caret-green-400 placeholder:text-neutral-600 transition-colors focus:border-green-600"
                        />
                    </div>

                    <div style={{ filter: "drop-shadow(0 0 4px #16a34a)" }}>
                        <button
                            onClick={handleCreate}
                            className="rounded-md border border-green-800 bg-green-950/30 px-3 py-1.5 text-xs text-green-300 transition hover:border-green-500 hover:bg-green-950/60"
                            style={{ textShadow: "0 0 8px #22c55e" }}
                        >
                            + new
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-1 items-center justify-center text-xs text-neutral-600">
                    loading...
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-xs text-neutral-600">
                    {search ? "no results" : "no documents yet"}
                </div>
            ) : (
                <DocumentsGrid documents={filtered} onDelete={handleDelete} />
            )}
        </div>
    );
}
