import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CampaignDetail } from '@/components/ads/campaign-detail'
import { ADS_ENABLED } from '@/lib/feature-flags'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}

export default async function CampaignDetailPage({ params, searchParams }: Props) {
  if (!ADS_ENABLED) notFound()
  const { id } = await params
  const { payment } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign } = await db
    .from('ad_campaigns')
    .select('*, business:businesses!business_id(id, name, owner_id)')
    .eq('id', id)
    .single()

  if (!campaign) notFound()
  if (campaign.business.owner_id !== user.id) notFound()

  // Daily breakdown for chart (last 30 days)
  const since = new Date(Date.now() - 30 * 86400_000).toISOString()
  const { data: events } = await db
    .from('ad_events')
    .select('event_type, cost, created_at')
    .eq('campaign_id', id)
    .gte('created_at', since) as { data: Array<{ event_type: 'impression' | 'click'; cost: number; created_at: string }> | null }

  const dailyMap = new Map<string, { date: string; impressions: number; clicks: number; spend: number }>()
  for (const e of events ?? []) {
    const day = e.created_at.split('T')[0]
    const row = dailyMap.get(day) ?? { date: day, impressions: 0, clicks: 0, spend: 0 }
    if (e.event_type === 'impression') row.impressions += 1
    else { row.clicks += 1; row.spend += Number(e.cost) }
    dailyMap.set(day, row)
  }
  const chart = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <CampaignDetail campaign={campaign} chart={chart} paymentBanner={payment ?? null} />
  )
}
