import { extname } from 'node:path';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import type { DocumentInterface } from '@langchain/core/documents';
import { Document } from '@langchain/core/documents';

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

function normalizeExtension(fileName: string, mime?: string) {
  const extension = extname(fileName || '').toLowerCase();
  if (extension) return extension;
  if (mime?.includes('pdf')) return '.pdf';
  if (mime?.includes('word')) return '.docx';
  if (mime?.includes('markdown')) return '.md';
  return '.txt';
}

export async function loadDocumentsFromBuffer(params: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<DocumentInterface[]> {
  const extension = normalizeExtension(params.fileName, params.mimeType);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  switch (extension) {
    case '.pdf': {
      const slice = params.buffer.buffer.slice(
        params.buffer.byteOffset,
        params.buffer.byteOffset + params.buffer.byteLength
      ) as ArrayBuffer;
      const loader = new PDFLoader(new Blob([slice]));
      return loader.load();
    }
    case '.docx': {
      const slice = params.buffer.buffer.slice(
        params.buffer.byteOffset,
        params.buffer.byteOffset + params.buffer.byteLength
      ) as ArrayBuffer;
      const loader = new DocxLoader(new Blob([slice]));
      return loader.load();
    }
    case '.txt':
    case '.md': {
      const content = params.buffer.toString('utf-8');
      return [
        new Document({
          pageContent: content,
          metadata: { source: params.fileName, mimeType: params.mimeType || 'text/plain' }
        })
      ];
    }
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
