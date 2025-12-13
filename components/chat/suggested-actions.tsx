"use client";
import { motion } from "framer-motion";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { cn } from '@/lib/utils'
import type { UseChatResult } from './hooks'

export interface SuggestedActionsProps extends Pick<UseChatResult, 'sendMessage'> {
  chatId: string;
  className?: string;
}

export function SuggestedActions({ chatId, sendMessage, className }: SuggestedActionsProps) {
  const suggestedActions = [
    "What are the advantages of using Next.js?",
    "Write code to demonstrate Dijkstra's algorithm",
    "Help me write an essay about Silicon Valley",
    "What is the weather in San Francisco?",
  ];

  return (
    <div
      className={cn("grid w-full gap-2 sm:grid-cols-2", className)}
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={(suggestion) => {
              sendMessage({ text: suggestion });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

