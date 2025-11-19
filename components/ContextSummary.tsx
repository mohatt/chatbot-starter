'use client';

import type { ChatRecord } from '@/lib/db';

interface ContextSummaryProps {
  chat: ChatRecord | null;
}

export default function ContextSummary({ chat }: ContextSummaryProps) {
  if (!chat) {
    return (
      <div className="file-summary">
        <p className="empty-state">No documents in memory yet. Upload one or more files to start a chat session.</p>
      </div>
    );
  }

  const { context } = chat;
  const totalFiles = context.files.length;

  return (
    <div className="file-summary">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Active Session</p>
          <h3>
            {totalFiles} file{totalFiles === 1 ? '' : 's'} loaded
          </h3>
        </div>
      </div>
      <dl>
        <div>
          <dt>Total vectors</dt>
          <dd>{context.vectors}</dd>
        </div>
        <div>
          <dt>Approx. tokens</dt>
          <dd>{context.tokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Total size</dt>
          <dd>{(context.size / 1024).toFixed(0)} KB</dd>
        </div>
      </dl>

      <ul className="ingested-files">
        {context.files.map((file) => (
          <li key={file.id}>
            <div>
              <strong>{file.name}</strong>
              <p>
                {(file.size / 1024).toFixed(0)} KB · {file.vectors} vectors · {file.tokens.toLocaleString()} tokens
              </p>
            </div>
            <span>{file.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
