import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/marketplace/search-bar'
import { FilterPanel } from '@/components/marketplace/filter-panel'
import { ListingCard } from '@/components/marketplace/listing-card'
import { parseSearchQuery } from '@/lib/ai/parse-search'
import { pickAds } from '@/lib/ads/picker'
import { SponsoredCard } from '@/components/marketplace/sponsored-card'
import { Sparkles } from 'lucide-react'
import type { Business } from '@/types/database'

type SearchParams = {
  q?: string
  category?: string | string[]
  country?: string
  city?: string
  sort?: string
  smart?: string
}

interface SearchPageProps {
  searchParams: Promise<SearchParams>
}

async function SearchResults({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: categories } = await db
    .from('categories').select('*').eq('active', true).order('sort_order')

  const useSmart = params.smart === '1' && params.q && categories
  const parsed = useSmart
    ? await parseSearchQuery(params.q!, categories)
    : null

  const ftsTerm = parsed?.keywords?.trim() || params.q?.trim()
  const cityFilter = parsed?.city ?? params.city
  const ALLOWED_REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Africa', 'Latin America']
  const countryFilter = parsed?.country ?? params.country
  const urlSlugs = Array.isArray(params.category)
    ? params.category
    : params.category ? [params.category] : []
  const allSlugs = [...new Set([...urlSlugs, ...(parsed?.categorySlugs ?? [])])]
  const catIds = (allSlugs.length > 0 && categories)
    ? categories.filter((c: { slug: string; id: string }) => allSlugs.includes(c.slug)).map((c: { id: string }) => c.id)
    : []

  const buildBaseQuery = () => {
    let q = db.from('businesses').select('*').eq('status', 'published')
    if (cityFilter) q = q.ilike('city', `%${cityFilter}%`)
    if (countryFilter && (ALLOWED_REGIONS.includes(countryFilter) || parsed?.country)) {
      q = q.ilike('country', `%${countryFilter}%`)
    }
    if (catIds.length > 0) q = q.overlaps('category_ids', catIds)
    return q
  }

  // Two-pronged search:
  //  1. Full-text search on businesses (name/tagline/description/tags)
  //  2. ILIKE on services (title/description) → fetch parent businesses
  // Then merge, dedupe, and respect filters.
  const searches: Promise<{ data: Business[] | null }>[] = []

  let primaryQuery = buildBaseQuery()
  if (ftsTerm) {
    primaryQuery = primaryQuery.textSearch('search_vector', ftsTerm, { type: 'websearch', config: 'english' })
  }
  searches.push(primaryQuery.limit(50) as Promise<{ data: Business[] | null }>)

  if (ftsTerm) {
    // Find services matching the query, then businesses that own them.
    const escaped = ftsTerm.replace(/[%_]/g, m => '\\' + m)
    searches.push(
      (db.from('services')
        .select('business_id')
        .eq('status', 'published')
        .or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
        .limit(50) as Promise<{ data: Array<{ business_id: string }> | null }>)
        .then(async ({ data: svcRows }) => {
          if (!svcRows || svcRows.length === 0) return { data: [] as Business[] }
          const ids = [...new Set(svcRows.map(r => r.business_id))]
          return await buildBaseQuery().in('id', ids).limit(50) as { data: Business[] | null }
        })
    )
  }

  const settled = await Promise.all(searches)
  const seen = new Set<string>()
  const results: Business[] = []
  for (const r of settled) {
    for (const row of (r.data ?? [])) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        results.push(row)
      }
    }
  }

  const sort = params.sort ?? 'relevance'
  if (sort === 'alpha') {
    results.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'newest' || !ftsTerm) {
    results.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  }
  // (relevance order is preserved from the per-source FTS scoring naturally)

  // Pick sponsored ads to inject. Excludes the businesses that already appear organically.
  const organicBusinessIds = (results ?? []).map((b: Business) => b.id)
  const ads = await pickAds({
    query: params.q,
    categoryIds: parsed?.categorySlugs?.length
      ? categories?.filter((c: { slug: string; id: string }) => parsed.categorySlugs.includes(c.slug)).map((c: { id: string }) => c.id) ?? []
      : (allSlugs.length > 0
        ? categories?.filter((c: { slug: string; id: string }) => allSlugs.includes(c.slug)).map((c: { id: string }) => c.id) ?? []
        : []),
    city: parsed?.city ?? params.city ?? null,
    country: parsed?.country ?? params.country ?? null,
    page: 'search',
    limit: 2,
    excludeBusinessIds: organicBusinessIds,
  })

  // Fetch full business rows for sponsored ads
  let sponsoredBusinesses: Array<{ business: Business; campaignId: string }> = []
  if (ads.length > 0) {
    const { data: bizRows } = await db.from('businesses').select('*').in('id', ads.map(a => a.business_id)) as { data: Business[] | null }
    sponsoredBusinesses = ads
      .map(a => {
        const biz = (bizRows ?? []).find(b => b.id === a.business_id)
        return biz ? { business: biz, campaignId: a.id } : null
      })
      .filter((x): x is { business: Business; campaignId: string } => x !== null)
  }

  return (
    <div className="flex gap-8">
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-24 bg-card border border-border rounded-xl p-4">
          <Suspense fallback={null}>
            {categories && <FilterPanel categories={categories} />}
          </Suspense>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {parsed && (parsed.categorySlugs.length > 0 || parsed.city || parsed.country) && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium">AI understood:</span>{' '}
              {parsed.categorySlugs.length > 0 && (
                <span>{parsed.categorySlugs.join(', ')}</span>
              )}
              {parsed.city && <span> · in <span className="capitalize">{parsed.city}</span></span>}
              {parsed.country && <span> · {parsed.country}</span>}
              {parsed.keywords && <span> · &ldquo;{parsed.keywords}&rdquo;</span>}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{results?.length ?? 0}</span> results
            {params.q && <> for <span className="font-semibold text-foreground">&ldquo;{params.q}&rdquo;</span></>}
          </p>
        </div>
        {results && results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Sponsored injection: first ad at position 0, second ad at position 4 */}
            {(() => {
              const cards: React.ReactNode[] = []
              const organic = results as Business[]
              let organicIdx = 0
              for (let pos = 0; pos < organic.length + sponsoredBusinesses.length; pos++) {
                if (pos === 0 && sponsoredBusinesses[0]) {
                  cards.push(
                    <SponsoredCard
                      key={`spon-${sponsoredBusinesses[0].campaignId}`}
                      business={sponsoredBusinesses[0].business}
                      campaignId={sponsoredBusinesses[0].campaignId}
                      query={params.q}
                      page="search"
                    />
                  )
                } else if (pos === 4 && sponsoredBusinesses[1]) {
                  cards.push(
                    <SponsoredCard
                      key={`spon-${sponsoredBusinesses[1].campaignId}`}
                      business={sponsoredBusinesses[1].business}
                      campaignId={sponsoredBusinesses[1].campaignId}
                      query={params.q}
                      page="search"
                    />
                  )
                } else if (organic[organicIdx]) {
                  const b = organic[organicIdx]
                  cards.push(<ListingCard key={b.id} business={b} />)
                  organicIdx++
                }
              }
              return cards
            })()}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">🔍</p>
            <p className="font-semibold">No results found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different keyword or remove filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">
          {params.q ? `Results for "${params.q}"` : 'All Services'}
        </h1>
        <SearchBar defaultValue={params.q ?? ''} />
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading results…</div>}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
