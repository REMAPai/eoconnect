import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingForm } from '@/components/auth/onboarding-form'
import type { Profile } from '@/types/database'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, eo_chapter, eo_membership_type, country')
    .eq('id', user.id)
    .single() as { data: Pick<Profile, 'id' | 'full_name' | 'eo_chapter' | 'eo_membership_type' | 'country'> | null }

  // Already onboarded? Skip to business wizard or app.
  if (profile?.eo_membership_type && profile?.country) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: business } = await (supabase as any)
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
    redirect(business ? '/marketplace' : '/dashboard/business/new')
  }

  return (
    <OnboardingForm
      defaultName={profile?.full_name ?? user.user_metadata?.full_name ?? ''}
      defaultChapter={profile?.eo_chapter ?? ''}
      defaultMembershipType={profile?.eo_membership_type ?? ''}
      defaultCountry={profile?.country ?? ''}
    />
  )
}
