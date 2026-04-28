'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { submitReview } from '@/actions/reviews'
import { cn } from '@/lib/utils'

interface ReviewFormProps {
  businessId: string
  existing?: { rating: number; body: string | null } | null
}

export function ReviewForm({ businessId, existing }: ReviewFormProps) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState(existing?.body ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (rating < 1) { setError('Please select a rating'); return }
    setError(null)
    setSuccess(false)
    const fd = new FormData()
    fd.set('business_id', businessId)
    fd.set('rating', String(rating))
    fd.set('body', body)
    startTransition(async () => {
      const result = await submitReview(fd)
      if (result.error) setError(result.error)
      else setSuccess(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="font-semibold">{existing ? 'Update your review' : 'Leave a review'}</h3>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && (
        <Alert className="border-primary/50 bg-primary/10">
          <AlertDescription className="text-primary font-medium">
            Review {existing ? 'updated' : 'submitted'}.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <p className="text-sm font-medium mb-2">Rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                className={cn(
                  'h-6 w-6 transition-colors',
                  n <= (hover || rating) ? 'fill-primary text-primary' : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Your review</p>
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share your experience working with this business (20-500 characters)…"
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1">{body.length}/500</p>
      </div>

      <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground font-bold">
        {isPending ? 'Submitting…' : existing ? 'Update Review' : 'Submit Review'}
      </Button>
    </form>
  )
}
