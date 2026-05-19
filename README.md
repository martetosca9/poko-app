# Poko App

Next.js app with Prisma, PostgreSQL, and pgvector.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

Set `JWT_SECRET` to any long random value. `GROQ_API_KEY` is only needed for chat features.

3. Start the database:

```bash
npm run db:up
```

4. Apply migrations:

```bash
npm run db:migrate
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If another process is using port 3000, Next.js will choose the next available port.

## Useful commands

```bash
npm run prisma:generate
npm run db:status
npm run lint
```
