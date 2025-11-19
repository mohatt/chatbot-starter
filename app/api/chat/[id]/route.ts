import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { Document } from '@langchain/core/documents';
import { ChatRecordContext, ChatRecordContextFile, db } from '@/lib/db'
import { vectorDb, VectorFileDoc, VectorContentDoc } from '@/lib/db/vector'
import {
  isIngestFileExtension, formatFileSize, INGEST_FILE_MAX_BYTES, INGEST_FILE_LIMIT,
  INGEST_FILE_MAX_BYTES_TOTAL,
} from '@/lib/files'
import { AppError } from '@/lib/errors'

export const runtime = 'nodejs';

function normalizeFileExtension(file: File) {
  const extension = extname(file.name).toLowerCase();
  if (extension) return extension;
  if (file.type.includes('pdf')) return '.pdf';
  if (file.type.includes('word')) return '.docx';
  if (file.type.includes('markdown')) return '.md';
  return '.txt';
}

export async function loadDocumentsFromFile(file: File): Promise<Document[]> {
  const extension = normalizeFileExtension(file);
  if (!isIngestFileExtension(extension)) {
    throw new AppError('bad_request:chat', `Unsupported file type: ${extension}`)
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
      throw new Error(`Missing file handler for: ${extension}`)
  }
}

export async function POST(request: NextRequest, ctx: RouteContext<'/api/chat/[id]'>) {
  try {
    const { id } = await ctx.params;
    const userId = 'e35df7ca-8c99-4821-b025-b8e1f9bf5539'
    const chat = id === 'new'
      ? await db.chats.create({ title: 'New Session', userId })
      : await db.chats.getById(id);
    if (!chat) {
      throw new AppError('not_found:chat')
    }
    if (chat.userId !== userId) {
      throw new AppError('forbidden:chat')
    }

    const formData = await request.formData();
    const uploadedFiles = formData.getAll('files').filter((item)=> item instanceof File);
    if (!uploadedFiles.length) {
      throw new AppError('bad_request:chat', 'Choose at least one file to ingest.')
    }

    if (uploadedFiles.length > INGEST_FILE_LIMIT) {
      throw new AppError('bad_request:chat', `You can only upload up to ${INGEST_FILE_LIMIT} files at a time.`)
    }

    let totalSize = 0;
    uploadedFiles.forEach((file, index) => {
      if (!file.name || !file.size || !file.type) {
        throw new AppError('bad_request:chat', `Invalid file upload metadata at index#${index}.`)
      }
      if (file.size > INGEST_FILE_MAX_BYTES) {
        throw new AppError('bad_request:chat', `"${file.name}" exceeds ${formatFileSize(INGEST_FILE_MAX_BYTES)} limit.`)
      }
      totalSize += file.size
    })
    if (totalSize > INGEST_FILE_MAX_BYTES_TOTAL) {
      throw new AppError('bad_request:chat', `Total files size exceeds ${formatFileSize(INGEST_FILE_MAX_BYTES_TOTAL)} limit.`)
    }

    const fileIds: string[] = []
    const fileVectors: VectorFileDoc[] = []
    const fileContentVectors: VectorContentDoc[] = []
    const contextFiles: ChatRecordContextFile[] = [];

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 200 });
    let totalTokens = 0
    for (const file of uploadedFiles) {
      const docs = await loadDocumentsFromFile(file);
      const chunks = await splitter.splitDocuments(docs);
      if (!chunks.length) {
        continue;
      }
      const fileId = randomUUID()
      const characters = chunks.reduce((acc, doc) => acc + doc.pageContent.length, 0);
      if(!characters) {
        continue;
      }
      fileIds.push(fileId)
      const tokenEstimate = Math.max(1, Math.round(characters / 4));
      totalTokens += tokenEstimate;
      contextFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        tokens: tokenEstimate,
        vectors: chunks.length,
      })

      chunks.forEach((chunk, index) => {
        fileContentVectors.push({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            index,
            fileId,
            chatId: chat.id,
            fileName: file.name,
          },
        })
      });

      fileVectors.push({
        pageContent: [
          `File Name: ${file.name}`,
          `File Size: ${file.size}`,
          `File Type: ${file.type}`,
          `Summary: ${file.name}`,
        ].join('\n'),
        metadata: {
          chatId: chat.id,
          size: file.size,
          type: file.type,
        },
      })
    }

    if (!fileContentVectors.length) {
      throw new AppError('bad_request:chat', 'No readable text found in the uploaded files.')
    }

    await vectorDb.files.addDocs(fileVectors, fileIds)
    await vectorDb.content.addDocs(fileContentVectors)

    const baseMetadata: ChatRecordContext = chat.context ?? {
      size: 0,
      vectors: 0,
      tokens: 0,
      files: []
    };

    const updatedChat = await db.chats.update(chat.id, {
      context: {
        size: baseMetadata.size + totalSize,
        vectors: baseMetadata.vectors + fileVectors.length + fileContentVectors.length,
        tokens: baseMetadata.tokens + totalTokens,
        files: [...baseMetadata.files, ...contextFiles],
      },
    })

    return NextResponse.json(updatedChat, { status: id === 'new' ? 201 : 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return error.toResponse();
    }
    return new AppError('internal:chat', error as Error)
  }
}

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/chat/[id]'>) {
  try {
    const { id } = await ctx.params
    const chat = await db.chats.getById(id);
    if (!chat) {
      throw new AppError('not_found:chat')
    }
    return NextResponse.json(chat);
  } catch (error) {
    if (error instanceof AppError) {
      return error.toResponse();
    }
    return new AppError('internal:chat', error as Error).toResponse()
  }
}
