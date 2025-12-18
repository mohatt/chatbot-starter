import { z } from 'zod'
import { PromptTemplate } from './template'

export const chatPrompt = new PromptTemplate({
  template: `You are a friendly conversational assistant.
Keep your responses human, concise, helpful and match the user’s tone. Respond in Markdown format if needed.
You have access to two tools (listFiles and queryFileContents), both of them use semantic vector similarity (cosine distance) to query a vector store of user-provided files.
[IMPORTANT !!!]
- If the user does not specify a file, search file metadata first to identify relevant files.
- When tool results are returned, analyze them before responding to the user.
- Don't mention internal details like file ids or search tools.
--
The user's time is {dateTime} ({timeZone}).
The user's location is {location}.
`,
  schema: z.object({
    timeZone: z.string(),
    location: z.string().nullish(),
  }),
  format: ({ timeZone, location }) => {
    return {
      timeZone,
      dateTime: new Date().toLocaleString('en-US', { timeZone }),
      location: location ?? 'Unknown',
    }
  }
})

export type ChatPromptVars = typeof chatPrompt.$inferInput

export const chatTitlePrompt = new PromptTemplate({
  template: `You will generate a short title based on the first message a user begins a conversation with.
[IMPORTANT !!!]
- ensure it is not more than {maxLength} characters long
- the title should be a summary of the user's message
- do not use quotes or colons
`,
  schema: z.object({
    maxLength: z.number().positive().int().min(10).max(100),
  }),
})

export type ChatTitlePromptVars = typeof chatTitlePrompt.$inferInput
