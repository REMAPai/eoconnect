import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountForm } from '@/components/forms/account-form'
import chaptersData from '@/lib/data/eo-chapters.json'
import type { Chapter } from '@/components/forms/chapter-picker'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

const CHAPTERS = chaptersData as Chapter[]

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, eo_chapter, eo_membership_type, linkedin_url')
    .eq('id', user.id)
    .single() as { data: (Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'eo_chapter' | 'eo_membership_type'> & { linkedin_url: string | null }) | null }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Members will see your photo, name, and EO tag on your business listings.
        </p>
      </div>
      <AccountForm
        chapters={CHAPTERS}
        currentAvatar={profile?.avatar_url ?? null}
        defaultName={profile?.full_name ?? ''}
        defaultChapter={profile?.eo_chapter ?? ''}
        defaultMembershipType={profile?.eo_membership_type ?? ''}
        defaultLinkedinUrl={profile?.linkedin_url ?? ''}
      />
    </div>
  )
}
