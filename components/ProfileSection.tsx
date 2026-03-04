"use client";

import { Mail, Calendar, MessageSquare, LogOut } from "lucide-react";
import AsciiEye from "@/components/AsciiEye";

const MOCK_USER = {
    name: "sonny vega",
    email: "mail@test.com",
    createdAt: new Date("2024-11-01"),
    conversationCount: 12,
};

function Avatar({ name }: { name: string }) {
    const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    return (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-700 text-2xl font-semibold text-neutral-100 ring-2 ring-neutral-600">
            {initials}
        </div>
    );
}

type Props = {
    onLogout: () => void
}

export default function ProfileSection({ onLogout }: Props) {
    const user = MOCK_USER;
    const joined = user.createdAt.toLocaleDateString("es-AR", {
        year: "numeric", month: "long", day: "numeric",
    });

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" })
        onLogout()
    }

    return (
        <div className="flex items-center gap-16">

            {/* Card de perfil */}
            <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
                {/* Avatar + nombre */}
                <div className="flex flex-col items-center gap-3 pb-6 border-b border-neutral-800">
                    <Avatar name={user.name} />
                    <h1 className="text-xl font-semibold text-neutral-100">{user.name}</h1>
                </div>

                {/* Datos */}
                <ul className="mt-6 space-y-4 text-sm text-neutral-300">
                    <li className="flex items-center gap-3">
                        <Mail size={16} className="text-neutral-500 shrink-0" />
                        {user.email}
                    </li>
                    <li className="flex items-center gap-3">
                        <Calendar size={16} className="text-neutral-500 shrink-0" />
                        Member since {joined}
                    </li>
                    <li className="flex items-center gap-3">
                        <MessageSquare size={16} className="text-neutral-500 shrink-0" />
                        {user.conversationCount} chats
                    </li>
                </ul>

                {/* Cerrar sesión */}
                <button
                    onClick={handleLogout}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-red-800 hover:bg-red-950 hover:text-red-400"
                >
                    <LogOut size={15} />
                    Log out
                </button>
            </div>

            {/* Ojo ASCII flotando a la derecha */}
            <div
                className="hidden lg:block text-neutral-600 select-none"
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