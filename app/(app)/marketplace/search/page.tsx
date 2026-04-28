import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/marketplace/search-bar'
import { FilterPanel } from '@/components/marketplace/filter-panel'
import { ListingCard } from '@/components/marketplace/listing-card'
import { parseSearchQuery } from '@/lib/ai/parse-search'
import { rerankResults, type RerankCandidate } from '@/lib/ai/rerank-results'
import { pickAds } from '@/lib/ads/picker'
import { SponsoredCard } from '@/components/marketplace/sponsored-card'
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
  const ALLOWED_REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Africa', 'Latin America']

  // ── HARD filters (user-explicit, from filter sidebar / URL) ──
  const cityHard = params.city
  const countryHard = (params.country && ALLOWED_REGIONS.includes(params.country)) ? params.country : null
  const urlSlugs = Array.isArray(params.category)
    ? params.category
    : params.category ? [params.category] : []
  const hardCatIds: string[] = (urlSlugs.length > 0 && categories)
    ? categories.filter((c: { slug: string; id: string }) => urlSlugs.includes(c.slug)).map((c: { id: string }) => c.id)
    : []

  // ── SOFT hints (AI-extracted from natural language) ──
  // Used to broaden the candidate pool (UNION), NOT as filters that exclude.
  // The LLM re-ranker handles relevance using location/category context naturally.
  const aiCatIds: string[] = (parsed?.categorySlugs.length && categories)
    ? categories.filter((c: { slug: string; id: string }) => parsed.categorySlugs.includes(c.slug)).map((c: { id: string }) => c.id)
    : []

  // Base query enforces ONLY hard URL-explicit filters.
  const buildBase = () => {
    let q = db.from('businesses').select('*').eq('status', 'published')
    if (cityHard) q = q.ilike('city', `%${cityHard}%`)
    if (countryHard) q = q.ilike('country', `%${countryHard}%`)
    if (hardCatIds.length > 0) q = q.overlaps('category_ids', hardCatIds)
    return q
  }

  // ── Gather candidates from multiple sources, then merge ──
  const candidatePromises: Promise<{ data: Business[] | null }>[] = []

  // 1. Full-text search on businesses (name/tagline/description/tags)
  if (ftsTerm) {
    candidatePromises.push(
      buildBase().textSearch('search_vector', ftsTerm, { type: 'websearch', config: 'english' }).limit(30) as Promise<{ data: Business[] | null }>
    )
  }

  // 2. Services keyword match → parent businesses
  if (ftsTerm) {
    const escaped = ftsTerm.replace(/[%_]/g, m => '\\' + m)
    candidatePromises.push(
      (db.from('services')
        .select('business_id')
        .eq('status', 'published')
        .or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
        .limit(30) as Promise<{ data: Array<{ business_id: string }> | null }>)
        .then(async ({ data: svcRows }) => {
          if (!svcRows || svcRows.length === 0) return { data: [] as Business[] }
          const ids = [...new Set(svcRows.map(r => r.business_id))]
          return await buildBase().in('id', ids).limit(30) as { data: Business[] | null }
        })
    )
  }

  // 3. AI-suggested categories — broadens beyond keyword overlap
  if (aiCatIds.length > 0) {
    candidatePromises.push(
      buildBase().overlaps('category_ids', aiCatIds).limit(30) as Promise<{ data: Business[] | null }>
    )
  }

  // 4. No query at all → list mode
  if (!ftsTerm && aiCatIds.length === 0) {
    candidatePromises.push(
      buildBase().order('created_at', { ascending: false }).limit(50) as Promise<{ data: Business[] | null }>
    )
  }

  const settled = await Promise.all(candidatePromises)
  const seen = new Set<string>()
  const candidates: Business[] = []
  for (const r of settled) {
    for (const row of (r.data ?? [])) {
      if (!seen.has(row.id)) { seen.add(row.id); candidates.push(row) }
    }
  }
  // Cap candidate set so LLM cost stays bounded.
  const topCandidates = candidates.slice(0, 30)

  // ── Fetch services for candidates so the LLM has full context ──
  const servicesByBusiness = new Map<string, string[]>()
  if (topCandidates.length > 0 && useSmart && params.q) {
    const { data: svcs } = await db
      .from('services')
      .select('business_id, title, description')
      .in('business_id', topCandidates.map(c => c.id))
      .eq('status', 'published') as { data: Array<{ business_id: string; title: string; description: string | null }> | null }
    for (const s of svcs ?? []) {
      const list = servicesByBusiness.get(s.business_id) ?? []
      if (list.length < 5) {
        list.push(s.description ? `${s.title}: ${s.description.slice(0, 100)}` : s.title)
        servicesByBusiness.set(s.business_id, list)
      }
    }
  }

  // ── Semantic re-rank with the LLM (only when smart=1 and we have a query) ──
  let results: Business[] = topCandidates
  if (useSmart && params.q && topCandidates.length > 0) {
    const rerankInput: RerankCandidate[] = topCandidates.map(c => ({
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      description: c.description,
      city: c.city,
      country: c.country,
      services: servicesByBusiness.get(c.id) ?? [],
    }))
    const scores = await rerankResults(params.q, rerankInput)
    const RELEVANCE_FLOOR = 0.2
    results = topCandidates
      .map(c => ({ business: c, score: scores.get(c.id) ?? 0 }))
      .filter(r => r.score >= RELEVANCE_FLOOR)
      .sort((a, b) => b.score - a.score)
      .map(r => r.business)
  } else {
    // No smart re-rank — keep original order, with sort overrides
    const sort = params.sort ?? 'relevance'
    if (sort === 'alpha') {
      results.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'newest' || !ftsTerm) {
      results.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    }
  }

  // ── Sponsored ad injection (excludes organic results) ──
  const organicBusinessIds = results.map((b: Business) => b.id)
  const ads = await pickAds({
    query: params.q,
    categoryIds: aiCatIds.length > 0 ? aiCatIds : hardCatIds,
    city: parsed?.city ?? params.city ?? null,
    country: parsed?.country ?? params.country ?? null,
    page: 'search',
    limit: 2,
    excludeBusinessIds: organicBusinessIds,
  })

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
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{results?.length ?? 0}</span> results
            {params.q && <> for <span className="font-semibold text-foreground">&ldquo;{params.q}&rdquo;</span></>}
          </p>
        </div>
        {results && results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
