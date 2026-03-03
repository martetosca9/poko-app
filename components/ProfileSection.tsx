"use client";

import { Mail, Calendar, MessageSquare, LogOut } from "lucide-react";

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

export default function ProfileSection() {
    const user = MOCK_USER;
    const joined = user.createdAt.toLocaleDateString("es-AR", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
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
                    Miembro desde {joined}
                </li>
                <li className="flex items-center gap-3">
                    <MessageSquare size={16} className="text-neutral-500 shrink-0" />
                    {user.conversationCount} conversaciones
                </li>
            </ul>

            {/* Cerrar sesión */}
            <button
                onClick={() => console.log("logout")} // TODO: lógica real de logout
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-red-800 hover:bg-red-950 hover:text-red-400"
            >
                <LogOut size={15} />
                Cerrar sesión
            </button>
        </div>
    );
}