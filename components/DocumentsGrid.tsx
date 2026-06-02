"use client";

import Link from "next/link";

type Doc = {
    id: string;
    title: string;
    updatedAt: string;
};

type Props = {
    documents: Doc[];
    onDelete: (id: string) => void;
};

export default function DocumentsGrid({ documents, onDelete }: Props) {
    return (
        <div className="grid grid-cols-1 gap-4 p-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
                <div key={doc.id} className="group relative rounded-lg border border-white/10 bg-black/50 p-4 shadow-xl shadow-black/20 backdrop-blur-md transition hover:border-green-900/70 hover:bg-black/65">
                    <Link href={`/documents/${doc.id}`} className="block">
                        <h3 className="truncate text-sm text-neutral-100">{doc.title}</h3>
                        <p className="mt-1 text-[10px] text-neutral-500">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                    </Link>
                    <button
                        onClick={(e) => { e.preventDefault(); onDelete(doc.id) }}
                        className="absolute right-2 top-2 rounded px-1 text-[10px] text-neutral-600 opacity-0 transition hover:bg-red-950/40 hover:text-red-400 group-hover:opacity-100"
                    >
                        [x]
                    </button>
                </div>
            ))}
        </div>
    );
}
