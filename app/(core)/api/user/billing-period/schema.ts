export interface BillingPeriod {
  chatCredits: {
    current: number
    remaining: number
    max: number
  }
  startDate: string
  endDate: string
}
