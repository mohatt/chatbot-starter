import { config } from '@/lib/config'
import type { Db, BillingPeriodRecord } from '@/lib/db'
import type { AuthUser } from '@/lib/auth'
import type { BillingTierType, BillingTier } from './tiers'

export interface BillingPeriodQuota {
  used: number
  remaining: number
  max: number
}

export interface BillingPeriod extends Pick<BillingPeriodRecord, 'id' | 'tier' | 'billingId'> {
  chatCredits: BillingPeriodQuota
  tierConfig: BillingTier
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface BillingUserInfo {
  tier: BillingTierType
  tierConfig: BillingTier
  billingId: string
}

export type BillingUser = Pick<AuthUser, 'id' | 'billingId' | 'isAnonymous'>

export class Billing {
  constructor(private readonly db: Db) {}

  getUserInfo(user: BillingUser): BillingUserInfo {
    const { id, isAnonymous, billingId } = user
    if (!billingId) {
      throw new Error(`User "${id}" does not have a valid billing profile`)
    }
    const tier: BillingTierType = isAnonymous ? 'anonymous' : 'user'
    const tierConfig = config.billing.tierMap[tier]
    return { tier, tierConfig, billingId }
  }

  async getCurrentPeriod(user: BillingUser) {
    const { tier, tierConfig, billingId } = this.getUserInfo(user)
    const { maxChatUsage } = tierConfig
    const periodModel = this.db.billingPeriods
    const periodRecord = await periodModel.ensureCurrent(billingId, {
      tier,
      maxChatUsage,
    })
    const period = this.createPeriod(periodRecord)
    const update = periodModel.updateById.bind(periodModel, periodRecord.id)
    return {
      period,
      update: async (...args: Parameters<typeof update>) =>
        update(...args).then((updated) => (updated != null ? this.createPeriod(updated) : null)),
    }
  }

  async listPeriods(user: BillingUser): Promise<BillingPeriod[]> {
    const { billingId } = this.getUserInfo(user)
    const periods = await this.db.billingPeriods.findMany(billingId)
    return periods.map((record) => this.createPeriod(record))
  }

  private createPeriod(record: BillingPeriodRecord): BillingPeriod {
    const { id, tier, billingId, year, month, chatUsage, maxChatUsage, createdAt, updatedAt } =
      record

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
      tierConfig: config.billing.tierMap[tier],
      chatCredits: {
        used: chatUsage,
        remaining: Math.max(0, maxChatUsage - chatUsage),
        max: maxChatUsage,
      },
    }
  }
}

export * from './tiers'
