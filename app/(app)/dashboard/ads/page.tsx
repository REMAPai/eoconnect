import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ADS_ENABLED } from '@/lib/feature-flags'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Plus, BarChart3, MousePointerClick, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default async function AdsListPage() {
  if (!ADS_ENABLED) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Members can own multiple businesses — pick the most recent for ad scope.
  const { data: businesses } = await db
    .from('businesses').select('id, name, status').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1) as {
      data: Array<{ id: string; name: string; status: string }> | null
    }
  const business = businesses?.[0] ?? null

  if (!business) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-card border border-border rounded-2xl p-10">
        <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-xl font-bold">Set up your business first</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-4">You need a published listing before launching ads.</p>
        <Link href="/dashboard/business/new" className={cn(buttonVariants(), 'bg-primary text-primary-foreground')}>
          Create Business Profile
        </Link>
      </div>
    )
  }

  const { data: campaigns } = await db
    .from('ad_campaigns')
    .select('id, format, goal, status, budget_total, spend_to_date, bid_cpc, impressions, clicks, created_at, target_keywords, rejection_reason')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false }) as {
      data: Array<{
        id: string
        format: 'banner' | 'sponsored_listing'
        goal: string | null
        status: string
        budget_total: number | null
        spend_to_date: number
        bid_cpc: number
        impressions: number
        clicks: number
        created_at: string
        target_keywords: string[] | null
        rejection_reason: string | null
      }> | null
    }

  const list = campaigns ?? []
  const totalSpend = list.reduce((s, c) => s + Number(c.spend_to_date || 0), 0)
  const totalClicks = list.reduce((s, c) => s + (c.clicks || 0), 0)
  const totalImpressions = list.reduce((s, c) => s + (c.impressions || 0), 0)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ad Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Promote {business.name} to relevant EO members.</p>
        </div>
        <Link href="/dashboard/ads/new" className={cn(buttonVariants(), 'gap-1.5 bg-primary text-primary-foreground font-bold')}>
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Spend" value={`$${totalSpend.toFixed(2)}`} icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="Impressions" value={totalImpressions.toLocaleString()} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Clicks" value={totalClicks.toLocaleString()} icon={<MousePointerClick className="h-4 w-4" />} />
        <StatCard label="CTR" value={`${ctr.toFixed(2)}%`} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {list.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-semibold">No campaigns yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Launch your first campaign to reach the right members.</p>
          <Link href="/dashboard/ads/new" className={cn(buttonVariants(), 'bg-primary text-primary-foreground')}>
            Create First Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(c => (
            <Link
              key={c.id}
              href={`/dashboard/ads/${c.id}`}
              className="block bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold capitalize">{c.format.replace('_', ' ')}</span>
                    <StatusBadge status={c.status} />
                    {c.rejection_reason && (
                      <span className="text-xs text-destructive">— {c.rejection_reason}</span>
                    )}
                  </div>
                  {c.target_keywords && c.target_keywords.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Keywords: {c.target_keywords.slice(0, 6).join(', ')}
                      {c.target_keywords.length > 6 && ` +${c.target_keywords.length - 6} more`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="font-bold">${Number(c.spend_to_date).toFixed(2)} / ${Number(c.budget_total ?? 0).toFixed(2)}</p>
                  <div className="w-32 mt-1 h-1 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, (c.spend_to_date / Math.max(c.budget_total ?? 1, 0.01)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.impressions.toLocaleString()} impr · {c.clicks.toLocaleString()} clicks
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground border-border',
    pending_review: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    active: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    paused: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    completed: 'bg-muted text-muted-foreground border-border',
    rejected: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  }
  return <Badge className={cn('border capitalize', variants[status] ?? variants.draft)}>{status.replace('_', ' ')}</Badge>
}
