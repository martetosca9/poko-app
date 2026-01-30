"use client";

import AsciiBot from "@/components/AsciiBot";
import { SendHorizontal } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-300">
            Conversations
          </h2>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="cursor-pointer hover:text-neutral-200">Chat 1</li>
            <li className="cursor-pointer hover:text-neutral-200">Chat 2</li>
            <li className="cursor-pointer hover:text-neutral-200">Chat 3</li>
          </ul>
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col bg-neutral-900">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ☰
          </button>
          <h1 className="text-sm font-medium tracking-wide text-neutral-200">
            Poko-app
          </h1>
        </header>

        {/* Messages */}
        <section className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {/* Poko waiting */}
          <div className="max-w-[80%] text-[10px] leading-none text-neutral-300">
            <AsciiBot state="waiting" />
          </div>
          <div className="max-w-[80%] rounded-none bg-neutral-800 px-4 py-3 text-sm">
            Ask any question...
          </div>
          <div className="ml-auto max-w-[80%] rounded-none bg-neutral-700 px-4 py-3 text-sm">
            test
          </div>
        </section>

        {/* Input */}
        <footer className="border-t border-neutral-800 px-4 py-3">
          <form className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 rounded-none bg-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:ring-1 focus:ring-neutral-600"
            />
            <button
              type="submit"
              className="rounded-none bg-neutral-700 px-4 py-3 text-sm font-medium hover:bg-neutral-600"
            >
            <SendHorizontal />
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
