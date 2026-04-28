'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { approveCampaign, rejectCampaign } from '@/actions/ads'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface PendingCampaign {
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
}

export function AdsApprovalQueue({ campaigns }: { campaigns: PendingCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
        No campaigns awaiting review.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {campaigns.map(c => <ApprovalCard key={c.id} campaign={c} />)}
    </div>
  )
}

function ApprovalCard({ campaign }: { campaign: PendingCampaign }) {
  const [isPending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const approve = () => startTransition(async () => {
    const r = await approveCampaign(campaign.id)
    if (r.error) toast.error(r.error)
    else toast.success(`Approved — ${campaign.business.name}`)
  })

  const reject = () => startTransition(async () => {
    const r = await rejectCampaign(campaign.id, reason)
    if (r.error) toast.error(r.error)
    else { toast.success('Campaign rejected'); setShowReject(false) }
  })

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/marketplace/${campaign.business.id}`} className="font-semibold hover:text-primary">
              {campaign.business.name}
            </Link>
            <Badge variant="outline" className="capitalize text-xs">{campaign.format.replace('_', ' ')}</Badge>
            {campaign.status === 'rejected' && (
              <Badge className="border bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs">Rejected</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Submitted {format(new Date(campaign.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="text-right text-sm flex-shrink-0">
          <p className="font-bold">${Number(campaign.budget_total ?? 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">${Number(campaign.bid_cpc).toFixed(2)}/click</p>
        </div>
      </div>

      <div className="text-sm space-y-1">
        <p><span className="text-muted-foreground">Categories:</span> {campaign.target_category_ids?.length ?? 0}</p>
        <p><span className="text-muted-foreground">Keywords:</span> {(campaign.target_keywords ?? []).join(', ') || '—'}</p>
        {campaign.creative_url && (
          <p><span className="text-muted-foreground">Creative:</span>{' '}
            <a href={campaign.creative_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              View image
            </a>
          </p>
        )}
        {campaign.rejection_reason && (
          <p className="text-xs text-destructive">Rejected because: {campaign.rejection_reason}</p>
        )}
      </div>

      {showReject ? (
        <div className="flex gap-2">
          <Input
            placeholder="Reason for rejection (shown to advertiser)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
          <Button size="sm" onClick={reject} disabled={isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Confirm Reject
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          {campaign.status !== 'rejected' && (
            <Button size="sm" onClick={approve} disabled={isPending} className="bg-primary text-primary-foreground">
              Approve & Launch
            </Button>
          )}
          {campaign.status !== 'rejected' && (
            <Button size="sm" variant="outline" onClick={() => setShowReject(true)} className="text-destructive hover:text-destructive">
              Reject
            </Button>
          )}
          {campaign.status === 'rejected' && (
            <Button size="sm" onClick={approve} disabled={isPending} variant="outline">
              Re-approve
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
