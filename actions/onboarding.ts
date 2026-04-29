'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const OnboardingSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name required'),
  eo_membership_type: z.enum(['current_member', 'alumni', 'accelerator'], {
    message: 'Select your EO membership type',
  }),
  eo_chapter: z.string().trim().min(1, 'EO chapter is required'),
  region: z.string().trim().min(1, 'Region is required'),
  chapter_country: z.string().trim().nullable().optional(),
  chapter_city: z.string().trim().nullable().optional(),
})

export async function completeOnboarding(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = OnboardingSchema.safeParse({
    full_name: formData.get('full_name'),
    eo_membership_type: formData.get('eo_membership_type'),
    eo_chapter: formData.get('eo_chapter'),
    region: formData.get('region'),
    chapter_country: formData.get('chapter_country') || null,
    chapter_city: formData.get('chapter_city') || null,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await db
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      eo_membership_type: parsed.data.eo_membership_type,
      eo_chapter: parsed.data.eo_chapter,
      region: parsed.data.region,
      chapter_country: parsed.data.chapter_country || null,
      chapter_city: parsed.data.chapter_city || null,
      // Keep legacy `country` text in sync for back-compat with old reads.
      country: parsed.data.chapter_country || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/onboarding')
  // Now send them to the business wizard — second step of onboarding.
  redirect('/dashboard/business/new')
}
