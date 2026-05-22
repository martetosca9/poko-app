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
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
                <div key={doc.id} className="group relative border border-neutral-800 bg-neutral-950 p-4 hover:border-neutral-600 transition">
                    <Link href={`/documents/${doc.id}`} className="block">
                        <h3 className="text-sm text-neutral-100 truncate">{doc.title}</h3>
                        <p className="mt-1 text-[10px] text-neutral-600">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                    </Link>
                    <button
                        onClick={(e) => { e.preventDefault(); onDelete(doc.id) }}
                        className="absolute top-2 right-2 text-[10px] text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    >
                        [x]
                    </button>
                </div>
            ))}
        </div>
    );
}
