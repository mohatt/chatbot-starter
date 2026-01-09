import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { cronJobs } from '../schema'

export type CronJobRecord = typeof cronJobs.$inferSelect;

export class CronJobModel extends DbModel {
  readonly schema = cronJobs;

  async acquireLock(id: string, ttl: number): Promise<CronJobRecord | null> {
    try {
      const lockId = randomUUID();
      const lockedAt = new Date();
      const staleBefore = new Date(lockedAt.getTime() - ttl);
      const [row] = await this.db
        .insert(cronJobs)
        .values({
          id,
          lockId,
          lockedAt,
          status: 'pending',
        })
        .onConflictDoUpdate({
          target: cronJobs.id,
          set: {
            lockId,
            lockedAt,
            status: 'pending',
            completedAt: null,
            error: null,
          },
          setWhere: sql`${cronJobs.status} IS DISTINCT FROM 'pending'
            OR ${cronJobs.lockedAt} IS NULL
            OR ${cronJobs.lockedAt} < ${staleBefore}`,
        })
        .returning();
      return row ?? null;
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to acquire cron job lock');
    }
  }

  async complete(id: string, lockId: string, error?: string | null) {
    try {
      await this.db
        .update(cronJobs)
        .set({
          status: error != null ? 'error' : 'success',
          error: error ?? null,
          lockId: null,
          lockedAt: null,
          completedAt: new Date(),
        })
        .where(and(
          eq(cronJobs.id, id),
          eq(cronJobs.lockId, lockId),
        ));
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to complete cron job run');
    }
  }
}
