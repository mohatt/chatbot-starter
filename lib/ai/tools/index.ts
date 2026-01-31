import { listFiles } from './list-files'
import { readFile } from './read-file'
import { readFileText } from './read-file-text'
import { fileTextSearch } from './file-text-search'
import { webSearch } from './web-search'
import type { InferUITools, ToolSet } from 'ai'
import type { ChatContext } from '../context'

export type ChatToolSet = ReturnType<typeof createChatTools>
export type ChatTools = InferUITools<ChatToolSet>

export function createChatTools(context: ChatContext) {
  return {
    ...listFiles(context),
    ...readFile(context),
    ...readFileText(context),
    ...fileTextSearch(context),
    ...webSearch(context),
  } satisfies ToolSet
}

export * from './list-files'
export * from './read-file'
export * from './read-file-text'
export * from './file-text-search'
export * from './web-search'
