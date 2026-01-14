import { z } from 'zod'
import { PromptTemplate } from './template'

export const chatPrompt = new PromptTemplate({
  template: `You are a friendly conversational assistant.
Keep your responses human, concise, helpful and match the user’s tone. Respond in Markdown format if needed.
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

export const projectChatPrompt = new PromptTemplate({
  template: `You are a friendly conversational assistant.
Keep your responses human, concise, helpful and match the user’s tone. Respond in Markdown format if needed.
This conversation was started in the context of the following user project:
- Project name: {projectName}
- Project instructions: {projectPrompt}
--
You have access to different tools that can help you access and search user files within the project:
- 'fileTextSearch' uses semantic vector similarity (cosine distance) to query a vector store of user files (images excluded).
- 'listFiles' can be used to list all files in the project.
- 'readFileText' can be used to extract text from a non-image file.
- 'readFile' can be used to read all file data for further analysis.

[IMPORTANT !!!]
- Follow the project instructions carefully.
- Always double-check file IDs to make sure they are correct before passing them to any tools.
- Always analyze the results you get from the tools before responding to the user.
- Don't mention internal details like file IDs, search tools or result scores when responding to the user.
--
The user's time is {dateTime} ({timeZone}).
The user's location is {location}.
`,
  schema: z.object({
    timeZone: z.string(),
    location: z.string().nullish(),
    projectName: z.string().nonempty(),
    projectPrompt: z.string().nullish(),
  }),
  format: ({ timeZone, location, projectName, projectPrompt }) => {
    return {
      timeZone,
      dateTime: new Date().toLocaleString('en-US', { timeZone }),
      location: location ?? 'Unknown',
      projectName,
      projectPrompt: projectPrompt ?? 'None',
    }
  }
})

export type ProjectChatPromptVars = typeof projectChatPrompt.$inferInput

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
