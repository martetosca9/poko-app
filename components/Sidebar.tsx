"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type Props = {
    activeSection: "chat" | "docs" | "graph" | "profile";
    activeConversationId?: string | null;
    activeDocumentId?: string | null;
    conversationsRefreshKey?: number;
    documentsRefreshKey?: number;
    onNewConversation?: () => void;
    onNewDocument?: () => void;
    onSelectConversation?: (id: string) => void;
};

type Doc = { id: string; title: string }
type Chat = { id: string; title: string | null }

export default function Sidebar({
    activeSection,
    activeConversationId,
    activeDocumentId,
    conversationsRefreshKey = 0,
    documentsRefreshKey = 0,
    onNewConversation,
    onNewDocument,
    onSelectConversation
}: Props) {
    const router = useRouter()
    const [docs, setDocs] = useState<Doc[]>([])
    const [chats, setChats] = useState<Chat[]>([])

    useEffect(() => {
        fetch("/api/documents")
            .then(r => r.json())
            .then(data => setDocs(data.documents ?? []))
            .catch(() => {})

        fetch("/api/conversations")
            .then(r => r.json())
            .then(data => setChats(data.conversations ?? []))
            .catch(() => {})
    }, [conversationsRefreshKey, documentsRefreshKey])

    return (
        <aside className="m-3 mt-5 flex w-60 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/55 shadow-2xl shadow-black/35 backdrop-blur-xl">

            {activeSection === "chat" && (
                <div className="flex flex-col overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                            Conversations
                        </span>
                        <button
                            type="button"
                            title="New chat"
                            onClick={onNewConversation}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/45 text-neutral-400 transition hover:border-green-700 hover:text-green-300"
                        >
                            <Plus size={14} strokeWidth={1.8} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {chats.length === 0 && (
                            <p className="px-4 py-3 text-xs text-neutral-600">No chats yet</p>
                        )}
                        {chats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => onSelectConversation?.(chat.id)}
                                className={`mx-2 my-1 w-[calc(100%-1rem)] truncate rounded-md px-3 py-2 text-left text-xs transition ${
                                    chat.id === activeConversationId
                                        ? "bg-white/10 text-green-300 shadow-[0_0_18px_rgba(34,197,94,0.10)]"
                                        : "text-neutral-400 hover:bg-white/10 hover:text-neutral-100"
                                }`}
                            >
                                {chat.title ?? "Untitled chat"}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeSection === "docs" && (
                <div className="flex flex-col overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                            Documents
                        </span>
                        {onNewDocument && (
                            <button
                                type="button"
                                title="New document"
                                onClick={onNewDocument}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/45 text-neutral-400 transition hover:border-green-700 hover:text-green-300"
                            >
                                <Plus size={14} strokeWidth={1.8} />
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {docs.length === 0 && (
                            <p className="px-4 py-3 text-xs text-neutral-600">No documents</p>
                        )}
                        {docs.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => router.push(`/documents/${doc.id}`)}
                                className={`mx-2 my-1 w-[calc(100%-1rem)] truncate rounded-md px-3 py-2 text-left text-xs transition ${
                                    doc.id === activeDocumentId
                                        ? "bg-white/10 text-green-300 shadow-[0_0_18px_rgba(34,197,94,0.10)]"
                                        : "text-neutral-400 hover:bg-white/10 hover:text-neutral-100"
                                }`}
                            >
                                {doc.title || "Untitled"}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeSection === "graph" && (
                <div className="flex flex-col overflow-hidden flex-1">
                    <div className="border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500">
                        Graph
                    </div>
                    <div className="px-4 py-3 text-xs text-neutral-600">
                        Graph navigator (soon)
                    </div>
                </div>
            )}

            {activeSection === "profile" && (
                <div className="flex flex-col overflow-hidden flex-1">
                    <div className="border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500">
                        Documents
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {docs.length === 0 && (
                            <p className="px-4 py-3 text-xs text-neutral-600">No documents</p>
                        )}
                        {docs.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => router.push(`/documents/${doc.id}`)}
                                className="mx-2 my-1 w-[calc(100%-1rem)] truncate rounded-md px-3 py-2 text-left text-xs text-neutral-400 transition hover:bg-white/10 hover:text-neutral-100"
                            >
                                {doc.title || "Untitled"}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col overflow-hidden border-t border-white/10">
                        <div className="border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500">
                            Chats
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {chats.length === 0 && (
                                <p className="px-4 py-3 text-xs text-neutral-600">No chats yet</p>
                            )}
                            {chats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => onSelectConversation?.(chat.id)}
                                    className="mx-2 my-1 w-[calc(100%-1rem)] truncate rounded-md px-3 py-2 text-left text-xs text-neutral-400 transition hover:bg-white/10 hover:text-neutral-100"
                                >
                                    {chat.title ?? "Untitled chat"}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </aside>
    );
}
