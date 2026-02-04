# Chatbot Starter

A full‑stack AI chatbot starter with RAG, file uploads, and project‑scoped chats, built on **Next.js**, **Vercel AI SDK**, **Postgres**, and **Upstash Vector**.

[Live Demo][vercel-demo]

## Features

- **Streaming chat UI** with Markdown rendering, auto-scroll, and rich AI elements
- **Multi-model support** via Vercel AI Gateway (OpenAI, Anthropic, Google, xAI, and many more)
- **File uploads + RAG** with vector indexing (Upstash Vector) and in-chat file search/read tools
- **Projects + chats** with per-project history and organized sidebar
- **Auth + access control** with public/private chat visibility
- **Usage tracking & limits** with per-user chat credits
- **Advanced routing + client-side caching** for seamless navigation and performance

## Tech Stack

- Next.js 16 + React 19 + React Query
- shadcn/ui + Tailwind CSS
- Vercel AI SDK + AI Gateway
- Neon Postgres + Drizzle ORM
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

The Vercel dashboard will guide you through provisioning **Neon Postgres** and **Upstash Vector** (the required integrations) during setup.
Once connected, Vercel will inject the required environment variables automatically.

### 3. Environment variables

You only need to set the required secrets (e.g., `AUTH_SECRET`, `CRON_SECRET`). You may use `openssl rand -base64 32` to generate those secrets.

Other env vars are provisioned by Vercel and can be pulled locally with:

```bash
# Install Vercel CLI
pnpm i -g vercel
# Link local instance with Vercel and GitHub accounts 
vercel link
# Download your environment variables locally
vercel env pull .env.development.local
```

> **Recommended:** Set secrets in the Vercel dashboard so they’re automatically included whenever you pull envs.

### 4. Apply database migrations

After your Postgres URL is set locally, run:

```bash
pnpm db:push
```

This will sync the current schema in `lib/db/schema` to your Postgres database.

### 5. Review app configurations

Most app configurations live in [`lib/config.ts`](./lib/config.ts), including:
- AI models registry and defaults
- Chat limits (message parts, history)
- File upload rules and size limits
- Billing tiers and usage caps
- Project limits (e.g., max files)

### 6. Run locally

```bash
pnpm dev
```

Visit `http://localhost:3000`.

### 7. Deploy to Vercel

Once the setup steps above are complete, deploy from the Vercel dashboard:

1. Open your project in Vercel.
2. Click **Deploy** (or push to your connected Git branch).

Or deploy from the CLI:

```bash
vercel deploy
```

[vercel-demo]: https://chatbot-starter.vercel.app
[vercel-deploy]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmohatt%2Fchatbot-starter&env=AUTH_SECRET,CRON_SECRET&envDescription=API%20Keys%20needed%20for%20the%20application.&envLink=https%3A%2F%2Fgithub.com%2Fmohatt%2Fchatbot-starter%23env-vars&project-name=ai-chatbot&repository-name=ai-chatbot&demo-title=Chatbot%20Starter&demo-description=A%20full-stack%20AI%20Chatbot%20Starter%20powered%20by%20Next.js%20and%20Vercel%20AI%20SDK.&demo-url=https%3A%2F%2Fchatbot-starter.vercel.app&demo-image=https%3A%2F%2Fraw.githubusercontent.com%2Fmohatt%2Fchatbot-starter%2Frefs%2Fheads%2Fmain%2Fpublic%2Fdemo-image-01.png&stores=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-vector%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D

<!--# See https://vercel.com/docs/deploy-button -->
<!--# See https://vercel.com/docs/deploy-button/source -->
