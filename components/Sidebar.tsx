"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type Props = {
    activeSection: "chat" | "docs" | "graph" | "profile";
    activeConversationId?: string | null;
    conversationsRefreshKey?: number;
    onNewConversation?: () => void;
    onSelectConversation?: (id: string) => void;
};

type Doc = { id: string; title: string }
type Chat = { id: string; title: string | null }

export default function Sidebar({
    activeSection,
    activeConversationId,
    conversationsRefreshKey = 0,
    onNewConversation,
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
    }, [conversationsRefreshKey])

    return (
        <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-900 flex flex-col overflow-hidden">

            {activeSection === "chat" && (
                <div className="flex flex-col overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                            Conversations
                        </span>
                        <button
                            type="button"
                            title="New chat"
                            onClick={onNewConversation}
                            className="flex h-6 w-6 items-center justify-center border border-neutral-800 text-neutral-500 transition hover:border-neutral-600 hover:text-neutral-100"
                        >
                            <Plus size={14} strokeWidth={1.8} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {chats.length === 0 && (
                            <p className="px-4 py-3 text-xs text-neutral-700">No chats yet</p>
                        )}
                        {chats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => onSelectConversation?.(chat.id)}
                                className={`w-full truncate px-4 py-2 text-left text-xs transition ${
                                    chat.id === activeConversationId
                                        ? "bg-neutral-800 text-neutral-100"
                                        : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
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
                                className="w-full text-left px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition truncate"
                            >
                                {doc.title || "Untitled"}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeSection === "graph" && (
                <div className="flex flex-col overflow-hidden flex-1">
                    <div className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-600 border-b border-neutral-800">
                        Graph
                    </div>
                    <div className="px-4 py-3 text-xs text-neutral-700">
                        Graph navigator (soon)
                    </div>
                </div>
            )}

            {activeSection === "profile" && (
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
                                className="w-full text-left px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition truncate"
                            >
                                {doc.title || "Untitled"}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col overflow-hidden border-t border-neutral-800">
                        <div className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-600 border-b border-neutral-800">
                            Chats
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {chats.length === 0 && (
                                <p className="px-4 py-3 text-xs text-neutral-700">No chats yet</p>
                            )}
                            {chats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => onSelectConversation?.(chat.id)}
                                    className="w-full text-left px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition truncate"
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
