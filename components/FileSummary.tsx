'use client';

import type { IngestResponse } from '../lib/types';

interface Props {
  session: IngestResponse | null;
}

export default function FileSummary({ session }: Props) {
  if (!session) {
    return (
      <div className="file-summary">
        <p className="empty-state">No documents in memory yet. Upload one or more files to start a chat session.</p>
      </div>
    );
  }

  const { metadata } = session;
  const totalFiles = metadata.files.length;

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
          <dt>Total chunks</dt>
          <dd>{metadata.totalChunks}</dd>
        </div>
        <div>
          <dt>Approx. tokens</dt>
          <dd>{metadata.totalTokenEstimate.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Total size</dt>
          <dd>{(metadata.totalSize / 1024).toFixed(0)} KB</dd>
        </div>
      </dl>

      <ul className="ingested-files">
        {metadata.files.map((file) => (
          <li key={file.id}>
            <div>
              <strong>{file.fileName}</strong>
              <p>
                {(file.size / 1024).toFixed(0)} KB · {file.chunkCount} chunks · {file.tokenEstimate.toLocaleString()} tokens
              </p>
            </div>
            <span>{file.mimeType}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
