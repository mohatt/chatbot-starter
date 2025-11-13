import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TypeScript RAG Demo',
  description: 'Docs in, answers out — powered by Next.js, Vercel AI SDK, and Postgres.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
