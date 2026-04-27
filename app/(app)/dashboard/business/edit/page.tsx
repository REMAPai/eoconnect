import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BusinessEditForm } from '@/components/forms/business-edit-form'
import type { Business, Category } from '@/types/database'

export default async function EditBusinessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: business }, { data: categories }] = await Promise.all([
    db.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
    db.from('categories').select('*').eq('active', true).order('sort_order'),
  ])

  if (!business) redirect('/dashboard/business/new')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Edit Business Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Changes go live immediately.</p>
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
