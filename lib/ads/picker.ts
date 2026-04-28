import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

/**
 * The smart ad picker.
 *
 * Score formula:
 *   score = bid_cpc × ctr_posterior × semantic_relevance × personalization × pacing × frequency
 *
 *   - bid_cpc: how much the advertiser pays per click
 *   - ctr_posterior: Beta(α, β) sampled mean → bandit-like exploration
 *   - semantic_relevance: 0..1 from LLM scoring query vs campaign keywords/categories
 *   - personalization: 1.0 + small bonus if user has viewed matching categories recently
 *   - pacing: 1.0 if today's spend < daily_pacing_cap else 0
 *   - frequency: 0 if user has seen this ad >= 3 times in current session
 *
 * Returns 0..N picked campaigns, ordered by score desc.
 */

export interface PickerContext {
  query?: string
  categoryIds?: string[]
  city?: string | null
  country?: string | null
  page: 'search' | 'marketplace' | 'category' | 'listing'
  limit?: number
  excludeBusinessIds?: string[]
}

export interface PickedAd {
  id: string
  business_id: string
  business_name: string
  business_logo_url: string | null
  bid_cpc: number
  format: 'banner' | 'sponsored_listing'
  goal: string | null
  semantic_score: number
}

interface CampaignRow {
  id: string
  business_id: string
  goal: string | null
  format: 'banner' | 'sponsored_listing'
  target_category_ids: string[] | null
  target_keywords: string[] | null
  budget_total: number | null
  budget_daily: number | null
  daily_pacing_cap: number | null
  spend_to_date: number
  bid_cpc: number
  ctr_alpha: number
  ctr_beta: number
  start_date: string | null
  end_date: string | null
  status: string
  business: { id: string; name: string; logo_url: string | null; status: string; city: string | null; country: string | null }
}

// in-memory cache keyed by stable query hash → semantic scores. 5-minute TTL.
const SCORE_CACHE = new Map<string, { ts: number; scores: Record<string, number> }>()
const SCORE_TTL_MS = 5 * 60 * 1000

export async function pickAds(ctx: PickerContext): Promise<PickedAd[]> {
  const limit = ctx.limit ?? 2
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date().toISOString().split('T')[0]

  // 1. Fetch eligible candidates
  let q = db
    .from('ad_campaigns')
    .select(`
      id, business_id, goal, format, target_category_ids, target_keywords,
      budget_total, budget_daily, daily_pacing_cap, spend_to_date,
      bid_cpc, ctr_alpha, ctr_beta, start_date, end_date, status,
      business:businesses!business_id (id, name, logo_url, status, city, country)
    `)
    .eq('status', 'active')

  const { data: candidates } = (await q) as { data: CampaignRow[] | null }
  if (!candidates || candidates.length === 0) return []

  // Eligibility filters (post-fetch, since RLS already constrains)
  const eligible = candidates.filter(c => {
    if (c.business?.status !== 'published') return false
    if (ctx.excludeBusinessIds?.includes(c.business_id)) return false
    if (c.budget_total != null && c.spend_to_date >= c.budget_total) return false
    if (c.start_date && c.start_date > today) return false
    if (c.end_date && c.end_date < today) return false
    return true
  })
  if (eligible.length === 0) return []

  // 2. Pacing check: skip campaigns that have already burned today's pacing cap
  const pacingCheckIds = eligible.filter(c => c.daily_pacing_cap != null).map(c => c.id)
  let todaySpendByCampaign: Record<string, number> = {}
  if (pacingCheckIds.length > 0) {
    const { data: spendRows } = await db
      .from('ad_events')
      .select('campaign_id, cost')
      .in('campaign_id', pacingCheckIds)
      .eq('event_type', 'click')
      .gte('created_at', `${today}T00:00:00Z`) as { data: Array<{ campaign_id: string; cost: number }> | null }
    for (const row of spendRows ?? []) {
      todaySpendByCampaign[row.campaign_id] = (todaySpendByCampaign[row.campaign_id] ?? 0) + Number(row.cost)
    }
  }
  const paced = eligible.filter(c => {
    if (c.daily_pacing_cap == null) return true
    return (todaySpendByCampaign[c.id] ?? 0) < Number(c.daily_pacing_cap)
  })
  if (paced.length === 0) return []

  // 3. Frequency cap: in last 24h, has the user seen this campaign >= 3 times?
  const blockedIds = new Set<string>()
  if (user) {
    const { data: recent } = await db
      .from('ad_events')
      .select('campaign_id')
      .eq('user_id', user.id)
      .eq('event_type', 'impression')
      .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
      .in('campaign_id', paced.map(c => c.id)) as { data: Array<{ campaign_id: string }> | null }
    const counts: Record<string, number> = {}
    for (const r of recent ?? []) counts[r.campaign_id] = (counts[r.campaign_id] ?? 0) + 1
    for (const [id, n] of Object.entries(counts)) if (n >= 3) blockedIds.add(id)
  }
  const fresh = paced.filter(c => !blockedIds.has(c.id))
  if (fresh.length === 0) return []

  // 4. Semantic relevance — LLM scoring (cached). Only if there's a query to match against.
  const semanticScores = await computeSemanticScores(ctx, fresh)

  // 5. Personalization: small bonus for ads matching user's recent category views
  let userCategoryWeights: Record<string, number> = {}
  if (user) {
    const { data: profile } = await db
      .from('ad_user_profile')
      .select('category_views')
      .eq('user_id', user.id)
      .maybeSingle() as { data: { category_views: Record<string, number> } | null }
    userCategoryWeights = profile?.category_views ?? {}
  }

  // 6. Score each campaign
  const scored = fresh.map(c => {
    const ctr = sampleBeta(c.ctr_alpha, c.ctr_beta)
    const semantic = semanticScores[c.id] ?? 0.5 // neutral when no query
    const personalizationBonus = personalizationScore(c.target_category_ids ?? [], userCategoryWeights)
    const score = Number(c.bid_cpc) * ctr * (0.3 + 0.7 * semantic) * personalizationBonus
    return { campaign: c, score, semantic }
  }).sort((a, b) => b.score - a.score)

  // 7. Drop ads with near-zero relevance — never inject totally irrelevant ads
  const top = scored.filter(s => s.semantic >= 0.15).slice(0, limit)
  if (top.length === 0) return []

  return top.map(s => ({
    id: s.campaign.id,
    business_id: s.campaign.business_id,
    business_name: s.campaign.business.name,
    business_logo_url: s.campaign.business.logo_url,
    bid_cpc: Number(s.campaign.bid_cpc),
    format: s.campaign.format,
    goal: s.campaign.goal,
    semantic_score: s.semantic,
  }))
}

// ── helpers ──────────────────────────────────────────────────

function sampleBeta(alpha: number, beta: number): number {
  // Thompson sampling — but cheap. Approximate a Beta sample using the mean
  // plus a small normal jitter scaled by variance. Good enough for ad ranking.
  const mean = alpha / (alpha + beta)
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
  const stddev = Math.sqrt(variance)
  // Box-Muller
  const u1 = Math.random() || 1e-9
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.max(0.001, Math.min(0.999, mean + z * stddev))
}

function personalizationScore(campaignCategoryIds: string[], userWeights: Record<string, number>): number {
  if (Object.keys(userWeights).length === 0 || campaignCategoryIds.length === 0) return 1.0
  const total = Object.values(userWeights).reduce((s, n) => s + n, 0)
  if (total === 0) return 1.0
  const matchWeight = campaignCategoryIds.reduce((sum, id) => sum + (userWeights[id] ?? 0), 0)
  // bonus 1.0 (no match) → 1.5 (heavy match)
  return 1.0 + 0.5 * Math.min(1, matchWeight / total)
}

const SemanticScoreSchema = z.object({
  scores: z.array(z.object({
    id: z.string(),
    score: z.number().min(0).max(1).describe('How well this campaign matches the search intent'),
  })),
})

async function computeSemanticScores(
  ctx: PickerContext,
  campaigns: CampaignRow[]
): Promise<Record<string, number>> {
  // Fast path 1: no AI gateway → fall back to keyword overlap
  const hasAuth = !!process.env.AI_GATEWAY_API_KEY || !!process.env.VERCEL_OIDC_TOKEN
  if (!hasAuth) return keywordOverlapScores(ctx, campaigns)

  // Fast path 2: no query and no category context → all neutral
  if (!ctx.query && !ctx.categoryIds?.length) {
    return Object.fromEntries(campaigns.map(c => [c.id, 0.6]))
  }

  // Cache key: query + categories + sorted campaign ids
  const ck = JSON.stringify({
    q: ctx.query ?? '',
    cats: [...(ctx.categoryIds ?? [])].sort(),
    ids: campaigns.map(c => c.id).sort(),
  })
  const cached = SCORE_CACHE.get(ck)
  if (cached && Date.now() - cached.ts < SCORE_TTL_MS) return cached.scores

  try {
    const candidatesText = campaigns.map(c =>
      `id=${c.id} | keywords=[${(c.target_keywords ?? []).join(', ')}] | categories=[${(c.target_category_ids ?? []).join(', ')}]`
    ).join('\n')

    const { output } = await generateText({
      model: 'openai/gpt-5.4-mini',
      output: Output.object({ schema: SemanticScoreSchema }),
      prompt: `You are scoring how well advertisers' campaigns match a user's current search.

User context:
- Search query: ${ctx.query ?? '(none)'}
- Browsing categories: ${(ctx.categoryIds ?? []).join(', ') || '(none)'}
- Page type: ${ctx.page}
- Location: ${[ctx.city, ctx.country].filter(Boolean).join(', ') || 'any'}

Campaigns to score (one per line):
${candidatesText}

For each campaign id, return a relevance score 0-1:
- 1.0 = perfectly matches the user's intent
- 0.5 = somewhat related
- 0.1 = barely related
- 0.0 = irrelevant

Return one entry per campaign id above. Be strict — irrelevant ads hurt user trust.`,
    })

    const scores: Record<string, number> = {}
    for (const c of campaigns) scores[c.id] = 0.5 // default
    for (const s of output.scores) scores[s.id] = s.score
    SCORE_CACHE.set(ck, { ts: Date.now(), scores })
    return scores
  } catch (err) {
    console.error('semantic ad scoring failed:', err)
    return keywordOverlapScores(ctx, campaigns)
  }
}

function keywordOverlapScores(ctx: PickerContext, campaigns: CampaignRow[]): Record<string, number> {
  const scores: Record<string, number> = {}
  const query = (ctx.query ?? '').toLowerCase()
  const queryTokens = new Set(query.split(/\s+/).filter(t => t.length > 2))
  for (const c of campaigns) {
    let s = 0.4 // baseline
    if (ctx.categoryIds?.length && c.target_category_ids?.length) {
      const overlap = ctx.categoryIds.filter(id => c.target_category_ids!.includes(id)).length
      if (overlap > 0) s += 0.4
    }
    if (queryTokens.size > 0 && c.target_keywords?.length) {
      const matches = c.target_keywords.filter(k =>
        Array.from(queryTokens).some(t => k.toLowerCase().includes(t))
      ).length
      if (matches > 0) s += 0.2
    }
    scores[c.id] = Math.min(1, s)
  }
  return scores
}
