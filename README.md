# 🧠 TypeScript RAG Demo (Next.js Edition)

A full-stack Retrieval-Augmented Generation demo powered by **Next.js App Router**, **Vercel AI SDK + AI Gateway**, and **Vercel Postgres (pgvector)**.

The flow:
1. Upload one or more documents (PDF / DOCX / TXT / Markdown).
2. We parse, chunk, embed with LangChain + Hugging Face or OpenAI embeddings.
3. Embeddings + chunks are stored in **Postgres** (vector column) so every serverless invocation can retrieve them.
4. The `/api/chat` route runs semantic search directly inside Postgres, then streams a grounded answer via the Vercel AI SDK.

---
## ✨ Features
- ✅ **Next.js App Router** client/server components
- ✅ **Vercel AI SDK + AI Gateway** for streaming LLM responses
- ✅ **Vercel Postgres** with `pgvector` for shared session storage
- ✅ **Hugging Face** _or_ **OpenAI-compatible** providers for both chat + embeddings
- ✅ **Markdown-rendered chat** with auto-scroll and multi-file uploads

---
## 🧰 Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 + React 19 |
| AI SDK | `@ai-sdk/react`, `ai` (Vercel AI SDK) |
| Embeddings / Chunking | LangChain text splitters + Hugging Face/OpenAI embeddings |
| Storage | Vercel Postgres (`pgvector` extension) |
| Hosting | Vercel (serverless functions + Postgres + AI Gateway) |

---
## ⚙️ Setup
### 1. Install deps
```bash
npm install
```

### 2. Database
Provision Vercel Postgres (or any Postgres with the `vector` & `pgcrypto` extensions). Set `POSTGRES_URL` in `.env`.

The API layer ensures the schema exists, but for clarity here’s the DDL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  summary TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB,
  embedding VECTOR(384)
);
```
> 💡 384 = embedding dimension for `sentence-transformers/all-MiniLM-L6-v2`. Change it if you switch models.

### 3. Environment variables (`.env`)
Refer to `.env.example`:
```
POSTGRES_URL=...
HF_ACCESS_TOKEN=...
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://gateway.ai.cloudflare.com/...
AI_MODEL=meta-llama/Llama-3.1-8B-Instruct
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```
- **HF_ACCESS_TOKEN** – free tier works for both embeddings and chat.
- **OPENAI_API_KEY / BASE_URL** – optional; point at the AI Gateway, Together, Fireworks, etc.

### 4. Run locally
```bash
npm run dev
```
Visit `http://localhost:3000` and upload docs.

### 5. Deploy to Vercel
1. `vercel` (or `vercel deploy --prod`)
2. Attach the **Postgres** + **AI Gateway** integrations.
3. Copy the env vars from `.env` to the Vercel dashboard (including `POSTGRES_URL`, `HF_ACCESS_TOKEN`, etc.).

---
## 🧠 Architecture
```
app/
├── page.tsx (client page: UploadForm + FileSummary + ChatBox)
├── api/
│   ├── ingest/route.ts  # ingest pipeline -> Postgres + pgvector
│   └── chat/route.ts    # similarity search + LLM streaming
lib/
├── db.ts               # schema helpers & vector queries
├── embeddings.ts       # LangChain embeddings factory
├── docLoader.ts        # PDF/DOCX/TXT loaders
├── utils.ts            # token estimates, summaries
components/
├── UploadForm.tsx      # multi-file upload UI
├── FileSummary.tsx     # session metadata panel
└── ChatBox.tsx         # streaming markdown chat
```

---
## 📡 API Details
### `POST /api/ingest`
- multipart form: `files[]`, optional `sessionId`
- Splits, embeds, stores chunks + metadata in Postgres
- Appends to an existing session if `sessionId` provided

### `POST /api/chat`
- body: `{ sessionId, messages }` (same payload as Vercel AI SDK `useChat`)
- Embeds last user message, runs `SELECT ... ORDER BY embedding <=> query LIMIT 4`
- Streams either Hugging Face (`chatCompletionStream`) or OpenAI-compatible responses

---
## 🚀 Tips
- **Vector index**: for larger corpora, add `CREATE INDEX session_chunks_embedding_idx ON session_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);`
- **Cleanup**: add a cron/queue to delete stale sessions (e.g., after 24h) using the `sessions` table.
- **Providers**: To stay 100% free, use Hugging Face Inference or Groq via AI Gateway and keep usage below their rate limits.

Happy hacking! “Docs in, answers out.”
