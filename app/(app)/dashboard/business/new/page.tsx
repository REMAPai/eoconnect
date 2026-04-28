import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BusinessProfileWizard } from '@/components/forms/business-profile-wizard'

export default async function NewBusinessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: existing } = await db
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existing) redirect('/dashboard/business/edit')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, icon, sort_order')
    .eq('active', true)
    .order('sort_order')

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-2">Create Your Business Profile</h1>
      <p className="text-muted-foreground text-center mb-8">
        List your business in the Member Market marketplace and start getting discovered.
      </p>
      <BusinessProfileWizard categories={(categories ?? []) as import('@/types/database').Category[]} />
    </div>
  )
}
