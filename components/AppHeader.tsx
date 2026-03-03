"use client";

import AsciiLogo from "@/components/AsciiLogo";

type Section = "chat" | "docs" | "graph" | "profile";

type Props = {
    active: Section;
    onChange: (section: Section) => void;
};

const MOCK_NAME = "sonny vega";

function avatarInitials(name: string) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function AppHeader({ active, onChange }: Props) {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-10 border-b border-neutral-800 bg-neutral-900 text-xs">
            <div className="flex h-full items-center justify-between px-6">
                {/* Logo */}
                <div className="flex items-center overflow-hidden">
                    <div className="scale-75 origin-left">
                        <AsciiLogo />
                    </div>
                </div>

                {/* Navegación */}
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

                {/* Avatar → perfil */}
                <button
                    onClick={() => onChange("profile")}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-2 transition ${
                        active === "profile"
                            ? "bg-neutral-200 text-neutral-900 ring-neutral-400"
                            : "bg-neutral-700 text-neutral-100 ring-neutral-600 hover:ring-neutral-400"
                    }`}
                >
                    {avatarInitials(MOCK_NAME)}
                </button>
            </div>
        </div>
    );
}