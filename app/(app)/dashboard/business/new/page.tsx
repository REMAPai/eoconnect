import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BusinessProfileWizard } from '@/components/forms/business-profile-wizard'

export default async function NewBusinessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: existing }, { data: categories }] = await Promise.all([
    db.from('businesses').select('id', { count: 'exact', head: false }).eq('owner_id', user.id),
    supabase.from('categories').select('id, name, slug, icon, sort_order').eq('active', true).order('sort_order'),
  ])

  const existingCount = (existing as Array<{ id: string }> | null)?.length ?? 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-2">
        {existingCount > 0 ? 'Add Another Business' : 'Create Your Business Profile'}
      </h1>
      <p className="text-muted-foreground text-center mb-8">
        {existingCount > 0
          ? `You already have ${existingCount} business${existingCount === 1 ? '' : 'es'} listed. This will be a new, separate listing.`
          : 'List your business in the Member Market marketplace and start getting discovered.'}
      </p>
      <BusinessProfileWizard categories={(categories ?? []) as import('@/types/database').Category[]} />
    </div>
  )
}
