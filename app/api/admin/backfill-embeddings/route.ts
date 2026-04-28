import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshBusinessEmbedding } from '@/lib/ai/refresh-business-embedding'

// One-shot backfill endpoint for vector search embeddings.
//
// Auth: pass the SUPABASE_SERVICE_ROLE_KEY in the Authorization header,
// because the user's UI admin gate is currently broken and we need a way to
// kick this off without a session.
//
// Usage (from your terminal):
//   curl -X POST https://eomembermarket.vercel.app/api/admin/backfill-embeddings \
//        -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
//
// Response:
//   { processed: 12, remaining: 5 }
//
// Call repeatedly until remaining = 0.

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const batchSize = Math.min(parseInt(url.searchParams.get('batch') ?? '25'), 100)

  // Service-role client — bypasses RLS, can read every business
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const { data: pending } = await dbAny.rpc('businesses_missing_embeddings', { batch_size: batchSize }) as {
    data: Array<{ id: string }> | null
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0 })
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
  return NextResponse.json({ processed, remaining: stillMissing?.length ?? 0 })
}
