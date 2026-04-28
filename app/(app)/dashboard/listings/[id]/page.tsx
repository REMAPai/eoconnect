import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditServiceForm } from './edit-service-form'
import type { Service } from '@/types/database'

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: service } = await db
    .from('services')
    .select('*, businesses!inner(owner_id)')
    .eq('id', id)
    .single()

  if (!service) notFound()

  if (service.businesses.owner_id !== user.id) {
    // Allow admins to edit any service
    const { data: me } = await db.from('profiles').select('role').eq('id', user.id).single() as {
      data: { role: 'member' | 'chapter_admin' | 'super_admin' } | null
    }
    if (!me || !['chapter_admin', 'super_admin'].includes(me.role)) {
      notFound()
    }
  }

  // Strip the joined data before passing to form
  const { businesses: _businesses, ...serviceData } = service as Service & { businesses: { owner_id: string } }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Edit Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Update your service details.</p>
      <EditServiceForm service={serviceData} />
    </div>
  )
}
