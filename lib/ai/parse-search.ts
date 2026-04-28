import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { Category } from '@/types/database'

export interface ParsedSearch {
  categorySlugs: string[]
  city: string | null
  country: string | null
  keywords: string | null
}

// OpenAI's strict structured-output mode requires every field to be in `required`,
// so we use .nullable() instead of .optional() and treat null as "not extracted".
const ParsedSearchSchema = z.object({
  categorySlugs: z.array(z.string()).describe('Matching category slugs from the provided list (exact slug strings). Empty array if none match.'),
  city: z.string().nullable().describe('City name if the query mentions a city (lowercase). null if not mentioned.'),
  country: z.string().nullable().describe('Country name if mentioned (title case). null if not mentioned.'),
  keywords: z.string().nullable().describe('Remaining descriptive terms for full-text search after removing category and location words. null if no remaining terms.'),
})

export async function parseSearchQuery(
  query: string,
  categories: Pick<Category, 'slug' | 'name'>[]
): Promise<ParsedSearch> {
  if (!process.env.OPENAI_API_KEY) {
    return { categorySlugs: [], city: null, country: null, keywords: query }
  }

  try {
    const categoryList = categories.map(c => `${c.slug}: ${c.name}`).join('\n')
    const { output } = await generateText({
      model: openai('gpt-5-nano'),
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
    return { categorySlugs: [], city: null, country: null, keywords: query }
  }
}
