import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export interface RerankCandidate {
  id: string
  name: string
  tagline: string | null
  description: string | null
  city: string | null
  country: string | null
  services: string[] // already-formatted "Title: short description" strings
}

// OpenAI strict mode: every field must be in `required` — no .optional() allowed.
const RerankSchema = z.object({
  scores: z.array(z.object({
    id: z.string(),
    score: z.number().min(0).max(1),
  })),
})

// 5-minute in-memory cache. Key: query + sorted candidate ids.
const CACHE = new Map<string, { ts: number; scores: Record<string, number> }>()
const TTL_MS = 5 * 60 * 1000

/**
 * Semantic re-ranker.
 *
 * Sends candidate businesses' full descriptions, services, and location to the
 * LLM and asks it to score each against the user's natural-language query.
 * Returns a Map<id, score> with values 0-1. Callers should filter low scores
 * (suggested >= 0.2) and sort desc.
 *
 * Falls back gracefully when no API key or on error — returns neutral 0.5
 * for every candidate so the original SQL ordering is preserved.
 */
export async function rerankResults(
  query: string,
  candidates: RerankCandidate[]
): Promise<Map<string, number>> {
  if (candidates.length === 0) return new Map()
  if (!process.env.OPENAI_API_KEY) {
    return new Map(candidates.map(c => [c.id, 0.5]))
  }

  const cacheKey = JSON.stringify({
    q: query,
    ids: candidates.map(c => c.id).sort(),
  })
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return new Map(Object.entries(cached.scores))
  }

  const candidateText = candidates.map(c => {
    const parts: string[] = [`[id=${c.id}]`, `Name: ${c.name}`]
    if (c.tagline) parts.push(`Tagline: ${c.tagline}`)
    if (c.description) parts.push(`Description: ${c.description.slice(0, 350)}`)
    if (c.city || c.country) parts.push(`Location: ${[c.city, c.country].filter(Boolean).join(', ')}`)
    if (c.services.length > 0) parts.push(`Services:\n  - ${c.services.slice(0, 5).join('\n  - ')}`)
    return parts.join('\n')
  }).join('\n\n---\n\n')

  try {
    const { output } = await generateText({
      model: openai('gpt-5-nano'),
      output: Output.object({ schema: RerankSchema }),
      prompt: `You are scoring how well each business matches the user's search intent on a B2B marketplace.

User searched: "${query}"

Businesses to score:

${candidateText}

For each business, return a relevance score 0-1:
- 1.0 = strong match — the business clearly offers what the user is looking for
- 0.7 = good match — clearly related field, likely useful
- 0.4 = partial match — adjacent or could potentially help
- 0.1 = weak match — same broad area but not the right specialty
- 0.0 = irrelevant

Consider the business name, tagline, description, services, AND location. If the user mentions a city/country, businesses in that location should score higher; businesses far away should score lower (but not zero — remote work is normal).

Be strict — irrelevant ads hurt user trust. Don't inflate scores to fill results. Return one entry per id above.`,
    })

    const scoreMap = new Map<string, number>()
    for (const c of candidates) scoreMap.set(c.id, 0)
    for (const s of output.scores) scoreMap.set(s.id, s.score)

    CACHE.set(cacheKey, { ts: Date.now(), scores: Object.fromEntries(scoreMap) })
    return scoreMap
  } catch (err) {
    console.error('rerankResults failed:', err)
    return new Map(candidates.map(c => [c.id, 0.5]))
  }
}
