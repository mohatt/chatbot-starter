import type { BillingPeriodQuota, BillingPeriod } from '@/lib/billing'

export interface UserBillingPeriod extends BillingPeriod {
  projectQuota: BillingPeriodQuota
}
