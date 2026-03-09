import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Suggestion } from '@/components/ai-elements/suggestion'
import { cn } from '@/lib/utils'
import type { UseChatResult } from './hooks'

export const ChatGreeting = () => {
  return (
    <>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='font-semibold text-xl md:text-2xl'
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.4 }}
      >
        Hello there!
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='text-xl text-zinc-500 md:text-2xl'
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        How can I help you today?
      </motion.div>
    </>
  )
}

const suggestions = [
  'What are the latest trends in AI?',
  'How does machine learning work?',
  'Explain quantum computing',
  'Best practices for React development',
  'Tell me about TypeScript benefits',
  'How to optimize database queries?',
  'What is the difference between SQL and NoSQL?',
  'Explain cloud computing basics',
  'What are the advantages of using Next.js?',
  "Write code to demonstrate Dijkstra's algorithm",
  'Help me write an essay about Silicon Valley',
]

export interface ChatSuggestionsProps extends Pick<UseChatResult, 'sendMessage'> {
  className?: string
}

export function ChatSuggestions({ sendMessage, className }: ChatSuggestionsProps) {
  const randomSuggestions = useRef(
    suggestions
      .slice()
      /* eslint-disable-next-line react-hooks/purity */
      .sort(() => Math.random() - 0.5)
      .slice(0, 4),
  )

  return (
    <div className={cn('grid w-full gap-3 sm:grid-cols-2', className)}>
      {randomSuggestions.current.map((suggestion, index) => (
        <motion.div
          key={suggestion}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.5 + 0.05 * index }}
        >
          <Suggestion
            className='h-auto w-full whitespace-normal p-3 text-left'
            suggestion={suggestion}
            onClick={(text) => {
              void sendMessage({
                parts: [{ type: 'text' as const, text }],
                metadata: { parentId: null },
              })
            }}
          >
            {suggestion}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  )
}
