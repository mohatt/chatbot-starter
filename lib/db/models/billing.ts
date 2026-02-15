import { eq } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { billings } from '../schema'

export type BillingRecord = typeof billings.$inferSelect
export type BillingRecordInput = Omit<typeof billings.$inferInsert, 'createdAt'>

export class BillingModel extends DbModel {
  readonly schema = billings

  async findById(id: string): Promise<BillingRecord | null> {
    try {
      const [selected] = await this.db.select().from(billings).where(eq(billings.id, id))
      return selected ?? null
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch billing by id')
    }
  }

  async ensure(data: BillingRecordInput) {
    try {
      await this.db.insert(billings).values(data).onConflictDoNothing({ target: billings.id })
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to create billing record')
    }
  }
}
