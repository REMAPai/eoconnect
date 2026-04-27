import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewListingClient } from './new-listing-client'

export default async function NewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: business } = await db
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/dashboard/business/new')

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-2">Add a Service</h1>
      <p className="text-muted-foreground text-center mb-8">
        List a service you offer to other members.
      </p>
      <NewListingClient businessId={business.id} />
    </div>
  )
}
