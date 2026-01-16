import { z } from 'zod'
import { createMutation, createQuery } from 'react-query-kit'

const clientSettingsKey = 'client-settings'
const clientSettingsSchema = z.object({
  chatModel: z.string().nonempty().optional()
})

export type ClientSettings = z.infer<typeof clientSettingsSchema>

export const useClientSettingsQuery = createQuery({
  queryKey: ['clientSettings'],
  fetcher: async (_vars: never) => {
    try {
      const raw = window.localStorage.getItem(clientSettingsKey)
      if (raw == null) {
        return null
      }
      return clientSettingsSchema.parse(JSON.parse(raw))
    } catch (error) {
      console.error('Error reading client settings', error)
      return null
    }
  },
})

export const useClientSettingsMutation = createMutation({
  mutationKey: ['updateClientSettings'],
  mutationFn: async (vars: ClientSettings, { client }) => {
    try {
      const queryKey = useClientSettingsQuery.getKey()
      const prevData = client.getQueryData(queryKey) ?? {}
      const nextData = { ...prevData, ...vars }
      window.localStorage.setItem(clientSettingsKey, JSON.stringify(nextData))
      client.setQueryData(queryKey, nextData)
      return nextData
    } catch (error) {
      throw new Error(`Error writing client settings: ${String(error)}`)
    }
  },
})
