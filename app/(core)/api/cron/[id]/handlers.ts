import type { Api } from '@/lib/api'

export const handlers = new Map<string, (api: Api) => Promise<void>>();

handlers.set('cleanup-orphan-files', async ({ db }) => {
  const files = await db.files.findMany({ orphan: true })
  console.log(`Cleaning up ${files.data.length} orphan files...`)
  // @todo implementation
})
