'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name required'),
  eo_chapter: z.string().trim().min(1, 'EO chapter required'),
  eo_membership_type: z.enum(['current_member', 'alumni', 'accelerator']),
  country: z.string().trim().min(1, 'Country required'),
})

export async function updateProfile(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    eo_chapter: formData.get('eo_chapter'),
    eo_membership_type: formData.get('eo_membership_type'),
    country: formData.get('country'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let avatar_url: string | undefined
  try {
    const file = formData.get('avatar') as File | null
    if (file && file.size > 0) {
      avatar_url = await uploadFile('eoconnect-media', `avatars/${user.id}-${Date.now()}`, file)
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Avatar upload failed' }
  }

  const update: Record<string, unknown> = { ...parsed.data }
  if (avatar_url) update.avatar_url = avatar_url

  const { error } = await db.from('profiles').update(update).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/account')
  revalidatePath('/marketplace', 'layout')
  return { error: null }
}
