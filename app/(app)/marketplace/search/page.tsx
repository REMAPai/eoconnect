import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/marketplace/search-bar'
import { FilterPanel } from '@/components/marketplace/filter-panel'
import { ListingCard } from '@/components/marketplace/listing-card'

type SearchParams = {
  q?: string
  category?: string | string[]
  country?: string
  sort?: string
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

  let query = db
    .from('businesses')
    .select('*')
    .eq('status', 'published')

  if (params.q) {
    query = query.textSearch('search_vector', params.q, { type: 'websearch', config: 'english' })
  }

  const ALLOWED_REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Africa', 'Latin America']
  if (params.country && ALLOWED_REGIONS.includes(params.country)) {
    query = query.eq('country', params.country)
  }

  const categorySlugs = Array.isArray(params.category)
    ? params.category
    : params.category ? [params.category] : []

  if (categorySlugs.length > 0 && categories) {
    const catIds = categories
      .filter((c: { slug: string; id: string }) => categorySlugs.includes(c.slug))
      .map((c: { id: string }) => c.id)
    if (catIds.length > 0) {
      query = query.overlaps('category_ids', catIds)
    }
  }

  const sort = params.sort ?? 'relevance'
  if (sort === 'newest') query = query.order('created_at', { ascending: false })
  else if (sort === 'alpha') query = query.order('name')
  else if (!params.q) query = query.order('created_at', { ascending: false })
  // when q is present and sort=relevance, let Postgres order by ts_rank

  const { data: results } = await query.limit(50)

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
            {results.map((b: Parameters<typeof ListingCard>[0]['business']) => (
              <ListingCard key={b.id} business={b} />
            ))}
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
