# Chatbot Starter

A full‑stack AI chatbot starter with RAG, file uploads, and project‑scoped chats, built on **Next.js**, **Vercel AI SDK**, **Upstash Vector**, **Postgres**, and **Upstash Vector**.”

[Live Demo][vercel-demo]

## Features

- **Streaming chat UI** with Markdown rendering, auto-scroll, and rich AI elements
- **Multi-model support** via Vercel AI Gateway (OpenAI, Anthropic, Google, xAI, and many more)
- **File uploads + RAG** with vector indexing (Upstash Vector) and in-chat file search/read tools
- **Projects + chats** with per-project history and organized sidebar
- **Auth + access control** with public/private chat visibility
- **Usage tracking & limits** with per-user chat credits

## Tech Stack

- Next.js 16 + React 19
- Vercel AI SDK + AI Gateway
- Postgres (Neon) + Drizzle ORM
- Upstash Vector (RAG)
- Vercel Blob (file storage)
- BetterAuth for authentication
- Hosted on Vercel

## Deploy Your Own

You can deploy your own version of the Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)][vercel-deploy]

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Database

Todo

### 3. Environment variables

Refer to `.env.example`:

### 4. Run locally

```bash
pnpm dev
```

Visit `http://localhost:3000`.

### 5. Deploy to Vercel

TODO

[vercel-demo]: https://chatbot-starter.vercel.app
[vercel-deploy]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmohatt%2Fchatbot-starter&env=BETTER_AUTH_URL,BETTER_AUTH_SECRET,CRON_SECRET&envDefaults=%7B%22BETTER_AUTH_URL%22%3A%22http%3A%2F%2Flocalhost%3A3000%22%7D&envDescription=API%20Keys%20needed%20for%20the%20application.&envLink=https%3A%2F%2Fgithub.com%2Fmohatt%2Fchatbot-starter%23env-vars&project-name=ai-chatbot&repository-name=ai-chatbot&demo-title=Chatbot%20Starter&demo-description=A%20full-stack%20AI%20Chatbot%20Starter%20powered%20by%20Next.js%20and%20Vercel%20AI%20SDK.&demo-url=https%3A%2F%2Fchatbot-starter.vercel.app&demo-image=https%3A%2F%2Fraw.githubusercontent.com%2Fmohatt%2Fchatbot-starter%2Frefs%2Fheads%2Fmain%2Fpublic%2Fdemo-image-01.png&stores=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-vector%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D

<!--# See https://vercel.com/docs/deploy-button -->
<!--# See https://vercel.com/docs/deploy-button/source -->
