import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api'
import { config } from '@/lib/config'
import type { BillingPeriod } from './schema'

export const GET = createApiHandler<RouteContext<'/api/user/billing-period'>>(async ({ api, session }) => {
  const { user } = await session()
  const { maxChatCredits } = config.billing[user.isAnonymous ? 'anonymous' : 'user']
  const { year, month, chatUsage } = await api.db.billingPeriods.ensureCurrent(user.billingId!);

  // Calculate period start and end dates (UTC, first day of the month)
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))

  const data: BillingPeriod = {
    chatCredits: {
      current: chatUsage,
      remaining: Math.max(0, maxChatCredits - chatUsage),
      max: maxChatCredits,
    },
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }

  return NextResponse.json(data);
})
