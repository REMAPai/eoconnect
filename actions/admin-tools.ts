'use server'

import { createClient } from '@/lib/supabase/server'
import { refreshBusinessEmbedding } from '@/lib/ai/refresh-business-embedding'

/**
 * Admin one-shot tool: backfill embeddings for any published business
 * that doesn't have one. Run from a temporary admin button or call once
 * after migration 006 lands.
 *
 * Returns a summary so the caller can display progress.
 */
export async function backfillEmbeddings(batchSize = 25): Promise<{ processed: number; remaining: number; error: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { processed: 0, remaining: 0, error: 'Not authenticated' }

  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).single() as {
    data: { role: 'member' | 'chapter_admin' | 'super_admin' } | null
  }
  if (!me || !['chapter_admin', 'super_admin'].includes(me.role)) {
    return { processed: 0, remaining: 0, error: 'Not authorized' }
  }

  const { data: pending } = await db.rpc('businesses_missing_embeddings', { batch_size: batchSize }) as {
    data: Array<{ id: string }> | null
  }
  if (!pending || pending.length === 0) {
    return { processed: 0, remaining: 0, error: null }
  }

  let processed = 0
  for (const b of pending) {
    try {
      await refreshBusinessEmbedding(db, b.id)
      processed++
    } catch (err) {
      console.error(`backfill failed for ${b.id}:`, err)
    }
  }

  // Check what's still pending
  const { data: stillMissing } = await db.rpc('businesses_missing_embeddings', { batch_size: 1 }) as {
    data: Array<{ id: string }> | null
  }
  return { processed, remaining: stillMissing?.length ?? 0, error: null }
}
