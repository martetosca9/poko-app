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
        <div className="fixed top-0 left-0 right-0 z-50 h-10 border-b border-neutral-800 bg-neutral-900 text-xs">
            <div className="flex h-full items-center justify-between px-6">
                <div className="flex items-center overflow-hidden">
                    <div className="scale-75 origin-left">
                        <AsciiLogo />
                    </div>
                </div>

                <nav className="flex items-center gap-8">
                    <button
                        onClick={() => onChange("chat")}
                        className={`hover:text-neutral-100 ${active === "chat" ? "text-neutral-100" : "text-neutral-400"}`}
                    >
                        Chat
                    </button>
                    <button
                        onClick={() => onChange("docs")}
                        className={`hover:text-neutral-100 ${active === "docs" ? "text-neutral-100" : "text-neutral-400"}`}
                    >
                        Documents
                    </button>
                    <button
                        onClick={() => onChange("graph")}
                        className={`hover:text-neutral-100 ${active === "graph" ? "text-neutral-100" : "text-neutral-400"}`}
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