"use client";

import { useParams } from "next/navigation";

export default function DocumentPage() {
    const { id } = useParams();

    return (
        <div className="flex flex-col h-screen bg-neutral-900 text-neutral-100 p-6">
            <input
                className="bg-transparent text-2xl font-semibold outline-none mb-4"
                placeholder="Untitled"
            />

            <textarea
                className="flex-1 bg-neutral-800 p-4 rounded-lg outline-none resize-none"
                placeholder="Start writing..."
            />
        </div>
    );
}
