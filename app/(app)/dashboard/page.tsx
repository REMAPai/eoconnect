import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Eye, Search, MessageCircle, LayoutList, Inbox, Megaphone } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { AnalyticsChart } from '@/components/dashboard/analytics-chart'
import { LeadProgress } from '@/components/dashboard/lead-progress'

export default async function DashboardPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: business } = await db
    .from('businesses')
    .select('id, name, status')
    .eq('owner_id', user.id)
    .maybeSingle() as { data: { id: string; name: string; status: string } | null }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-2xl font-bold mb-2">Set up your business profile</h2>
        <p className="text-muted-foreground mb-6">Create your listing to appear in the EOconnect marketplace.</p>
        <Link
          href="/dashboard/business/new"
          className={cn(buttonVariants(), 'bg-primary text-primary-foreground font-bold')}
        >
          Create Profile
        </Link>
      </div>
    )
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: analytics } = await db
    .from('listing_analytics')
    .select('date, views, search_appearances, contact_clicks')
    .eq('business_id', business.id)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true }) as { data: Array<{ date: string; views: number; search_appearances: number; contact_clicks: number }> | null }

  const totalViews = analytics?.reduce((sum, r) => sum + (r.views ?? 0), 0) ?? 0
  const totalSearchAppearances = analytics?.reduce((sum, r) => sum + (r.search_appearances ?? 0), 0) ?? 0
  const totalContactClicks = analytics?.reduce((sum, r) => sum + (r.contact_clicks ?? 0), 0) ?? 0

  const chartData = (analytics ?? []).map((r) => ({
    date: r.date,
    views: r.views ?? 0,
    contact_clicks: r.contact_clicks ?? 0,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Provider Dashboard</p>
        </div>
        <Badge variant="secondary" className="capitalize ml-auto">{business.status}</Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard label="Views" value={totalViews} icon={<Eye className="w-5 h-5" />} />
        <StatsCard label="Search Appearances" value={totalSearchAppearances} icon={<Search className="w-5 h-5" />} />
        <StatsCard label="Inquiries" value={totalContactClicks} icon={<MessageCircle className="w-5 h-5" />} />
      </div>

      {/* Chart */}
      <AnalyticsChart data={chartData} />

      {/* Lead progress */}
      <LeadProgress views={totalViews} contactClicks={totalContactClicks} />

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/listings" className="block p-6 bg-card border border-border rounded-xl hover:border-primary transition-colors">
          <LayoutList className="w-5 h-5 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Manage</p>
          <p className="text-xl font-bold mt-0.5">Listings</p>
        </Link>
        <Link href="/dashboard/messages" className="block p-6 bg-card border border-border rounded-xl hover:border-primary transition-colors">
          <Inbox className="w-5 h-5 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Check</p>
          <p className="text-xl font-bold mt-0.5">Messages</p>
        </Link>
        <Link href="/dashboard/ads" className="block p-6 bg-card border border-border rounded-xl hover:border-primary transition-colors">
          <Megaphone className="w-5 h-5 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Ad Campaigns</p>
          <p className="text-xl font-bold mt-0.5">Promote</p>
        </Link>
      </div>
    </div>
  )
}
