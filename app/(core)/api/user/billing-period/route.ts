import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api'

export const GET = createApiHandler<RouteContext<'/api/user/billing-period'>>(async ({ api, session }) => {
  const { user } = await session()
  const { period } = await api.billing.getCurrentPeriod(user)
  return NextResponse.json(period);
})
