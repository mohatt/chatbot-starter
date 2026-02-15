import { z } from 'zod'

function timeZoneSchema() {
  return z.string().refine(
    (timeZone) => {
      try {
        Intl.DateTimeFormat('en-US', { timeZone })
      } catch {
        return false
      }
      return true
    },
    { message: 'Invalid time zone' },
  )
}

export const timeZone = timeZoneSchema()
