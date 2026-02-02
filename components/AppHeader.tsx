"use client";

import AsciiLogo from "@/components/AsciiLogo";

type Props = {
    active: "chat" | "docs" | "graph";
    onChange: (section: "chat" | "docs" | "graph") => void;
};

export default function AppHeader({ active, onChange }: Props) {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-10 border-b border-neutral-800 bg-neutral-900 text-xs">
            <div className="flex h-full items-center justify-around px-6">
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
                        className={`hover:text-neutral-100 ${active === "chat" ? "text-neutral-100" : "text-neutral-400"
                            }`}
                    >
                        Chat
                    </button>

                    <button
                        onClick={() => onChange("docs")}
                        className={`hover:text-neutral-100 ${active === "docs" ? "text-neutral-100" : "text-neutral-400"
                            }`}
                    >
                        Documents
                    </button>

                    <button
                        onClick={() => onChange("graph")}
                        className={`hover:text-neutral-100 ${active === "graph" ? "text-neutral-100" : "text-neutral-400"
                            }`}
                    >
                        Graph
                    </button>
                </nav>
            </div>
        </div>
    );
}
