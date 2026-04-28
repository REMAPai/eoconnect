import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/marketplace/search-bar'
import { CategoryGrid } from '@/components/marketplace/category-grid'
import { ListingCard } from '@/components/marketplace/listing-card'
import { SponsoredCard } from '@/components/marketplace/sponsored-card'
import { pickAds } from '@/lib/ads/picker'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Business } from '@/types/database'

export default async function MarketplacePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: categories }, { data: recent }] = await Promise.all([
    db.from('categories').select('*').eq('active', true).order('sort_order'),
    db.from('businesses')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  // One sponsored slot at position 0 of "Recently Listed"
  const recentBusinessIds = (recent ?? []).map((b: Business) => b.id)
  const ads = await pickAds({ page: 'marketplace', limit: 1, excludeBusinessIds: recentBusinessIds })
  let sponsored: { business: Business; campaignId: string } | null = null
  if (ads.length > 0) {
    const { data: bizRows } = await db.from('businesses').select('*').eq('id', ads[0].business_id).maybeSingle() as { data: Business | null }
    if (bizRows) sponsored = { business: bizRows, campaignId: ads[0].id }
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-8">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
          Exclusive to EO Members
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Find trusted member<br />services for your business
        </h1>
        <div className="flex justify-center mt-6">
          <SearchBar />
        </div>
        {categories && (
          <div className="flex items-center gap-2 justify-center flex-wrap mt-4 text-sm text-muted-foreground">
            {categories.slice(0, 5).map((cat: { id: string; slug: string; name: string }) => (
              <Link key={cat.id} href={`/marketplace/search?category=${cat.slug}`}
                className="hover:text-primary transition-colors">
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Browse by Category</h2>
        </div>
        {categories && <CategoryGrid categories={categories} />}
      </section>

      {/* Listings — sponsored injection added in P4-T6 */}
      {recent && recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recently Listed</h2>
            <Link href="/marketplace/search?sort=newest" className="text-sm text-primary hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sponsored && (
              <SponsoredCard
                business={sponsored.business}
                campaignId={sponsored.campaignId}
                page="marketplace"
              />
            )}
            {recent.map((b: Parameters<typeof ListingCard>[0]['business']) => (
              <ListingCard key={b.id} business={b} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="bg-card border border-border rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold mb-2">List Your Business</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
          Reach the global EO network. Put your services in front of thousands of high-performing founders.
        </p>
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-1.5"><span className="text-primary">✓</span> EO Member Verification</span>
          <span className="flex items-center gap-1.5"><span className="text-primary">✓</span> Founder-to-Founder Leads</span>
          <span className="flex items-center gap-1.5"><span className="text-primary">✓</span> Zero Transaction Fees</span>
        </div>
        <Link
          href="/dashboard/business/new"
          className={cn(buttonVariants(), 'bg-primary text-primary-foreground font-bold')}
        >
          Apply for Listing
        </Link>
      </section>
    </div>
  )
}
