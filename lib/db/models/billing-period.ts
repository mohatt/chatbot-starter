import { eq, sql } from 'drizzle-orm'
import { v5 as uuidv5 } from 'uuid'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { billingPeriods } from '../schema'

export type BillingPeriodRecord = typeof billingPeriods.$inferSelect;

export type BillingPeriodParts = {
  year: number;
  month: number;
};

// used for generating deterministic billing period ids
const UUID_NAMESPACE = '68cd2d57-96aa-40ac-bd4a-3723cd1136ad';

export class BillingPeriodModel extends DbModel {
  readonly schema = billingPeriods;

  /**
   * Ensures a current billing period row exists (used by zero-delta updates or when
   * atomic increments race). Returns the fresh or existing row.
   */
  async ensureCurrent(billingId: string){
    try {
      const { id, parts } = this.getId(billingId);
      const [current] = await this.db
        .select()
        .from(billingPeriods)
        .where(eq(billingPeriods.id, id));
      if (current) return current

      const [inserted] = await this.db
        .insert(billingPeriods)
        .values({
          id,
          billingId,
          year: parts.year,
          month: parts.month,
        })
        .returning();
      return inserted;
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to ensure current billing period');
    }
  }

  async updateCurrent(billingId: string, data: {
    inputDelta?: number;
    outputDelta?: number;
  }): Promise<BillingPeriodRecord> {
    const normalizedInput = data.inputDelta ?? 0;
    const normalizedOutput = data.outputDelta ?? 0;
    const { id, parts } = this.getId(billingId);

    if (normalizedInput === 0 && normalizedOutput === 0) {
      return this.ensureCurrent(billingId);
    }

    try {
      const [record] = await this.db
        .insert(billingPeriods)
        .values({
          id,
          billingId,
          year: parts.year,
          month: parts.month,
          inputUsage: normalizedInput,
          outputUsage: normalizedOutput,
        })
        .onConflictDoUpdate({
          target: billingPeriods.id,
          set: {
            inputUsage: sql`${billingPeriods.inputUsage} + ${normalizedInput}`,
            outputUsage: sql`${billingPeriods.outputUsage} + ${normalizedOutput}`,
          },
        })
        .returning();
      if (record) {
        return record;
      }
      return this.ensureCurrent(billingId);
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to update current billing period");
    }
  }

  async findMany(billingId: string, limit = 12, offset = 0): Promise<BillingPeriodRecord[]> {
    try {
      return await this.db.query.billingPeriods.findMany({
        where: (table, { eq }) => eq(table.billingId, billingId),
        orderBy: (table, { desc }) => [desc(table.year), desc(table.month)],
        limit,
        offset,
      });
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to list billing periods");
    }
  }

  /**
   * Generates a deterministic UUIDv5 for (billingId, year, month).
   * This lets us upsert the period row without round-trips while guaranteeing
   * concurrent writers all collide on the same physical record.
   */
  private getId(billingId: string, period: Date | BillingPeriodParts = new Date()) {
    const parts = period instanceof Date ? {
      year: period.getUTCFullYear(),
      month: period.getUTCMonth() + 1,
    } : period;
    const periodKey = `${parts.year}-${`${parts.month}`.padStart(2, '0')}`;
    const id = uuidv5(`${billingId}:${periodKey}`, UUID_NAMESPACE)
    return { id, parts }
  }
}
