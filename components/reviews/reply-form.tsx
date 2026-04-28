'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { replyToReview } from '@/actions/reviews'

export function ReplyForm({ reviewId, existing }: { reviewId: string; existing: string | null }) {
  const [reply, setReply] = useState(existing ?? '')
  const [editing, setEditing] = useState(!existing)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-primary hover:underline mt-2"
      >
        Edit reply
      </button>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('review_id', reviewId)
    fd.set('reply', reply)
    startTransition(async () => {
      const result = await replyToReview(fd)
      if (result.error) setError(result.error)
      else setEditing(false)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <Textarea
        value={reply}
        onChange={e => setReply(e.target.value)}
        placeholder="Reply as the business owner…"
        rows={3}
        maxLength={500}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Reply'}
        </Button>
        {existing && (
          <Button type="button" size="sm" variant="outline" onClick={() => { setReply(existing); setEditing(false) }}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
