import { Index } from "@upstash/vector";
import { chunk } from 'lodash-es'
import { AsyncCaller } from '@/lib/async-caller'
import { AppError } from '@/lib/errors'
import type { Env } from '@/lib/env'
import type { DocumentInterface, FileLoaderDoc } from '@/lib/document'

const UPSERT_CONCURRENT_LIMIT = 1e3;
const UPSERT_MAX_RETRIES = 1;

export class VectorNamespace<Metadata extends Record<string, unknown>> {
  readonly namespace: ReturnType<Index<Metadata>['namespace']>
  private readonly caller: AsyncCaller

  constructor(index: Index, readonly id: string) {
    this.namespace = index.namespace(id);
    this.caller = new AsyncCaller({
      maxRetries: UPSERT_MAX_RETRIES,
      maxConcurrency: Infinity,
    });
  }

  async insert(docs: DocumentInterface<Metadata>[]) {
    try {
      const docChunks = chunk(docs, UPSERT_CONCURRENT_LIMIT);
      const batchRequests = docChunks.map((chunk) => this.caller.call(async () => this.namespace.upsert<any>(chunk)));
      await Promise.all(batchRequests);
    } catch (_err) {
      throw new AppError("internal:database", "Failed to save vector documents");
    }
  }

  async query(query: string | number[], k: number, filter?: string): Promise<[DocumentInterface<Metadata>, score: number][]> {
    try {
      const results = await this.namespace.query({
        ...(typeof query === 'string' ? { data: query } : { vector: query }),
        topK: k,
        includeData: true,
        includeMetadata: true,
        filter,
      });
      return results.map(({ id, data, score, metadata }) => [{ id: id as string, data: data!, metadata: metadata! }, score]);
    } catch (_err) {
      throw new AppError("internal:database", "Failed to query vector documents");
    }
  }

  async deleteByFilter(filter: string) {
    try {
      return await this.namespace.delete({ filter });
    } catch (_err) {
      throw new AppError("internal:database", "Failed to delete vector documents");
    }
  }
}

export class VectorDb {
  index: Index;
  content: VectorNamespace<FileLoaderDoc['metadata']>;

  constructor(env: Env) {
    this.index = Index.fromEnv(env);
    this.content = new VectorNamespace(this.index, 'content');
  }

  reset(mode: 'content' | 'all') {
    if (mode === 'all') {
      return this.index.reset({ all: true })
    }
    if (mode === 'content') {
      return this.index.reset({ namespace: mode })
    }
    throw new Error(`Invalid reset mode: ${String(mode)}`)
  }
}
