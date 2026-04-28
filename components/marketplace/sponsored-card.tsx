'use client'

import { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { ListingCard } from './listing-card'
import type { Business } from '@/types/database'

interface Props {
  business: Business
  campaignId: string
  query?: string
  page: 'search' | 'marketplace' | 'category' | 'listing'
}

export function SponsoredCard({ business, campaignId, query, page }: Props) {
  const recordedRef = useRef(false)

  useEffect(() => {
    if (recordedRef.current) return
    recordedRef.current = true
    fetch(`/api/ads/${campaignId}/impression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, page }),
    }).catch(() => {})
  }, [campaignId, query, page])

  const onClickCapture = () => {
    fetch(`/api/ads/${campaignId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, page }),
      keepalive: true,
    }).catch(() => {})
  }

  return (
    <div className="relative" onClickCapture={onClickCapture}>
      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold flex items-center gap-1 pointer-events-none">
        <Sparkles className="h-3 w-3" /> Sponsored
      </div>
      <ListingCard business={business} />
    </div>
  )
}
