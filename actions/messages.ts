'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const ConversationSchema = z.object({
  owner_id: z.string().uuid('Invalid owner'),
  business_id: z.string().uuid('Invalid business'),
})

export async function startConversation(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = ConversationSchema.safeParse({
    owner_id: formData.get('owner_id'),
    business_id: formData.get('business_id'),
  })
  if (!parsed.success) redirect('/marketplace')

  const { owner_id, business_id } = parsed.data

  if (user.id === owner_id) redirect('/dashboard/messages')

  // Check if this user already has a conversation about this listing
  const { data: existing } = await db
    .from('conversations')
    .select('id')
    .eq('listing_id', business_id)
    .contains('participant_ids', [user.id])
    .maybeSingle()

  if (existing) {
    redirect(`/dashboard/messages?conversation=${existing.id}`)
  }

  const { data: conversation, error } = await db
    .from('conversations')
    .insert({
      participant_ids: [user.id, owner_id],
      listing_id: business_id,
    })
    .select('id')
    .single()

  if (error || !conversation) redirect('/dashboard/messages')

  // fire-and-forget analytics
  db.rpc('increment_listing_stat', {
    p_business_id: business_id,
    p_stat: 'contact_clicks',
  })

  redirect(`/dashboard/messages?conversation=${conversation.id}`)
}
