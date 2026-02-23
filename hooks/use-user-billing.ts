'use client'
import { useUserBillingPeriodQuery } from '@/api-client/hooks/user'

export function useUserBilling() {
  const { data, isLoading, error } = useUserBillingPeriodQuery()
  const { chatCredits, projectQuota } = data ?? {}
  const hasNoChatCredits = chatCredits != null && chatCredits.remaining <= 0
  const hasNoProjectQuota = projectQuota != null && projectQuota.remaining <= 0

  return {
    data,
    error,
    isLoading,
    hasNoChatCredits,
    hasNoProjectQuota,
  }
}
