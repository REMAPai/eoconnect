import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshBusinessEmbedding } from '@/lib/ai/refresh-business-embedding'

// Vercel Cron — fires on the schedule defined in vercel.json.
// Auth: Vercel auto-injects `Authorization: Bearer $CRON_SECRET` on
// scheduled invocations. We accept either that or a missing CRON_SECRET
// (so it works even if the user hasn't set the env var yet).

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, message: 'Required env vars not set' }, { status: 503 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const { data: pending } = await dbAny.rpc('businesses_missing_embeddings', { batch_size: 100 }) as {
    data: Array<{ id: string }> | null
  }

  let processed = 0
  for (const b of pending ?? []) {
    try {
      await refreshBusinessEmbedding(dbAny, b.id)
      processed++
    } catch (err) {
      console.error('cron embed failed for', b.id, err)
    }
  }

  return NextResponse.json({ ok: true, processed })
}
