"use client";

import AsciiLogo from "@/components/AsciiLogo";
import AsciiAvatar from "@/components/AsciiAvatar";

type Section = "chat" | "docs" | "graph" | "profile";

type User = {
    id: string
    email: string
    name: string | null
    createdAt: string
}

type Props = {
    active: Section;
    onChange: (section: Section) => void;
    user: User | null;
};

export default function AppHeader({ active, onChange, user }: Props) {
    return (
        <div className="fixed left-3 right-3 top-3 z-50 h-11 rounded-lg border border-white/10 bg-black/55 text-xs shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex h-full items-center justify-between px-4">
                <div className="flex items-center overflow-hidden">
                    <div className="scale-75 origin-left">
                        <AsciiLogo />
                    </div>
                </div>

                <nav className="flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-1 py-1">
                    <button
                        onClick={() => onChange("chat")}
                        className={`rounded px-3 py-1 transition hover:text-neutral-100 ${active === "chat" ? "bg-white/10 text-green-300 shadow-[0_0_18px_rgba(34,197,94,0.12)]" : "text-neutral-400"}`}
                    >
                        Chat
                    </button>
                    <button
                        onClick={() => onChange("docs")}
                        className={`rounded px-3 py-1 transition hover:text-neutral-100 ${active === "docs" ? "bg-white/10 text-green-300 shadow-[0_0_18px_rgba(34,197,94,0.12)]" : "text-neutral-400"}`}
                    >
                        Documents
                    </button>
                    <button
                        onClick={() => onChange("graph")}
                        className={`rounded px-3 py-1 transition hover:text-neutral-100 ${active === "graph" ? "bg-white/10 text-green-300 shadow-[0_0_18px_rgba(34,197,94,0.12)]" : "text-neutral-400"}`}
                    >
                        Graph
                    </button>
                </nav>

                <button
                    onClick={() => onChange("profile")}
                    className="group flex items-center justify-center transition"
                >
                    <AsciiAvatar
                        seed={user?.id ?? "default"}
                        className={`text-[6px] leading-tight select-none font-bold ${active === "profile" ? "text-green-400" : "text-green-500 group-hover:text-green-400"
                            }`}
                        style={{
                            textShadow: active === "profile"
                                ? "0 0 8px #22c55e, 0 0 16px #16a34a"
                                : "0 0 6px #22c55e, 0 0 12px #16a34a"
                        }}
                    />
                </button>
            </div>
        </div>
    );
}
