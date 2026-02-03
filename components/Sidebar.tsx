"use client";

type Props = {
    activeSection: "chat" | "docs" | "graph";
};

export default function Sidebar({ activeSection }: Props) {
    return (
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900 p-4">
            <h2 className="mb-4 text-sm font-medium text-neutral-300">
                {activeSection === "chat" && "Conversations"}
                {activeSection === "docs" && "Documents"}
                {activeSection === "graph" && "Graph"}
            </h2>

            {activeSection === "chat" && (
                <ul className="space-y-2 text-sm text-neutral-400">
                    <li className="cursor-pointer hover:text-neutral-200">Chat 1</li>
                    <li className="cursor-pointer hover:text-neutral-200">Chat 2</li>
                    <li className="cursor-pointer hover:text-neutral-200">Chat 3</li>
                </ul>
            )}

            {activeSection === "docs" && (
                <ul className="space-y-2 text-sm text-neutral-400">
                    <li className="cursor-pointer hover:text-neutral-200">Doc A</li>
                    <li className="cursor-pointer hover:text-neutral-200">Doc B</li>
                    <li className="cursor-pointer hover:text-neutral-200">Doc C</li>
                </ul>
            )}

            {activeSection === "graph" && (
                <div className="text-sm text-neutral-500">
                    Graph navigator (soon)
                </div>
            )}
        </aside>
    );
}
