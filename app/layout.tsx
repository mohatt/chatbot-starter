import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TypeScript RAG Demo',
  description: 'Docs in, answers out — powered by Next.js, Vercel AI SDK, and Postgres.'
};

export default function RootLayout(props: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
      <div className="app-shell">
        <header>
          <div>
            <p className="eyebrow">Docs in, answers out.</p>
            <h1>TypeScript RAG Demo</h1>
            <p className="lede">Upload documents and chat with an AI assistant grounded entirely in your content.</p>
          </div>
        </header>
        {props.children}
        <footer>
          <span>Built with Next.js · Vercel AI SDK · Postgres</span>
        </footer>
      </div>
      </body>
    </html>
  );
}
