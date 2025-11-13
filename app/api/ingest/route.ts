import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { loadDocumentsFromBuffer } from '../../../lib/docLoader';
import { createEmbeddings } from '../../../lib/embeddings';
import { ensureSchema, getChunkCount, getSessionMetadata, insertSessionChunks, saveSession } from '../../../lib/db';
import { buildFileMetadata, summarizeDocument } from '../../../lib/utils';
import type { DocumentInterface } from '@langchain/core/documents';
import type { IngestMetadata, IngestResponse } from '../../../lib/types';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const formData = await request.formData();
    const uploadedFiles = formData.getAll('files').filter((item): item is File => item instanceof File);

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

    const allChunks: DocumentInterface[] = [];
    const fileMetadata = [];
    let latestChunks: DocumentInterface[] = [];

    for (const file of uploadedFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const docs = await loadDocumentsFromBuffer({ buffer, fileName: file.name, mimeType: file.type });
      const chunks = await splitter.splitDocuments(docs);
      if (!chunks.length) {
        continue;
      }
      const metadata = buildFileMetadata({ fileName: file.name, mimeType: file.type, size: file.size, chunks });
      chunks.forEach((chunk) => {
        chunk.metadata = {
          ...chunk.metadata,
          fileId: metadata.id,
          fileName: metadata.fileName,
          sessionId
        };
      });
      allChunks.push(...chunks);
      latestChunks = chunks;
      fileMetadata.push(metadata);
    }

    if (!allChunks.length) {
      return NextResponse.json({ error: 'No readable text found in the uploaded files.' }, { status: 400 });
    }

    const embeddings = createEmbeddings();
    const chunkEmbeddings = await embeddings.embedDocuments(allChunks.map((chunk) => chunk.pageContent));

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

    const latestFile = fileMetadata[fileMetadata.length - 1];
    const summary = `Latest addition (${latestFile.fileName}): ${summarizeDocument(latestChunks)}`;

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
