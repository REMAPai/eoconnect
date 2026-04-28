'use client'

import { useState, useTransition } from 'react'
import type { BackfillResult } from './actions'

interface Props {
  runBackfill: (key: string) => Promise<BackfillResult>
}

export function BackfillForm({ runBackfill }: Props) {
  const [key, setKey] = useState('')
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const r = await runBackfill(key)
      setResult(r)
    })
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #ccc',
    borderRadius: 6,
    fontFamily: 'monospace',
  }
  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: isPending ? '#999' : '#2d5a3d',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: isPending ? 'wait' : 'pointer',
    marginTop: 12,
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        SUPABASE_SERVICE_ROLE_KEY
      </label>
      <input
        type="password"
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="eyJhbGc…"
        style={fieldStyle}
        autoComplete="off"
      />
      <button type="submit" disabled={isPending || !key} style={buttonStyle}>
        {isPending ? 'Running…' : 'Run backfill (25 at a time)'}
      </button>

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 6,
            background: result.ok ? '#eaf3ee' : '#fce8e8',
            color: result.ok ? '#2d5a3d' : '#a00',
            fontSize: 14,
          }}
        >
          {result.message}
          {result.ok && typeof result.processed === 'number' && (
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
              processed: {result.processed} · remaining: {result.remaining}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
