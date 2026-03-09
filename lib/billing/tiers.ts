import type { BillingPeriodRecord } from '@/lib/db'

export type BillingTierType = BillingPeriodRecord['tier']

export type BillingTier = Pick<BillingPeriodRecord, 'maxChatUsage'> & {
  maxProjects: number
  maxProjectFiles: number
  maxMessageFiles: number
  maxChatMessages: number
}

export type BillingTierMap = Record<BillingTierType, BillingTier>
