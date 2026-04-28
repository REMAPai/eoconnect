import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { Category } from '@/types/database'

export interface ParsedSearch {
  categorySlugs: string[]
  city?: string
  country?: string
  keywords?: string
}

const ParsedSearchSchema = z.object({
  categorySlugs: z.array(z.string()).describe('Matching category slugs from the provided list (exact slug strings)'),
  city: z.string().optional().describe('City name if the query mentions a city, lowercase'),
  country: z.string().optional().describe('Country name if mentioned, in title case'),
  keywords: z.string().optional().describe('Remaining descriptive terms for full-text search after removing category and location words'),
})

export async function parseSearchQuery(
  query: string,
  categories: Pick<Category, 'slug' | 'name'>[]
): Promise<ParsedSearch> {
  if (!process.env.OPENAI_API_KEY) {
    return { categorySlugs: [], keywords: query }
  }

  try {
    const categoryList = categories.map(c => `${c.slug}: ${c.name}`).join('\n')
    const { output } = await generateText({
      model: openai('gpt-5.4-mini'),
      output: Output.object({ schema: ParsedSearchSchema }),
      prompt: `You are a search query parser for a B2B marketplace of EO (Entrepreneurs' Organization) member businesses.

Available categories (slug: name):
${categoryList}

Parse this user query into structured filters:
"${query}"

Rules:
- Match category slugs ONLY from the list above (use the slug exactly).
- Match the SEMANTIC intent — "lawyers" → legal-services, "developers" → web-app-development, "ai consultancy" → ai-machine-learning + consulting-advisory.
- Extract city and country if mentioned (e.g. "in sydney" → city: sydney). Cities should be lowercase.
- Put remaining descriptive terms in keywords (e.g. "fintech" or "saas"). Leave empty if none.
- Return empty arrays/strings when uncertain — never invent.`,
    })
    return output
  } catch (err) {
    console.error('parseSearchQuery failed:', err)
    return { categorySlugs: [], keywords: query }
  }
}
