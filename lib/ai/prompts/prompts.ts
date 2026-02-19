import { PromptTemplate } from './template'
import type { ChatContext } from '../context'

export type ChatPromptInput = Pick<ChatContext, 'location' | 'timeZone'>

export const chatPrompt = new PromptTemplate<ChatPromptInput>({
  template: `You are a friendly conversational assistant.
Keep your responses human, concise, helpful and match the user’s tone. Respond in Markdown format if needed.
You have access to different tools that can help you access and search files attached to user messages.
Use citations to back up your answer.
--
The user's time is {{ dateTime }} ({{ timeZone }}).
The user's location is {{ location }}.
`,
  format: ({ timeZone, location }) => {
    const { city, country } = location ?? {}
    return {
      timeZone,
      dateTime: new Date().toLocaleString('en-US', { timeZone }),
      location: city && country ? `${city}, ${country}` : 'Unknown',
    }
  },
})

export type ProjectChatPromptInput = Pick<
  ChatContext,
  'location' | 'timeZone' | 'project' | 'projectFiles'
>

export const projectChatPrompt = new PromptTemplate<ProjectChatPromptInput>({
  template: `You are a friendly conversational assistant.
Keep your responses human, concise, helpful and match the user’s tone. Respond in Markdown format if needed.
This conversation was started in the context of the following user project:
- Project name: {{ projectName }}
- Project instructions: {{ projectPrompt }}
{% if projectFiles %}
- User has uploaded {{ projectFiles }} to the project
{% endif %}
--
You have access to different tools that can help you list, access and search user files within the project.
Those tools can also be used on the files that might be attached to user messages.

[IMPORTANT !!!]
- Follow the project instructions carefully.
- If it isn't clear which file ID the user is referring to, call 'list_files' tool first.
- Always double-check file IDs to make sure they are correct before passing them to any tools.
- Always analyze the results you get from the tools before responding to the user.
- Don't mention internal details like file IDs, search tools or result scores when responding to the user.
- Use citations to back up your answer.
--
The user's time is {{ dateTime }} ({{ timeZone }}).
The user's location is {{ location }}.
`,
  format: ({ timeZone, location, project, projectFiles }) => {
    const { city, country } = location ?? {}
    const { name, prompt } = project!
    return {
      timeZone,
      dateTime: new Date().toLocaleString('en-US', { timeZone }),
      location: city && country ? `${city}, ${country}` : 'Unknown',
      projectName: name,
      projectPrompt: prompt || 'None',
      projectFiles: projectFiles ? `${projectFiles} file${projectFiles === 1 ? '' : 's'}` : null,
    }
  },
})

export interface ChatTitlePromptInput {
  message: string
  maxLength: number
}

export const chatTitlePrompt = new PromptTemplate<ChatTitlePromptInput>({
  template: `Generate a short conversation title based ONLY on the user's first message.
[IMPORTANT !!!]
- Ensure it is not more than {{ maxLength }} characters long
- Avoid filler nouns like conversation, discussion, chat or thread
- Avoid using quotes, colons or any title formatting
--
User message:
{{ message }}
`,
})
