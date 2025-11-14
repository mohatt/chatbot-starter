'use client';

import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import FileSummary from '@/components/FileSummary';
import ChatBox from '@/components/ChatBox';
import type { IngestResponse } from '@/lib/types';

export default function HomePage() {
  const [session, setSession] = useState<IngestResponse | null>(null);

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">Docs in, answers out.</p>
          <h1>TypeScript RAG Demo</h1>
          <p className="lede">Upload documents and chat with an AI assistant grounded entirely in your content.</p>
        </div>
      </header>

      <main>
        <section className="panel">
          <UploadForm sessionId={session?.sessionId ?? null} onComplete={setSession} />
          <FileSummary session={session} />
        </section>

        <section className="panel chat-panel">
          <ChatBox sessionId={session?.sessionId ?? null} isReady={Boolean(session)} />
        </section>
      </main>

      <footer>
        <span>Built with Next.js · Vercel AI SDK · Postgres</span>
      </footer>
    </div>
  );
}
