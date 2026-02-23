import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api'
import type { UserBillingPeriod } from './schema'

export const GET = createApiHandler<RouteContext<'/api/user/billing-period'>>(
  async ({ api, session }) => {
    const { user } = await session()
    const [{ period }, projectsUsage] = await Promise.all([
      api.billing.getCurrentPeriod(user),
      api.db.projects.countMany({ userId: user.id }),
    ])
    const { maxProjects } = period.tierConfig
    return NextResponse.json<UserBillingPeriod>({
      ...period,
      projectQuota: {
        used: projectsUsage,
        remaining: Math.max(0, maxProjects - projectsUsage),
        max: maxProjects,
      },
    })
  },
)
