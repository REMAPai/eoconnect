'use server'

import { createClient } from '@supabase/supabase-js'
import { refreshBusinessEmbedding } from '@/lib/ai/refresh-business-embedding'

export interface BackfillResult {
  ok: boolean
  message: string
  processed?: number
  remaining?: number
}

export async function runBackfill(serviceKey: string, batchSize = 25): Promise<BackfillResult> {
  // Validate against env. Use constant-time-ish comparison to avoid leaking length.
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!expected) {
    return { ok: false, message: 'Service key not configured on server' }
  }
  if (!serviceKey || serviceKey.length !== expected.length) {
    return { ok: false, message: 'Invalid service key' }
  }
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ serviceKey.charCodeAt(i)
  }
  if (mismatch !== 0) {
    return { ok: false, message: 'Invalid service key' }
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    expected,
    { auth: { persistSession: false } }
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const { data: pending } = await dbAny.rpc('businesses_missing_embeddings', { batch_size: batchSize }) as {
    data: Array<{ id: string }> | null
  }

  if (!pending || pending.length === 0) {
    return { ok: true, message: 'All businesses already have embeddings.', processed: 0, remaining: 0 }
  }

  let processed = 0
  for (const b of pending) {
    try {
      await refreshBusinessEmbedding(dbAny, b.id)
      processed++
    } catch (err) {
      console.error('backfill failed for', b.id, err)
    }
  }

  const { data: stillMissing } = await dbAny.rpc('businesses_missing_embeddings', { batch_size: 1 }) as {
    data: Array<{ id: string }> | null
  }
  const remaining = stillMissing?.length ?? 0

  return {
    ok: true,
    message: remaining === 0
      ? `Done. Embedded ${processed} business${processed === 1 ? '' : 'es'}.`
      : `Embedded ${processed} so far. ${remaining}+ still pending — click Run again.`,
    processed,
    remaining,
  }
}
