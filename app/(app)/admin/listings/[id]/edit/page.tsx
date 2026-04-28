import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BusinessEditForm } from '@/components/forms/business-edit-form'
import type { Business, Category } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditListingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: business }, { data: categories }] = await Promise.all([
    db.from('businesses').select('*, profiles!owner_id(full_name)').eq('id', id).maybeSingle(),
    db.from('categories').select('*').eq('active', true).order('sort_order'),
  ])

  if (!business) notFound()

  const ownerName = business.profiles?.full_name ?? 'Unknown owner'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/listings" className="text-xs text-muted-foreground hover:text-foreground inline-block mb-1">
            ← Back to listings
          </Link>
          <h1 className="text-2xl font-bold">Edit: {business.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Owned by <span className="text-foreground font-medium">{ownerName}</span> · admin override active
          </p>
        </div>
        <Link
          href={`/marketplace/${business.id}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0')}
        >
          View Listing
        </Link>
      </div>
      <BusinessEditForm
        business={business as Business}
        categories={(categories ?? []) as Category[]}
      />
    </div>
  )
}
