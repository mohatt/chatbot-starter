import { eq } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { billings } from '../schema'

export type BillingRecord = typeof billings.$inferSelect;
export type BillingRecordInput = Omit<typeof billings.$inferInsert, 'updatedAt'>

export class BillingModel extends DbModel {
  readonly schema = billings;

  async getById(id: string): Promise<BillingRecord | null> {
    try {
      const [selectedBilling] = await this.db.select().from(billings).where(eq(billings.id, id));
      return selectedBilling ?? null;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to fetch billing by id");
    }
  }
}
