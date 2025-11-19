import type { DocumentInterface } from '@langchain/core/documents'
import { UpstashVectorStore, UpstashMetadata, UpstashQueryMetadata } from "@langchain/community/vectorstores/upstash";
import { FakeEmbeddings } from "@langchain/core/utils/testing";
import { Index } from "@upstash/vector";

export interface VectorFileMetadata {
  chatId: string;
  type: string;
  size: number;
  [key: string]: any;
}

export type VectorFileDoc = DocumentInterface<VectorFileMetadata>;

export interface VectorContentMetadata {
  index: number
  chatId: string;
  fileId: string;
  fileName: string;
  [key: string]: any;
}

export type VectorContentDoc = DocumentInterface<VectorContentMetadata>;

export class VectorStore<Metadata extends UpstashMetadata> {
  id: string
  store: UpstashVectorStore

  constructor(namespace: string, index: Index) {
    this.store = new UpstashVectorStore(new FakeEmbeddings(), { index, namespace });
  }

  addDocs(docs: DocumentInterface<Metadata>[], ids?: string[]): Promise<string[]> {
    return this.store.addDocuments(docs, ids ? { ids } : undefined);
  }

  similaritySearchWithScore(query: number[] | string, limit: number, filter?: string): Promise<[DocumentInterface<Metadata & UpstashQueryMetadata>, number][]> {
    return this.store.similaritySearchVectorWithScore(query, limit, filter) as any;
  }
}

export class VectorDb {
  index: Index;
  files: VectorStore<VectorFileMetadata>;
  content: VectorStore<VectorContentMetadata>;

  constructor() {
    this.index = Index.fromEnv();
    this.files = new VectorStore<VectorFileMetadata>('files', this.index);
    this.content = new VectorStore<VectorContentMetadata>('content', this.index);
  }

  reset(mode: 'files' | 'content' | 'all') {
    if (mode === 'all') {
      return this.index.reset({ all: true })
    }
    if (mode === 'files' || mode === 'content') {
      return this.index.reset({ namespace: mode })
    }
    throw new Error(`Invalid reset mode: ${String(mode)}`)
  }
}

export const vectorDb = new VectorDb();
