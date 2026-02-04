"use client";

import DocumentsGrid from "./DocumentsGrid";

type Doc = {
    id: string;
    title: string;
};

type Props = {
    documents: Doc[];
    onCreate: () => void;
};

export default function DocumentsSection({ documents, onCreate }: Props) {
    return (
        <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                <h2 className="text-sm text-neutral-300">Your documents</h2>

                <button
                    onClick={onCreate}
                    className="bg-neutral-800 px-3 py-1 rounded-lg text-xs hover:bg-neutral-700"
                >
                    New
                </button>
            </div>

            <DocumentsGrid documents={documents} />
        </div>
    );
}
