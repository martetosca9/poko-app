"use client";

import { Plus } from "lucide-react";

type Doc = {
    id: string;
    title: string;
};

type Props = {
    documents: Doc[];
    onCreate: () => void;
    onOpen: (id: string) => void;
};

export default function DocumentsSection({
    documents,
    onCreate,
    onOpen,
}: Props) {
    return (
        <div className="flex flex-1 flex-col bg-neutral-900 p-4">
            {/* Header de la sección */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-neutral-200">Documents</h2>

                <button
                    onClick={onCreate}
                    className="flex items-center gap-1 rounded-md bg-neutral-800 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
                >
                    <Plus className="h-4 w-4" />
                    New
                </button>
            </div>

            {/* Grid de docs */}
            {documents.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
                    No documents yet. Create one with the + button.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {documents.map((doc) => (
                        <button
                            key={doc.id}
                            onClick={() => onOpen(doc.id)}
                            className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-left hover:bg-neutral-800"
                        >
                            <h3 className="truncate text-sm font-medium text-neutral-200">
                                {doc.title}
                            </h3>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
