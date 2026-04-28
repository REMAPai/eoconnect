import { createClient } from '@/lib/supabase/server'
import { ReviewsModeration } from '@/components/admin/reviews-moderation'

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: reviews } = await db
    .from('reviews')
    .select('id, rating, body, flagged, created_at, business_id, businesses!business_id(name), profiles!reviewer_id(full_name)')
    .eq('flagged', true)
    .order('created_at', { ascending: false }) as {
      data: Array<{
        id: string
        rating: number
        body: string | null
        flagged: boolean
        created_at: string
        business_id: string
        businesses?: { name: string }
        profiles?: { full_name: string }
      }> | null
    }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Flagged Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reviews flagged by members. Review and unflag or delete.
        </p>
      </div>
      <ReviewsModeration reviews={reviews ?? []} />
    </div>
  )
}
