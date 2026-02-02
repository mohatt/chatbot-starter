import { createQuery } from 'react-query-kit'
import { fetcher } from '@/lib/utils'
import type { BillingPeriod } from '@/lib/billing'

export const useUserBillingPeriodQuery = createQuery({
  queryKey: ['userBillingPeriod'],
  fetcher: async () => fetcher<BillingPeriod>(`/api/user/billing-period`),
})
