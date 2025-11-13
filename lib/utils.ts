import { randomUUID } from 'node:crypto';
import type { DocumentInterface } from '@langchain/core/documents';
import type { SessionFileMetadata } from './types';

export function approximateTokens(documents: DocumentInterface[]) {
  const characters = documents.reduce((acc, doc) => acc + doc.pageContent.length, 0);
  return Math.max(1, Math.round(characters / 4));
}

export function summarizeDocument(documents: DocumentInterface[]) {
  if (!documents.length) return 'Document ingested successfully.';
  const first = documents[0].pageContent.trim();
  if (!first) return 'Document ingested successfully.';
  return first.length > 320 ? `${first.slice(0, 320)}…` : first;
}

export function buildFileMetadata(params: {
  fileName: string;
  mimeType?: string;
  size: number;
  chunks: DocumentInterface[];
}): SessionFileMetadata {
  return {
    id: randomUUID(),
    fileName: params.fileName || 'document',
    mimeType: params.mimeType || 'text/plain',
    size: params.size,
    chunkCount: params.chunks.length,
    tokenEstimate: approximateTokens(params.chunks),
    addedAt: new Date().toISOString()
  };
}
