import { createQuery } from 'react-query-kit'
import { fetcher } from '@/lib/utils'
import type { UserBillingPeriod } from '@/app/(core)/api/user/billing-period/schema'

export const useUserBillingPeriodQuery = createQuery({
  queryKey: ['userBillingPeriod'],
  fetcher: async () => fetcher<UserBillingPeriod>(`/api/user/billing-period`),
})
