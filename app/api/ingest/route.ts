import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { Document } from '@langchain/core/documents';
import { ensureSchema, getChunkCount, getSessionMetadata, insertSessionChunks, saveSession } from '@/lib/db';
import { models } from '@/lib/ai';
import type { IngestMetadata, IngestResponse, SessionFileMetadata } from '@/lib/types'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AppDocument = Document<{
  fileId: string
  fileName: string
  sessionId: string
}>

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

function normalizeFileExtension(fileName: string, mime?: string) {
  const extension = extname(fileName || '').toLowerCase();
  if (extension) return extension;
  if (mime?.includes('pdf')) return '.pdf';
  if (mime?.includes('word')) return '.docx';
  if (mime?.includes('markdown')) return '.md';
  return '.txt';
}

export async function loadDocumentsFromFile(file: File): Promise<Document[]> {
  const extension = normalizeFileExtension(file.name, file.type);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  switch (extension) {
    case '.pdf': {
      const loader = new PDFLoader(file);
      return loader.load();
    }
    case '.docx': {
      const loader = new DocxLoader(file);
      return loader.load();
    }
    case '.txt':
    case '.md': {
      return [
        new Document({
          pageContent: await file.text(),
          metadata: { source: file.name, mimeType: file.type || 'text/plain' }
        })
      ];
    }
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

export function buildFileMetadata(file: File, chunks: Document[]): SessionFileMetadata {
  const characters = chunks.reduce((acc, doc) => acc + doc.pageContent.length, 0);
  const tokenEstimate = Math.max(1, Math.round(characters / 4));

  return {
    id: randomUUID(),
    fileName: file.name || 'document',
    mimeType: file.type || 'text/plain',
    size: file.size,
    chunkCount: chunks.length,
    tokenEstimate,
    addedAt: new Date().toISOString()
  };
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const formData = await request.formData();
    const uploadedFiles = formData.getAll('files').filter((item)=> item instanceof File);

    if (!uploadedFiles.length) {
      return NextResponse.json({ error: 'Choose at least one file to ingest.' }, { status: 400 });
    }

    const oversize = uploadedFiles.find((file) => file.size > MAX_FILE_BYTES);
    if (oversize) {
      return NextResponse.json(
        { error: `"${oversize.name}" exceeds ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)}MB limit.` },
        { status: 400 }
      );
    }

    const sessionId = formData.get('sessionId')?.toString() || randomUUID();
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 200 });

    const allChunks: AppDocument[] = [];
    const fileMetadata: SessionFileMetadata[] = [];

    for (const file of uploadedFiles) {
      const docs = await loadDocumentsFromFile(file);
      const chunks = await splitter.splitDocuments(docs);
      if (!chunks.length) {
        continue;
      }
      const metadata = buildFileMetadata(file, chunks);
      chunks.forEach((chunk) => {
        const appDoc: AppDocument = {
          ...chunk,
          metadata: {
            ...chunk.metadata,
            fileId: metadata.id,
            fileName: metadata.fileName,
            sessionId
          }
        }
        allChunks.push(appDoc);
      });
      fileMetadata.push(metadata);
    }

    if (!allChunks.length) {
      return NextResponse.json({ error: 'No readable text found in the uploaded files.' }, { status: 400 });
    }

    const chunkEmbeddings = await models.embedding.embedMany(allChunks.map((chunk) => chunk.pageContent));

    const existing = await getSessionMetadata(sessionId);
    const baseMetadata: IngestMetadata = existing?.metadata ?? {
      sessionCreatedAt: new Date().toISOString(),
      totalSize: 0,
      totalChunks: 0,
      totalTokenEstimate: 0,
      files: []
    };

    const mergedMetadata: IngestMetadata = {
      sessionCreatedAt: baseMetadata.sessionCreatedAt,
      totalSize: baseMetadata.totalSize + fileMetadata.reduce((sum, file) => sum + file.size, 0),
      totalChunks: baseMetadata.totalChunks + allChunks.length,
      totalTokenEstimate: baseMetadata.totalTokenEstimate + fileMetadata.reduce((sum, file) => sum + file.tokenEstimate, 0),
      files: [...baseMetadata.files, ...fileMetadata]
    };

    await saveSession(sessionId, mergedMetadata);

    const startIndex = existing ? await getChunkCount(sessionId) : 0;
    await insertSessionChunks(
      sessionId,
      startIndex,
      allChunks.map((chunk, index) => ({
        content: chunk.pageContent,
        metadata: chunk.metadata ?? {},
        embedding: chunkEmbeddings[index]
      }))
    );

    const payload: IngestResponse = { sessionId, metadata: mergedMetadata };
    return NextResponse.json(payload, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Ingest error', error);
    return NextResponse.json(
      { error: 'Failed to process document.', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
