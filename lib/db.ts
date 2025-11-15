import { sql } from '@vercel/postgres';
import type { ChunkRecord, IngestMetadata } from './types';

let schemaInitialized = false;

function toVectorLiteral(values: number[]) {
  return `[${values.join(',')}]`;
}

export async function ensureSchema() {
  if (schemaInitialized) return;
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS session_chunks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
      chunk_index INTEGER,
      content TEXT,
      metadata JSONB,
      embedding VECTOR(384)
    )`;
  schemaInitialized = true;
}

export async function saveSession(sessionId: string, metadata: IngestMetadata) {
  await sql`
    INSERT INTO sessions (id, metadata)
    VALUES (${sessionId}, ${JSON.stringify(metadata)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary, metadata = EXCLUDED.metadata
  `;
}

export async function getChunkCount(sessionId: string) {
  const { rows } = await sql<{ count: string }>`
    SELECT COUNT(*)::text as count
    FROM session_chunks
    WHERE session_id = ${sessionId}
  `;
  return rows.length ? Number(rows[0].count) : 0;
}

export async function insertSessionChunks(
  sessionId: string,
  startIndex: number,
  chunks: { content: string; metadata: Record<string, unknown>; embedding: number[] }[]
) {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await sql`
      INSERT INTO session_chunks (session_id, chunk_index, content, metadata, embedding)
      VALUES (
        ${sessionId},
        ${startIndex + i},
        ${chunk.content},
        ${JSON.stringify(chunk.metadata)}::jsonb,
        ${toVectorLiteral(chunk.embedding)}::vector
      )
    `;
  }
}

export async function getSessionMetadata(sessionId: string) {
  const { rows } = await sql<{ summary: string; metadata: IngestMetadata }>`
    SELECT summary, metadata
    FROM sessions
    WHERE id = ${sessionId}
  `;
  return rows[0] ?? null;
}

export async function searchSessionChunks(sessionId: string, embedding: number[], limit: number) {
  const vectorLiteral = toVectorLiteral(embedding);
  const { rows } = await sql<ChunkRecord>`
    SELECT chunk_index, content, metadata
    FROM session_chunks
    WHERE session_id = ${sessionId}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;
  return rows;
}
