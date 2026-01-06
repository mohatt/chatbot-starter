import type { Api } from '@/lib/api'
import { setTimeout } from 'node:timers/promises';
import { del, BlobServiceRateLimited } from '@vercel/blob';

export const handlers = new Map<string, (api: Api) => Promise<void>>();

handlers.set('cleanup-orphan-files', async ({ db, vectorDb }) => {
  // Batch size to respect rate limits (conservative approach)
  const BATCH_SIZE = 100; // Conservative batch size
  const DELAY_MS = 1000; // 1 sec delay between batches
  const MAX_RETRIES = 3;

  let cursor: string | null = null;
  let totalCount = 0;

  do {
    const { data, nextCursor } = await db.files.findMany({ orphan: true }, BATCH_SIZE, cursor)
    const currBatchSize = data.length
    if (!currBatchSize) {
      break
    }

    const fileIds: string[] = []
    const storageKeys: string[] = []
    const retrievalIds: string[] = []
    for (const file of data) {
      fileIds.push(file.id)
      storageKeys.push(file.storageKey)
      if (file.bucket === 'retrieval') {
        retrievalIds.push(file.id)
      }
    }

    // Retry logic with exponential backoff
    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        if (retrievalIds.length > 0) {
          await vectorDb.files.deleteByFilter(`file.id IN ('${retrievalIds.join(`', '`)}')`)
        }
        await del(storageKeys);
        await db.files.deleteByIds(fileIds);
        totalCount += currBatchSize;
        console.log(`Deleted ${currBatchSize}/${totalCount} files`);
        break; // Success, exit retry loop
      } catch (error) {
        retries++;

        if (retries > MAX_RETRIES) {
          console.error(`Failed to delete batch after ${MAX_RETRIES} retries:`, error);
          throw error; // Re-throw after max retries
        }

        // Exponential backoff: wait longer with each retry
        let backoffDelay = 2 ** retries * 1000;
        if (error instanceof BlobServiceRateLimited) {
          backoffDelay = error.retryAfter * 1000;
        }

        console.warn(`Retry ${retries}/${MAX_RETRIES} after ${backoffDelay}ms delay`);
        await setTimeout(backoffDelay);
      }

      await setTimeout(DELAY_MS);
    }

    cursor = nextCursor;
  } while (cursor);

  console.log(`Done deleting total of ${totalCount} orphan files!`)
})
