import { createClient } from '@/lib/supabase/server'
import { AdsApprovalQueue } from '@/components/admin/ads-approval-queue'

export default async function AdminAdsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: pending } = await db
    .from('ad_campaigns')
    .select(`
      id, format, goal, target_category_ids, target_keywords, budget_total, bid_cpc,
      status, created_at, creative_url, rejection_reason,
      business:businesses!business_id(id, name, owner_id, logo_url)
    `)
    .in('status', ['pending_review', 'rejected'])
    .order('created_at', { ascending: false }) as {
      data: Array<{
        id: string
        format: 'banner' | 'sponsored_listing'
        goal: string | null
        target_category_ids: string[] | null
        target_keywords: string[] | null
        budget_total: number | null
        bid_cpc: number
        status: string
        created_at: string
        creative_url: string | null
        rejection_reason: string | null
        business: { id: string; name: string; owner_id: string; logo_url: string | null }
      }> | null
    }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ad Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Review submitted campaigns before they go live.</p>
      </div>
      <AdsApprovalQueue campaigns={pending ?? []} />
    </div>
  )
}
