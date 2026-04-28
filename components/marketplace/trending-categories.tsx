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

// Per-category images. Files live in /public/images/categories/<slug>.jpg
// Add a slug here only when the matching file is committed.
const CATEGORY_IMAGES: Record<string, string> = {
  'ai-machine-learning':            '/images/categories/ai-machine-learning.jpg',
  'technology-software':            '/images/categories/technology-software.jpg',
  'web-app-development':            '/images/categories/web-app-development.jpg',
  'cybersecurity':                  '/images/categories/cybersecurity.jpg',
  'saas-software-products':         '/images/categories/saas-software-products.jpg',
  'legal-services':                 '/images/categories/legal-services.jpg',
  'consulting-advisory':            '/images/categories/consulting-advisory.jpg',
  'financial-services':             '/images/categories/financial-services.jpg',
  'investment-venture':             '/images/categories/investment-venture.jpg',
  'marketing-creative':             '/images/categories/marketing-creative.jpg',
  'media-entertainment':            '/images/categories/media-entertainment.jpg',
  'real-estate-property':           '/images/categories/real-estate-property.jpg',
  'manufacturing-industry':         '/images/categories/manufacturing-industry.jpg',
  'construction-trades':            '/images/categories/construction-trades.jpg',
  'logistics-transport':            '/images/categories/logistics-transport.jpg',
  'health-wellness':                '/images/categories/health-wellness.jpg',
  'education-training':             '/images/categories/education-training.jpg',
  'retail-ecommerce':               '/images/categories/retail-ecommerce.jpg',
  'hospitality-events':             '/images/categories/hospitality-events.jpg',
  'food-beverage':                  '/images/categories/food-beverage.jpg',
  'hr-staffing':                    '/images/categories/hr-staffing.jpg',
  'recruiting-talent':              '/images/categories/recruiting-talent.jpg',
  'environmental-sustainability':   '/images/categories/environmental-sustainability.jpg',
}

// Per-category one-liners for the hero & medium cards.
const CATEGORY_TAGLINES: Record<string, string> = {
  'ai-machine-learning':            'ML strategy, automation, and AI integration for modern operators.',
  'technology-software':            'Architecture, DevOps, and platform engineering.',
  'web-app-development':            'Full-stack engineering and product builds.',
  'cybersecurity':                  'Threat detection, audits, and compliance.',
  'saas-software-products':         'Vetted SaaS tooling for scaling teams.',
  'legal-services':                 'Complex structure, M&A, and cross-border protection for scaling entities.',
  'consulting-advisory':            'Strategy and operational transformation.',
  'financial-services':             'Capital, treasury, and financial structuring.',
  'investment-venture':             'Growth capital, VC, and strategic investors.',
  'marketing-creative':             'Growth, brand, and creative for founder-led businesses.',
  'media-entertainment':            'Content production, PR, and media partnerships.',
  'real-estate-property':           'Commercial leasing, asset management, and property advisory.',
  'manufacturing-industry':         'Industrial production, supply chain, and ops.',
  'construction-trades':            'Build-out, fitout, and infrastructure trades.',
  'logistics-transport':            'Freight, fulfillment, and last-mile logistics.',
  'health-wellness':                'Healthcare, wellness, and corporate wellbeing.',
  'education-training':             'Executive learning, L&D, and training programs.',
  'retail-ecommerce':               'DTC, marketplaces, and retail operations.',
  'hospitality-events':             'Venues, event production, and hospitality services.',
  'food-beverage':                  'F&B operators, catering, and beverage distribution.',
  'hr-staffing':                    'People ops, payroll, and outsourced HR.',
  'recruiting-talent':              'Executive search and talent acquisition.',
  'environmental-sustainability':   'ESG, carbon, and sustainable operations.',
}

// AI gets the hero slot when present; otherwise tech / advisory pick up.
const HERO_PRIORITY = [
  'ai-machine-learning',
  'technology-software',
  'web-app-development',
  'consulting-advisory',
]

const MEDIUM_PRIORITY = [
  'legal-services',
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

      <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-2 gap-3 h-auto md:h-[360px]">
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

        {/* Right column — two stacked small cards (full-height stretch) */}
        <div className="md:col-span-3 md:row-span-2 grid grid-rows-2 gap-3 h-full">
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
      className="group relative rounded-2xl overflow-hidden bg-card border border-border block min-h-[120px] h-full"
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
