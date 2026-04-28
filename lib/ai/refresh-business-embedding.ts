import 'server-only'
import { getEmbedding, businessEmbeddingText } from './embeddings'

/**
 * Compute and persist the embedding for a single business.
 * Pulls in the business's published services so service titles are
 * part of the searchable vector.
 *
 * Call this from any server action that mutates a business or its
 * services so search stays in sync.
 */
export async function refreshBusinessEmbedding(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  businessId: string
): Promise<void> {
  const [{ data: biz }, { data: svcs }] = await Promise.all([
    db.from('businesses')
      .select('name, tagline, description, tags, city, country')
      .eq('id', businessId)
      .single(),
    db.from('services')
      .select('title, description')
      .eq('business_id', businessId)
      .eq('status', 'published'),
  ])
  if (!biz) return

  const serviceTitles = (svcs ?? []).map((s: { title: string; description: string | null }) =>
    s.description ? `${s.title}: ${s.description}` : s.title
  )
  const text = businessEmbeddingText({ ...biz, serviceTitles })

  const embedding = await getEmbedding(text)
  if (!embedding) return

  await db.from('businesses').update({
    embedding,
    embedding_text: text,
    embedding_updated_at: new Date().toISOString(),
  }).eq('id', businessId)
}
