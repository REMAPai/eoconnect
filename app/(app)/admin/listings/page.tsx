import { createClient } from '@/lib/supabase/server'
import { ListingsTable } from '@/components/admin/listings-table'

export default async function AdminListingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: businesses } = await db
    .from('businesses')
    .select('id, name, owner_id, status, city, country, created_at')
    .order('created_at', { ascending: false }) as {
      data: Array<{
        id: string
        name: string
        owner_id: string
        status: 'draft' | 'published' | 'paused'
        city: string | null
        country: string | null
        created_at: string
      }> | null
    }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Listings</h1>
        <p className="text-sm text-muted-foreground mt-1">All business listings on the platform.</p>
      </div>
      <ListingsTable listings={businesses ?? []} />
    </div>
  )
}
