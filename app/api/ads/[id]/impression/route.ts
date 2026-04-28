import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'node:crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const dailySalt = new Date().toISOString().split('T')[0]
  const ipHash = crypto.createHash('sha256').update(ip + dailySalt).digest('hex')

  const { data: success } = await db.rpc('record_ad_event', {
    p_campaign_id: id,
    p_event_type: 'impression',
    p_search_query: body.query ?? null,
    p_page: body.page ?? null,
    p_ip_hash: ipHash,
  }) as { data: boolean | null }

  return NextResponse.json({ recorded: !!success })
}
