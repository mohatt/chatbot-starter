export interface SessionFileMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  chunkCount: number;
  tokenEstimate: number;
  addedAt: string;
}

export interface IngestMetadata {
  sessionCreatedAt: string;
  totalSize: number;
  totalChunks: number;
  totalTokenEstimate: number;
  files: SessionFileMetadata[];
}

export interface IngestResponse {
  sessionId: string;
  metadata: IngestMetadata;
}

export interface ChunkRecord {
  content: string;
  metadata: Record<string, unknown>;
  chunk_index: number;
}
