import { createQuery } from 'react-query-kit'
import { fetcher } from '@/lib/util'
import type { BillingPeriod } from '@/app/(core)/api/user/billing-period/schema'

export const useUserBillingPeriodQuery = createQuery({
  queryKey: ['userBillingPeriod'],
  fetcher: async () => fetcher<BillingPeriod>(`/api/user/billing-period`),
})
