'use client'

import { Progress } from '@/components/ui/progress'

interface LeadProgressProps {
  views: number
  contactClicks: number
}

export function LeadProgress({ views, contactClicks }: LeadProgressProps) {
  const inquiryPct = views > 0 ? Math.min((contactClicks / views) * 100, 100) : 0
  const conversionRate = views > 0 ? `${(contactClicks / views * 100).toFixed(1)}%` : '—'

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Conversion Funnel</h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">Reach</span>
            <span className="text-sm text-muted-foreground tabular-nums">{views.toLocaleString()} views</span>
          </div>
          <Progress value={100} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">Inquiries</span>
            <span className="text-sm text-muted-foreground tabular-nums">{contactClicks.toLocaleString()} clicks</span>
          </div>
          <Progress value={inquiryPct} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Conversion rate: <span className="font-semibold text-foreground">{conversionRate}</span>
      </p>
    </div>
  )
}
