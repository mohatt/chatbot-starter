'use client';

import { useRef, useState, ChangeEvent, FormEvent } from 'react';
import type { IngestResponse } from '../lib/types';

interface UploadFormProps {
  sessionId: string | null;
  onComplete: (payload: IngestResponse) => void;
}

const ACCEPTED_TYPES = '.pdf,.txt,.md,.docx';
const MAX_FILE_MB = 8;

export default function UploadForm({ sessionId, onComplete }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      setFiles([]);
      return;
    }
    const selected = Array.from(event.target.files);
    const oversized = selected.find((file) => file.size / 1024 / 1024 > MAX_FILE_MB);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the ${MAX_FILE_MB}MB limit.`);
      setFiles([]);
      return;
    }
    setError(null);
    setFiles(selected);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!files.length) {
      setError('Select at least one document to ingest.');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Upload failed');
      }

      const payload = (await response.json()) as IngestResponse;
      onComplete(payload);
      setStatus('success');
      setFiles([]);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div>
        <h2>Upload documents</h2>
        <p className="helper">PDF, DOCX, TXT, or Markdown — up to {MAX_FILE_MB}MB per file.</p>
      </div>

      <label className="file-input">
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={handleFileChange} />
        <span>{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Choose files'}</span>
      </label>

      {files.length > 0 && (
        <ul className="selected-files">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>{file.name}</li>
          ))}
        </ul>
      )}

      <button type="submit" disabled={status === 'uploading'}>
        {status === 'uploading' ? 'Processing…' : sessionId ? 'Add to session' : 'Create knowledge session'}
      </button>

      {status === 'success' && <p className="success">Files ingested. Ask away in the chat.</p>}
      {error && <p className="error">{error}</p>}
    </form>
  );
}
