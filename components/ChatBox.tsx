'use client';

import { ChangeEvent, FormEvent, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Streamdown } from 'streamdown';
import { generateUUID, fetchWithErrorHandlers, getTimeZone } from '@/lib/util'

interface ChatBoxProps {
  chatId?: string | null;
  history?: UIMessage[];
  isReady: boolean;
}

export default function ChatBox({ chatId, history, isReady }: ChatBoxProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const id = chatId ?? 'new'
  const { messages, setMessages, sendMessage, regenerate, status, error, clearError } = useChat({
    id,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: `/api/chat/${id}/chat`,
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest: (request) => {
        return {
          body: {
            message: request.messages.at(-1),
            timeZone: getTimeZone(),
            ...request.body
          },
        }
      }
    })
  });

  const resetState = useEffectEvent(() => {
    setLocalError(null);
    clearError();
    setMessages([]);
    setInput('');
  });

  useEffect(() => {
    resetState();
  }, [chatId]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!chatId || !text) return;
    try {
      await sendMessage({ text });
      setInput('');
      setLocalError(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  const disabled = !isReady || !chatId;
  const isLoading = status === 'submitted' || status === 'streaming';
  const allMessages = [...(history ?? []), ...messages]

  return (
    <div className="chat-box">
      <div className="chat-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h2>{disabled ? 'Upload to chat' : 'Ask anything about your doc'}</h2>
        </div>
        {chatId && <span className="badge subtle">Chat {chatId.slice(0, 6)}</span>}
      </div>

      <div className="chat-messages" ref={messagesRef}>
        {allMessages.length === 0 && (
          <div className="placeholder">
            <p>Once your document is processed you can ask grounded questions here.</p>
            <ul>
              <li>“Summarize the key points”</li>
              <li>“What does section 3 say about refunds?”</li>
              <li>“List the deadlines I should know”</li>
            </ul>
          </div>
        )}

        {allMessages.map((message) => (
          <div key={`message-${message.id}`} className={`bubble ${message.role}`}>
            <span className="role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
            <div className="message-markdown">
              {message.parts?.map((part, index) => {
                if (part.type === "text") {
                  return (
                    <div key={`message-${message.id}-part-${index}`}>
                      <Streamdown isAnimating={status === 'streaming'}>{part.text}</Streamdown>
                    </div>
                  )
                }
              })}
            </div>
          </div>
        ))}
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          name="prompt"
          placeholder={disabled ? 'Upload a file to enable chat' : 'Ask a question based on the document'}
          value={input}
          onChange={handleInputChange}
          disabled={disabled || isLoading}
        />
        <button type="submit" disabled={disabled || isLoading}>
          {isLoading ? 'Thinking…' : 'Send'}
        </button>
      </form>

      {(localError || error) && <p className="error">{localError ?? error?.message}</p>}
    </div>
  );
}
