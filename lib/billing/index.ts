import { config } from '@/lib/config'
import type { Db, BillingPeriodRecord } from '@/lib/db'
import type { AuthUser } from '@/lib/auth'

export interface BillingPeriod extends Pick<BillingPeriodRecord, 'id' | 'tier' | 'billingId'> {
  chatCredits: {
    used: number
    remaining: number
    max: number
  }
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export class Billing {
  constructor(private readonly db: Db) {}

  async getCurrentPeriod(user: AuthUser) {
    const tier = user.isAnonymous ? 'anonymous' : 'user'
    const { maxChatUsage } = config.billing.tiers[tier]
    const periodModel = this.db.billingPeriods
    const periodRecord = await periodModel.ensureCurrent(user.billingId!, {
      tier,
      maxChatUsage,
    });
    const period = this.createPeriod(periodRecord)
    const update = periodModel.updateById.bind(periodModel, periodRecord.id)
    return {
      period,
      update: async (...args: Parameters<typeof update>) => update(...args)
        .then((updated) => updated != null ? this.createPeriod(updated) : null)
    }
  }

  async listPeriods(user: AuthUser): Promise<BillingPeriod[]> {
    const periods = await this.db.billingPeriods.findMany(user.billingId!)
    return periods.map((record) => this.createPeriod(record))
  }

  private createPeriod(record: BillingPeriodRecord): BillingPeriod {
    const { id, tier, billingId, year, month, chatUsage, maxChatUsage, createdAt, updatedAt } = record;

    // Calculate period start and end dates (UTC, first day of the month)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))

    return {
      id,
      tier,
      billingId,
      createdAt,
      updatedAt,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      chatCredits: {
        used: chatUsage,
        remaining: Math.max(0, maxChatUsage - chatUsage),
        max: maxChatUsage,
      },
    }
  }
}
