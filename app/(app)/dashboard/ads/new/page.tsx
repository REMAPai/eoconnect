import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CampaignBuilder } from '@/components/ads/campaign-builder'
import { ADS_ENABLED } from '@/lib/feature-flags'
import type { Category } from '@/types/database'

export default async function NewCampaignPage() {
  if (!ADS_ENABLED) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: business }, { data: categories }] = await Promise.all([
    db.from('businesses').select('id, name, status, category_ids, tags').eq('owner_id', user.id).maybeSingle(),
    db.from('categories').select('*').eq('active', true).order('sort_order'),
  ])

  if (!business) redirect('/dashboard/business/new')
  if (business.status !== 'published') redirect('/dashboard/listings')

  const stripeReady = !!process.env.STRIPE_SECRET_KEY

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Launch a Campaign</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Reach EO members searching for what you offer. Pay only when they click.
        </p>
      </div>
      <CampaignBuilder
        categories={(categories ?? []) as Category[]}
        defaultCategoryIds={business.category_ids ?? []}
        defaultKeywords={(business.tags ?? []).slice(0, 5).join(', ')}
        stripeEnabled={stripeReady}
      />
    </div>
  )
}
