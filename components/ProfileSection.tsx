"use client";

import { Mail, Calendar, LogOut, FileText, GitGraph, MessageSquare } from "lucide-react";
import AsciiEye from "@/components/AsciiEye";
import { useEffect, useState } from "react";

type User = {
    id: string
    email: string
    name: string | null
    createdAt: string
}

type Chat = { id: string; title: string | null }
type Doc = { id: string; title: string }

type Props = {
    onLogout: () => void
    onNavigate?: (section: "chat" | "docs" | "graph") => void
    user: User | null
}

function Avatar({ name, email }: { name: string | null; email: string }) {
    const initials = name
        ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : email.slice(0, 2).toUpperCase()
    return (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-700 text-xl font-semibold text-neutral-100 ring-2 ring-neutral-600">
            {initials}
        </div>
    );
}

export default function ProfileSection({ onLogout, onNavigate, user }: Props) {
    const [chats, setChats] = useState<Chat[]>([])
    const [docs, setDocs] = useState<Doc[]>([])

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

    const joined = user
        ? new Date(user.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })
        : ""

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" })
        onLogout()
    }

    return (
        <div className="flex items-start gap-12">

            <div className="flex flex-col gap-4 w-72">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
                    <div className="flex flex-col items-center gap-3 pb-5 border-b border-neutral-800">
                        <Avatar name={user?.name ?? null} email={user?.email ?? ""} />
                        <h1 className="text-lg font-semibold text-neutral-100">{user?.name ?? user?.email ?? "—"}</h1>
                    </div>

                    <ul className="mt-5 space-y-3 text-sm text-neutral-300">
                        <li className="flex items-center gap-3">
                            <Mail size={14} className="text-neutral-500 shrink-0" />
                            {user?.email}
                        </li>
                        <li className="flex items-center gap-3">
                            <Calendar size={14} className="text-neutral-500 shrink-0" />
                            Member since {joined}
                        </li>
                    </ul>

                    <button
                        onClick={handleLogout}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-red-800 hover:bg-red-950 hover:text-red-400"
                    >
                        <LogOut size={14} />
                        Log out
                    </button>
                </div>

                <button
                    onClick={() => onNavigate?.("graph")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-400 transition hover:border-green-800 hover:bg-green-950 hover:text-green-400"
                >
                    <GitGraph size={14} />
                    View knowledge graph
                </button>
            </div>

            <div className="flex flex-col gap-3 w-56">
                <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={13} className="text-neutral-500" />
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Chats</span>
                    <span className="ml-auto text-xs text-neutral-600">{chats.length}</span>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                    {chats.length === 0 && (
                        <p className="px-4 py-3 text-xs text-neutral-600">No chats yet</p>
                    )}
                    {chats.map((chat, i) => (
                        <button
                            key={chat.id}
                            onClick={() => onNavigate?.("chat")}
                            className={`w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition ${i !== chats.length - 1 ? "border-b border-neutral-800" : ""
                                }`}
                        >
                            {chat.title ?? "Untitled chat"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3 w-56">
                <div className="flex items-center gap-2 mb-1">
                    <FileText size={13} className="text-neutral-500" />
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Documents</span>
                    <span className="ml-auto text-xs text-neutral-600">{docs.length}</span>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                    {docs.length === 0 && (
                        <p className="px-4 py-3 text-xs text-neutral-600">No documents yet</p>
                    )}
                    {docs.map((doc, i) => (
                        <button
                            key={doc.id}
                            onClick={() => onNavigate?.("docs")}
                            className={`w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition ${i !== docs.length - 1 ? "border-b border-neutral-800" : ""
                                }`}
                        >
                            {doc.title}
                        </button>
                    ))}
                </div>
            </div>

            <div
                className="hidden xl:block text-neutral-600 select-none self-center"
                style={{
                    filter: "drop-shadow(0 0 4px #166534) drop-shadow(0 0 12px #14532d)",
                    animation: "float 4s ease-in-out infinite",
                }}
            >
                <style>{`
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        `}</style>
                <AsciiEye />
            </div>

        </div>
    );
}