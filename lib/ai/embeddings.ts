import 'server-only'
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'

/**
 * Get a 1536-dim embedding for a piece of text.
 * Uses text-embedding-3-small (cheap + fast — ~$0.02 per million tokens).
 * Returns null if no API key or on error so callers can no-op gracefully.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const { embedding } = await embed({
      model: openai.textEmbeddingModel('text-embedding-3-small'),
      value: trimmed.slice(0, 8000), // OpenAI hard caps ~8K tokens; chars is a safe proxy
    })
    return embedding
  } catch (err) {
    console.error('getEmbedding failed:', err)
    return null
  }
}

/**
 * Build the canonical "what to embed" text for a business.
 * Includes name, tagline, description, tags, location, and service titles —
 * everything a user might naturally search for.
 */
export function businessEmbeddingText(input: {
  name: string
  tagline?: string | null
  description?: string | null
  tags?: string[] | null
  city?: string | null
  country?: string | null
  serviceTitles?: string[]
}): string {
  const parts: string[] = [input.name]
  if (input.tagline) parts.push(input.tagline)
  if (input.description) parts.push(input.description)
  if (input.tags && input.tags.length > 0) parts.push(`Tags: ${input.tags.join(', ')}`)
  if (input.city || input.country) parts.push(`Location: ${[input.city, input.country].filter(Boolean).join(', ')}`)
  if (input.serviceTitles && input.serviceTitles.length > 0) {
    parts.push(`Services offered: ${input.serviceTitles.join('; ')}`)
  }
  return parts.join('\n')
}
