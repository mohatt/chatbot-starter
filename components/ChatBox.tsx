'use client';

import { ChangeEvent, FormEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useChat, Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Streamdown } from 'streamdown';
import ReactMarkdown from 'react-markdown';

interface ChatBoxProps {
  sessionId: string | null;
  isReady: boolean;
}

export default function ChatBox({ sessionId, isReady }: ChatBoxProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const chat = useMemo(() => {
    return new Chat({
      id: sessionId ?? 'bootstrap',
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: sessionId ? { sessionId } : undefined
      }),
    });
  }, [sessionId]);

  const { messages, setMessages, sendMessage, status, error, clearError } = useChat({ chat });

  const resetSessionState = useEffectEvent(() => {
    setLocalError(null);
    clearError();
    setMessages([]);
    setInput('');
  });

  useEffect(() => {
    resetSessionState();
  }, [sessionId]);

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
    if (!sessionId || !text) return;
    try {
      await sendMessage({ text });
      setInput('');
      setLocalError(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  const disabled = !isReady || !sessionId;
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="chat-box">
      <div className="chat-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h2>{disabled ? 'Upload to chat' : 'Ask anything about your doc'}</h2>
        </div>
        {sessionId && <span className="badge subtle">Session {sessionId.slice(0, 6)}</span>}
      </div>

      <div className="chat-messages" ref={messagesRef}>
        {messages.length === 0 && (
          <div className="placeholder">
            <p>Once your document is processed you can ask grounded questions here.</p>
            <ul>
              <li>“Summarize the key points”</li>
              <li>“What does section 3 say about refunds?”</li>
              <li>“List the deadlines I should know”</li>
            </ul>
          </div>
        )}

        {messages.map((message) => (
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
