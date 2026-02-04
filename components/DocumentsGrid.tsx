"use client";

import Link from "next/link";

type Doc = {
    id: string;
    title: string;
};

type Props = {
    documents: Doc[];
};

export default function DocumentsGrid({ documents }: Props) {
    return (
        <div className="grid grid-cols-3 gap-4 p-6">
            {documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                    <div className="bg-neutral-800 p-4 rounded-lg hover:bg-neutral-700 cursor-pointer">
                        <h3 className="text-sm text-neutral-100">{doc.title}</h3>
                    </div>
                </Link>
            ))}
        </div>
    );
}
