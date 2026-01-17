import { z } from 'zod'
import { useCallback, useEffect, useState } from 'react'
import { config } from '@/lib/config'

const clientSettingsKey = 'client-settings'
const clientSettingsSchema = z.object({
  chatModel: config.chat.models.getKeySchema().optional()
})

export type ClientSettings = z.infer<typeof clientSettingsSchema>

function readStoredValue() {
  try {
    const json = window.localStorage.getItem(clientSettingsKey)
    if (json == null) {
      return null
    }
    return clientSettingsSchema.parse(JSON.parse(json))
  } catch (error) {
    console.error('Error reading client settings', error)
    return null
  }
}

export function useClientSettings() {
  const [data, setData] = useState<ClientSettings | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = () => {
      if (!isMounted) return
      setData(readStoredValue())
      setError(null)
    }
    load()
    const handleStorage = (event: StorageEvent | CustomEvent) => {
      if ((event as StorageEvent).key === clientSettingsKey) {
        load()
      }
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('local-storage', handleStorage)
    return () => {
      isMounted = false
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('local-storage', handleStorage)
    }
  }, [])

  const mutate = useCallback((vars: z.input<typeof clientSettingsSchema>) => {
    try {
      const json = window.localStorage.getItem(clientSettingsKey)
      const prevVars = json == null ? {} : JSON.parse(json)
      const nextVars = { ...prevVars, ...vars }
      const nextData = clientSettingsSchema.parse(nextVars)
      window.localStorage.setItem(clientSettingsKey, JSON.stringify(nextVars))
      // We dispatch a custom event so other hooks in same-tab are notified
      window.dispatchEvent(new StorageEvent('local-storage', { key: clientSettingsKey }))
      setData(nextData)
      setError(null)
      return nextData
    } catch (err) {
      console.error(`Error writing client settings: ${String(err)}`)
      setError(err as Error)
      return null
    }
  }, [])

  return { data, error, mutate }
}
