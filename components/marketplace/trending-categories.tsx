import Link from 'next/link'
import { ArrowUpRight, TrendingUp } from 'lucide-react'
import type { Category } from '@/types/database'

/**
 * "Trending in EO" — featured category mosaic.
 *
 * Layout:
 *   ┌──────────────┬──────────┬─────────────┐
 *   │              │          │  smallTop   │
 *   │  hero (AI)   │  medium  ├─────────────┤
 *   │              │          │  smallBot   │
 *   └──────────────┴──────────┴─────────────┘
 *
 * Category images keyed by slug — fall back to gradient if not mapped.
 */

const CATEGORY_IMAGES: Record<string, string> = {
  'ai-machine-learning':       'https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'legal-services':            'https://images.pexels.com/photos/5668806/pexels-photo-5668806.jpeg?auto=compress&cs=tinysrgb&w=900',
  'professional-services':     'https://images.pexels.com/photos/5668806/pexels-photo-5668806.jpeg?auto=compress&cs=tinysrgb&w=900',
  'technology-software':       'https://images.pexels.com/photos/8386437/pexels-photo-8386437.jpeg?auto=compress&cs=tinysrgb&w=900',
  'web-app-development':       'https://images.pexels.com/photos/8386437/pexels-photo-8386437.jpeg?auto=compress&cs=tinysrgb&w=900',
  'cybersecurity':             'https://images.pexels.com/photos/8294619/pexels-photo-8294619.jpeg?auto=compress&cs=tinysrgb&w=900',
  'saas-software-products':    'https://images.pexels.com/photos/18799044/pexels-photo-18799044.jpeg?auto=compress&cs=tinysrgb&w=900',
  'marketing-creative':        'https://images.pexels.com/photos/7651801/pexels-photo-7651801.jpeg?auto=compress&cs=tinysrgb&w=600',
  'media-entertainment':       'https://images.pexels.com/photos/7688106/pexels-photo-7688106.jpeg?auto=compress&cs=tinysrgb&w=600',
  'financial-services':        'https://images.pexels.com/photos/4968632/pexels-photo-4968632.jpeg?auto=compress&cs=tinysrgb&w=600',
  'investment-venture':        'https://images.pexels.com/photos/6694866/pexels-photo-6694866.jpeg?auto=compress&cs=tinysrgb&w=600',
  'consulting-advisory':       'https://images.pexels.com/photos/7654189/pexels-photo-7654189.jpeg?auto=compress&cs=tinysrgb&w=600',
}

const CATEGORY_TAGLINES: Record<string, string> = {
  'ai-machine-learning':    'ML strategy, automation, and AI integration for modern operators.',
  'legal-services':         'Complex structure, M&A, and cross-border protection for scaling entities.',
  'professional-services':  'Trusted advisors across legal, accounting, and operations.',
  'technology-software':    'Architecture, DevOps, and platform engineering.',
  'marketing-creative':     'Growth, brand, and creative for founder-led businesses.',
  'financial-services':     'Capital, treasury, and financial structuring.',
  'consulting-advisory':    'Strategy and operational transformation.',
}

const HERO_PRIORITY = [
  'ai-machine-learning',
  'technology-software',
  'web-app-development',
  'consulting-advisory',
]

const MEDIUM_PRIORITY = [
  'legal-services',
  'professional-services',
  'consulting-advisory',
  'financial-services',
]

interface Props {
  categories: Pick<Category, 'id' | 'name' | 'slug' | 'icon'>[]
}

export function TrendingCategories({ categories }: Props) {
  const bySlug = new Map(categories.map(c => [c.slug, c]))

  const pickFirst = (slugs: string[]) => slugs.map(s => bySlug.get(s)).find(c => !!c)

  const hero = pickFirst(HERO_PRIORITY) ?? categories[0]
  const medium = pickFirst(MEDIUM_PRIORITY.filter(s => s !== hero?.slug)) ?? categories[1]
  const usedSlugs = new Set([hero?.slug, medium?.slug].filter(Boolean) as string[])
  const remaining = categories.filter(c => !usedSlugs.has(c.slug))
  const smallTop = remaining[0]
  const smallBottom = remaining[1]

  if (!hero) return null

  return (
    <section>
      <div className="flex items-end justify-between mb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Trending in EO
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Services with high adoption rates this quarter.</p>
        </div>
        <Link
          href="/marketplace/search"
          className="text-sm text-primary hover:underline whitespace-nowrap font-medium flex items-center gap-1"
        >
          View All Categories <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[400px] md:h-[360px]">
        {/* Hero — large left card */}
        <Link
          href={`/marketplace/search?category=${hero.slug}`}
          className="md:col-span-6 row-span-2 group relative rounded-2xl overflow-hidden bg-card border border-border block"
        >
          <CategoryImage slug={hero.slug} alt={hero.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-0 p-5 flex flex-col justify-end">
            <span className="self-start mb-3 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold tracking-wider">
              HIGH DEMAND
            </span>
            <h3 className="text-white font-bold text-xl">{hero.name}</h3>
            <p className="text-white/80 text-sm mt-1 max-w-md">
              {CATEGORY_TAGLINES[hero.slug] ?? `Top ${hero.name.toLowerCase()} services from EO members.`}
            </p>
            <div className="absolute bottom-5 right-5 h-9 w-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </Link>

        {/* Medium — middle card */}
        {medium && (
          <Link
            href={`/marketplace/search?category=${medium.slug}`}
            className="md:col-span-3 row-span-2 group relative rounded-2xl overflow-hidden bg-card border border-border block"
          >
            <CategoryImage slug={medium.slug} alt={medium.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-end">
              <h3 className="text-white font-bold text-lg">{medium.name}</h3>
              <p className="text-white/75 text-xs mt-0.5 line-clamp-2">
                {CATEGORY_TAGLINES[medium.slug] ?? medium.name}
              </p>
              <span className="text-primary text-xs font-semibold mt-2 group-hover:underline">
                Browse providers →
              </span>
            </div>
          </Link>
        )}

        {/* Right column — two stacked small cards */}
        <div className="md:col-span-3 grid grid-rows-2 gap-3">
          {smallTop && <SmallCard category={smallTop} />}
          {smallBottom && <SmallCard category={smallBottom} />}
        </div>
      </div>
    </section>
  )
}

function SmallCard({ category }: { category: Pick<Category, 'name' | 'slug' | 'icon'> }) {
  return (
    <Link
      href={`/marketplace/search?category=${category.slug}`}
      className="group relative rounded-2xl overflow-hidden bg-card border border-border block min-h-[120px]"
    >
      <CategoryImage slug={category.slug} alt={category.name} />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
      <div className="absolute inset-0 p-4 flex items-end justify-between gap-2">
        <h3 className="text-white font-semibold">{category.name}</h3>
        {category.icon && <span className="text-2xl drop-shadow">{category.icon}</span>}
      </div>
    </Link>
  )
}

function CategoryImage({ slug, alt }: { slug: string; alt: string }) {
  const url = CATEGORY_IMAGES[slug]
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
    )
  }
  return <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-card" />
}
