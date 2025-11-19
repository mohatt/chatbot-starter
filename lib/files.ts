// Max file size for RAG ingestion
export const INGEST_FILE_LIMIT = 16;
export const INGEST_FILE_MAX_BYTES = 8 * 1024 * 1024;
export const INGEST_FILE_MAX_BYTES_TOTAL = INGEST_FILE_MAX_BYTES * 2;

// Supported file extensions for RAG ingestion
export const INGEST_FILE_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'] as const;

export type IngestFileExtension = (typeof INGEST_FILE_EXTENSIONS)[number];

export function isIngestFileExtension(extension: string): extension is IngestFileExtension {
  return INGEST_FILE_EXTENSIONS.includes(extension as IngestFileExtension);
}

export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
