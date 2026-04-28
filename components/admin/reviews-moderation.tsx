'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { unflagReview, deleteReview } from '@/actions/admin'
import { format } from 'date-fns'

interface FlaggedReview {
  id: string
  rating: number
  body: string | null
  created_at: string
  business_id: string
  businesses?: { name: string }
  profiles?: { full_name: string }
}

export function ReviewsModeration({ reviews }: { reviews: FlaggedReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
        No flagged reviews.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
    </div>
  )
}

function ReviewCard({ review }: { review: FlaggedReview }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{review.profiles?.full_name ?? 'Member'}</p>
          <p className="text-xs text-muted-foreground">
            on{' '}
            <Link href={`/marketplace/${review.business_id}`} className="text-primary hover:underline">
              {review.businesses?.name ?? 'unknown listing'}
            </Link>
            {' · '}{format(new Date(review.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(n => (
            <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? 'fill-primary text-primary' : 'text-muted'}`} />
          ))}
        </div>
      </div>
      {review.body && <p className="text-sm">{review.body}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={isPending}
          onClick={() => startTransition(() => { unflagReview(review.id) })}>
          Unflag (keep)
        </Button>
        <Button size="sm" variant="outline" disabled={isPending}
          onClick={() => {
            if (confirm('Permanently delete this review?')) {
              startTransition(() => { deleteReview(review.id) })
            }
          }}
          className="text-destructive hover:text-destructive">
          Delete
        </Button>
      </div>
    </div>
  )
}
