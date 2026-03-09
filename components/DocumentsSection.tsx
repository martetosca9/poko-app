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
        <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm text-neutral-300">Your documents</h2>
                    <span className="text-xs text-neutral-600">{documents.length} docs</span>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="> search..."
                        className="bg-neutral-950 border border-neutral-700 px-3 py-1 text-xs text-neutral-300 outline-none caret-green-400 focus:border-neutral-500 placeholder:text-neutral-600"
                    />
                    <button
                        onClick={handleCreate}
                        className="border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:border-green-800 hover:bg-green-950 hover:text-green-400 transition"
                    >
                        + new
                    </button>
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