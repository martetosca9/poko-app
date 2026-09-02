# Poko

A notes and assistant app with a retro ASCII aesthetic, inspired by tools like Obsidian. Write documents, explore them in a relationship graph, and chat with **Poko** — an assistant powered by [Groq](https://groq.com/) (Llama 3.3 70B) that can answer questions, list your notes, and edit them in natural language.

## Features

- **Authentication** — Sign up and log in with bcrypt-hashed passwords and JWT sessions in httpOnly cookies.
- **Documents** — Create, search, open, and delete notes. [CodeMirror](https://codemirror.net/) editor with hashtag highlighting (`#tag`).
- **Graph** — Interactive canvas of nodes and edges: each document is a node; hashtags create `tag` nodes and automatic edges when content is saved.
- **Chat with Poko** — Spanish-speaking assistant with an animated ASCII avatar (waiting, thinking, talking).
  - General conversation with the model.
  - **List documents** — e.g. *"show me my documents"*.
  - **Edit documents** — e.g. *"fill in the document called X with …"*; the AI drafts content and saves it to the database.
- **Profile** — User info and sign out.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| Database | SQLite (local file `dev.db` via `@libsql/client`) |
| ORM | Prisma 7 (`@prisma/adapter-libsql`) |
| AI | Groq SDK — `llama-3.3-70b-versatile` |
| Auth | JWT (`jsonwebtoken`) + cookies |

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [Groq](https://console.groq.com/) account and API key

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/martetosca9/poko-app.git
cd poko-app
npm install
```

### 2. Environment variables

Create `.env` or `.env.local` in the project root:

```env
# SQLite local database file
DATABASE_URL="file:./dev.db"

# Secret for signing JWTs (use a long random value in production)
JWT_SECRET="your-jwt-secret"

# Groq API key — required for chat and document editing
GROQ_API_KEY="gsk_..."
```

### 3. Database

Synchronize the SQLite database and generate the Prisma client:

```bash
npm run db:push
npm run prisma:generate
```

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # production server
npm run lint    # ESLint
```

## Project structure

```
poko-app/
├── app/
│   ├── page.tsx              # Main shell (chat, docs, graph, profile)
│   ├── documents/[id]/       # Single document editor
│   └── api/
│       ├── auth/             # login, register, logout, me
│       ├── chat/             # Poko assistant
│       ├── documents/        # document CRUD
│       └── graph/            # graph nodes and edges
├── components/               # UI (ASCII, chat, graph, documents…)
├── lib/
│   ├── db.ts                 # Prisma client
│   ├── auth.ts               # JWT and session
│   └── embeddings.ts         # document chunking (vector search pending)
├── prisma/
│   └── schema.prisma         # User, Document, GraphNode, Message, etc.
└── docker-compose.yml        # Postgres + pgvector on port 5433
```

## Main API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `GET` | `/api/auth/me` | Current user |
| `GET` / `POST` | `/api/documents` | List / create documents |
| `GET` / `PATCH` / `DELETE` | `/api/documents/[id]` | Read / update / delete |
| `GET` | `/api/conversations` | List user chat conversations |
| `GET` / `DELETE` | `/api/conversations/[id]` | Load / delete conversation and messages |
| `GET` | `/api/graph` | User graph data |
| `POST` | `/api/chat` | Message to assistant |

## Chat: usage examples

- General question: *"What is photosynthesis?"*
- List notes: *"list my documents"*
- Edit a note: *"fill in the document 'Ideas' with: …"* or *"update note X with …"*

After editing a document from chat, the **Documents** section refreshes automatically.

## Implementation notes

- Documents are split into **chunks** on save (`lib/embeddings.ts`). Semantic vector search is defined in the schema (`vector(768)`) but **disabled** for now; embedding retrieval returns an empty list until enabled.
- The data model includes `Conversation` and `Message` for persistent history; the main page chat is currently **in-memory** on the client (the sidebar UI references `/api/conversations`, which is not implemented yet).
- If `GROQ_API_KEY` is missing or invalid, chat returns an error asking you to check the variable and restart the server.
