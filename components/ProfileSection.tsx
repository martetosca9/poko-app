"use client";

import { Mail, Calendar, MessageSquare, LogOut, FileText, GitGraph } from "lucide-react";
import AsciiEye from "@/components/AsciiEye";

const MOCK_USER = {
    name: "sonny vega",
    email: "mail@test.com",
    createdAt: new Date("2024-11-01"),
    conversationCount: 12,
    documentCount: 5,
};

const MOCK_CHATS = [
    { id: "1", title: "Chat 1" },
    { id: "2", title: "Chat 2" },
    { id: "3", title: "Chat 3" },
];

const MOCK_DOCS = [
    { id: "1", title: "Untitled" },
    { id: "2", title: "Untitled 2" },
];

function Avatar({ name }: { name: string }) {
    const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    return (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-700 text-xl font-semibold text-neutral-100 ring-2 ring-neutral-600">
            {initials}
        </div>
    );
}

type Props = {
    onLogout: () => void
    onNavigate?: (section: "chat" | "docs" | "graph") => void
}

export default function ProfileSection({ onLogout, onNavigate }: Props) {
    const user = MOCK_USER;
    const joined = user.createdAt.toLocaleDateString("es-AR", {
        year: "numeric", month: "long", day: "numeric",
    });

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" })
        onLogout()
    }

    return (
        <div className="flex items-start gap-12">

            {/* Columna izquierda: info del usuario */}
            <div className="flex flex-col gap-4 w-72">

                {/* Card principal */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
                    <div className="flex flex-col items-center gap-3 pb-5 border-b border-neutral-800">
                        <Avatar name={user.name} />
                        <h1 className="text-lg font-semibold text-neutral-100">{user.name}</h1>
                    </div>

                    <ul className="mt-5 space-y-3 text-sm text-neutral-300">
                        <li className="flex items-center gap-3">
                            <Mail size={14} className="text-neutral-500 shrink-0" />
                            {user.email}
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

                {/* Botón graph */}
                <button
                    onClick={() => onNavigate?.("graph")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-400 transition hover:border-green-800 hover:bg-green-950 hover:text-green-400"
                >
                    <GitGraph size={14} />
                    View knowledge graph
                </button>
            </div>

            {/* Columna chats */}
            <div className="flex flex-col gap-3 w-56">
                <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={13} className="text-neutral-500" />
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Chats</span>
                    <span className="ml-auto text-xs text-neutral-600">{MOCK_CHATS.length}</span>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                    {MOCK_CHATS.map((chat, i) => (
                        <button
                            key={chat.id}
                            onClick={() => onNavigate?.("chat")}
                            className={`w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition ${
                                i !== MOCK_CHATS.length - 1 ? "border-b border-neutral-800" : ""
                            }`}
                        >
                            {chat.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Columna docs */}
            <div className="flex flex-col gap-3 w-56">
                <div className="flex items-center gap-2 mb-1">
                    <FileText size={13} className="text-neutral-500" />
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Documents</span>
                    <span className="ml-auto text-xs text-neutral-600">{MOCK_DOCS.length}</span>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                    {MOCK_DOCS.map((doc, i) => (
                        <button
                            key={doc.id}
                            onClick={() => onNavigate?.("docs")}
                            className={`w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition ${
                                i !== MOCK_DOCS.length - 1 ? "border-b border-neutral-800" : ""
                            }`}
                        >
                            {doc.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ojo ASCII flotando a la derecha */}
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
                        50%       { transform: translateY(-10px); }
                    }
                `}</style>
                <AsciiEye />
            </div>

        </div>
    );
}