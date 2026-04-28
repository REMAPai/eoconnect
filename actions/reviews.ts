'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ReviewSchema = z.object({
  business_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(20, 'Review must be at least 20 characters').max(500, 'Max 500 characters'),
})

const ReplySchema = z.object({
  review_id: z.string().uuid(),
  reply: z.string().trim().min(1).max(500),
})

export async function submitReview(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ReviewSchema.safeParse({
    business_id: formData.get('business_id'),
    rating: formData.get('rating'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await db.from('reviews').upsert(
    {
      business_id: parsed.data.business_id,
      reviewer_id: user.id,
      rating: parsed.data.rating,
      body: parsed.data.body,
    },
    { onConflict: 'business_id,reviewer_id' }
  )

  if (error) return { error: error.message }
  revalidatePath(`/marketplace/${parsed.data.business_id}`)
  return { error: null }
}

export async function replyToReview(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ReplySchema.safeParse({
    review_id: formData.get('review_id'),
    reply: formData.get('reply'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: review } = await db
    .from('reviews')
    .select('business_id, business:businesses!business_id(owner_id)')
    .eq('id', parsed.data.review_id)
    .single() as { data: { business_id: string; business: { owner_id: string } } | null }

  if (!review || review.business.owner_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await db
    .from('reviews')
    .update({ owner_reply: parsed.data.reply })
    .eq('id', parsed.data.review_id)

  if (error) return { error: error.message }
  revalidatePath(`/marketplace/${review.business_id}`)
  return { error: null }
}

export async function flagReview(reviewId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await db.from('reviews').update({ flagged: true }).eq('id', reviewId)
  if (error) return { error: error.message }
  return { error: null }
}
