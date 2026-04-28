import { Suspense } from 'react'
import { after } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/marketplace/search-bar'
import { FilterPanel } from '@/components/marketplace/filter-panel'
import { ListingCard } from '@/components/marketplace/listing-card'
import { getEmbedding } from '@/lib/ai/embeddings'
import { refreshBusinessEmbedding } from '@/lib/ai/refresh-business-embedding'
import { parseSearchQuery } from '@/lib/ai/parse-search'
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

  const ALLOWED_REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Africa', 'Latin America']
  const cityHard = params.city
  const countryHard = (params.country && ALLOWED_REGIONS.includes(params.country)) ? params.country : null
  const urlSlugs = Array.isArray(params.category)
    ? params.category
    : params.category ? [params.category] : []
  const hardCatIds: string[] = (urlSlugs.length > 0 && categories)
    ? categories.filter((c: { slug: string; id: string }) => urlSlugs.includes(c.slug)).map((c: { id: string }) => c.id)
    : []

  const buildBase = () => {
    let q = db.from('businesses').select('*').eq('status', 'published')
    if (cityHard) q = q.ilike('city', `%${cityHard}%`)
    if (countryHard) q = q.ilike('country', `%${countryHard}%`)
    if (hardCatIds.length > 0) q = q.overlaps('category_ids', hardCatIds)
    return q
  }

  let results: Business[] = []
  const queryText = params.q?.trim()
  const tierCounts: Record<string, number> = {}

  if (queryText) {
    // Parse the query with the AI to extract intent (categories + location).
    // We use the parsed signal to filter vector results — without it, vector
    // returns "any business that's vaguely Australian" for "real estate in
    // australia". Stays null if no OPENAI_API_KEY or if AI is uncertain.
    const parsed = categories ? await parseSearchQuery(queryText, categories) : null
    const parsedCatIds: string[] = (parsed?.categorySlugs.length && categories)
      ? categories.filter((c: { slug: string; id: string }) => parsed.categorySlugs.includes(c.slug)).map((c: { id: string }) => c.id)
      : []
    tierCounts.parsed_categories = parsedCatIds.length
    tierCounts.parsed_city = parsed?.city ? 1 : 0
    tierCounts.parsed_country = parsed?.country ? 1 : 0

    // ── Tier 1: Vector search (semantic) ──
    // Embed the AI-extracted keywords (or full query as fallback) — focused
    // text gives a tighter embedding than the raw user query.
    const embeddingText = parsed?.keywords?.trim() || queryText
    const queryEmbedding = await getEmbedding(embeddingText)
    tierCounts.embedding_ok = queryEmbedding ? 1 : 0
    if (queryEmbedding) {
      const { data: matches, error: rpcErr } = await db.rpc('search_businesses_by_embedding', {
        query_embedding: queryEmbedding,
        match_count: 50,
        // Raised from 0.20 (which let "ai consultancy" match real estate
        // searches because both are "Australian businesses"). 0.45 is a
        // pragmatic threshold for text-embedding-3-small cosine distance.
        min_similarity: 0.45,
      }) as { data: Array<{ id: string; similarity: number }> | null; error: { message: string } | null }
      if (rpcErr) tierCounts.vector_rpc_error = 1
      tierCounts.tier1_vector_raw = matches?.length ?? 0

      if (matches && matches.length > 0) {
        const orderedIds = matches.map(m => m.id)
        // Build the hydration query, layering AI-parsed filters on top of
        // the user's URL-explicit ones (buildBase already handles URL ones).
        let bizQuery = buildBase().in('id', orderedIds)
        if (parsedCatIds.length > 0) {
          bizQuery = bizQuery.overlaps('category_ids', parsedCatIds)
        }
        if (parsed?.city) bizQuery = bizQuery.ilike('city', `%${parsed.city}%`)
        if (parsed?.country) bizQuery = bizQuery.ilike('country', `%${parsed.country}%`)

        const { data: rows } = await bizQuery as { data: Business[] | null }
        const byId = new Map((rows ?? []).map(r => [r.id, r]))
        results = orderedIds.map(id => byId.get(id)).filter((b): b is Business => !!b)
        tierCounts.tier1_vector_filtered = results.length
      }
    }

    // ── Tier 2: Postgres full-text search ──
    if (results.length === 0) {
      const { data: rows } = await buildBase()
        .textSearch('search_vector', queryText, { type: 'websearch', config: 'english' })
        .limit(50) as { data: Business[] | null }
      tierCounts.tier2_fts = rows?.length ?? 0
      results = rows ?? []
    }

    // ── Tier 3: Plain ILIKE on business name/tagline/description ──
    if (results.length === 0) {
      const escaped = queryText.replace(/[%_\\]/g, m => '\\' + m)
      const { data: rows } = await buildBase()
        .or(`name.ilike.%${escaped}%,tagline.ilike.%${escaped}%,description.ilike.%${escaped}%`)
        .limit(50) as { data: Business[] | null }
      tierCounts.tier3_ilike_business = rows?.length ?? 0
      results = rows ?? []
    }

    // ── Tier 4: Services title/description match → parent business ──
    if (results.length === 0) {
      const escaped = queryText.replace(/[%_\\]/g, m => '\\' + m)
      const { data: svcRows } = await db.from('services')
        .select('business_id')
        .eq('status', 'published')
        .or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
        .limit(50) as { data: Array<{ business_id: string }> | null }
      tierCounts.tier4_services = svcRows?.length ?? 0
      if (svcRows && svcRows.length > 0) {
        const ids = [...new Set(svcRows.map(r => r.business_id))]
        const { data: rows } = await buildBase().in('id', ids).limit(50) as { data: Business[] | null }
        results = rows ?? []
      }
    }

    // Diagnostic: surfaces how many results each tier returned.
    // Helps debug "search returns 0" — usually means the user has no
    // PUBLISHED business or no embeddings populated yet.
    console.log('[search]', JSON.stringify({
      query: queryText,
      tiers: tierCounts,
      final: results.length,
      hardFilters: { city: cityHard, country: countryHard, categoryIds: hardCatIds.length },
    }))
  } else {
    // No query — list mode (newest first, respecting filters)
    const { data: rows } = await buildBase()
      .order('created_at', { ascending: false })
      .limit(50) as { data: Business[] | null }
    results = rows ?? []
  }

  // Sort overrides
  const sort = params.sort ?? 'relevance'
  if (sort === 'alpha') {
    results = [...results].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'newest') {
    results = [...results].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  }
  // 'relevance' keeps the embedding-similarity ordering.

  // Sponsored ads (excludes organic results)
  const organicBusinessIds = results.map((b) => b.id)
  const ads = await pickAds({
    query: queryText,
    categoryIds: hardCatIds,
    city: params.city ?? null,
    country: params.country ?? null,
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

  // ── Self-healing search ──
  // After the response is sent, populate embeddings for any business that
  // doesn't have one yet. Uses the service-role client so it bypasses RLS
  // and can update any row. Within a few searches all businesses end up
  // embedded, and from then on every search hits the fast vector path.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OPENAI_API_KEY) {
    after(async () => {
      try {
        const admin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminAny = admin as any
        const { data: missing } = await adminAny.rpc('businesses_missing_embeddings', { batch_size: 10 }) as {
          data: Array<{ id: string }> | null
        }
        for (const b of missing ?? []) {
          try { await refreshBusinessEmbedding(adminAny, b.id) } catch (err) { console.error('embed', b.id, err) }
        }
      } catch (err) {
        console.error('post-search backfill failed:', err)
      }
    })
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
            Showing <span className="font-semibold text-foreground">{results.length}</span> results
            {queryText && <> for <span className="font-semibold text-foreground">&ldquo;{queryText}&rdquo;</span></>}
          </p>
        </div>
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {(() => {
              const cards: React.ReactNode[] = []
              const organic = results
              let organicIdx = 0
              for (let pos = 0; pos < organic.length + sponsoredBusinesses.length; pos++) {
                if (pos === 0 && sponsoredBusinesses[0]) {
                  cards.push(
                    <SponsoredCard key={`spon-${sponsoredBusinesses[0].campaignId}`}
                      business={sponsoredBusinesses[0].business}
                      campaignId={sponsoredBusinesses[0].campaignId}
                      query={queryText} page="search" />
                  )
                } else if (pos === 4 && sponsoredBusinesses[1]) {
                  cards.push(
                    <SponsoredCard key={`spon-${sponsoredBusinesses[1].campaignId}`}
                      business={sponsoredBusinesses[1].business}
                      campaignId={sponsoredBusinesses[1].campaignId}
                      query={queryText} page="search" />
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
