'use client'

import { ProgressTrack, ProgressIndicator } from '@/components/ui/progress'

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
        {/* Reach row */}
        <div className="flex flex-wrap gap-3">
          <span className="text-sm font-medium">Reach</span>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">{views.toLocaleString()} views</span>
          <ProgressTrack className="w-full">
            <ProgressIndicator style={{ width: '100%', height: '100%', background: 'hsl(var(--primary))' }} />
          </ProgressTrack>
        </div>

        {/* Inquiries row */}
        <div className="flex flex-wrap gap-3">
          <span className="text-sm font-medium">Inquiries</span>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">{contactClicks.toLocaleString()} clicks</span>
          <ProgressTrack className="w-full">
            <ProgressIndicator style={{ width: `${inquiryPct}%`, height: '100%', background: 'hsl(var(--primary))' }} />
          </ProgressTrack>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Conversion rate: <span className="font-semibold text-foreground">{conversionRate}</span>
      </p>
    </div>
  )
}
