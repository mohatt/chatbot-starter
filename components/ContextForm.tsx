'use client'

import { useRef, useState, ChangeEvent, FormEvent } from 'react'
import type { ChatRecord } from '@/lib/db'

interface ContextFormProps {
  chatId?: string | null
  loading?: boolean
  error?: string
  onComplete: (payload: ChatRecord) => void
}

const ACCEPTED_TYPES = '.pdf,.txt,.md,.docx'
const MAX_FILE_MB = 8

export default function ContextForm(props: ContextFormProps) {
  const { chatId, onComplete } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      setFiles([])
      return
    }
    const selected = Array.from(event.target.files)
    const oversized = selected.find((file) => file.size / 1024 / 1024 > MAX_FILE_MB)
    if (oversized) {
      setError(`"${oversized.name}" exceeds the ${MAX_FILE_MB}MB limit.`)
      setFiles([])
      return
    }
    setError(null)
    setFiles(selected)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!files.length) {
      setError('Select at least one document to ingest.')
      return
    }

    setStatus('uploading')
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      if (chatId) {
        formData.append('sessionId', chatId)
      }

      const response = await fetch(`/api/chat/${chatId ?? 'new'}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Upload failed')
      }

      const payload = (await response.json()) as ChatRecord
      onComplete(payload)
      setStatus('success')
      setFiles([])
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      if (!chatId) {
        window.history.pushState({}, '', `/chat/${payload.id}`)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const errorText = props.error || error
  const pendingText = props.loading ? 'Loading…' : status === 'uploading' ? 'Processing…' : null
  const isPending = !!pendingText

  return (
    <form className='upload-form' onSubmit={handleSubmit}>
      <div>
        <h2>Upload documents</h2>
        <p className='helper'>PDF, DOCX, TXT, or Markdown — up to {MAX_FILE_MB}MB per file.</p>
      </div>

      <label className='file-input'>
        <input
          ref={inputRef}
          type='file'
          disabled={isPending}
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileChange}
        />
        <span>
          {files.length
            ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
            : 'Choose files'}
        </span>
      </label>

      {files.length > 0 && (
        <ul className='selected-files'>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>{file.name}</li>
          ))}
        </ul>
      )}

      <button type='submit' disabled={isPending}>
        {isPending ? pendingText : chatId ? 'Add to session' : 'Create knowledge session'}
      </button>

      {status === 'success' && <p className='success'>Files ingested. Ask away in the chat.</p>}
      {errorText && <p className='error'>{errorText}</p>}
    </form>
  )
}
