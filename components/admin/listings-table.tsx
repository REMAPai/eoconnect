'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { setBusinessStatusAdmin } from '@/actions/admin'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type Status = 'draft' | 'published' | 'paused'

interface Listing {
  id: string
  name: string
  owner_id: string
  status: Status
  city: string | null
  country: string | null
  created_at: string
}

const STATUS_COLORS: Record<Status, string> = {
  published: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  draft: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  paused: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

export function ListingsTable({ listings }: { listings: Listing[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left p-3 font-medium">Business</th>
              <th className="text-left p-3 font-medium">Location</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map(l => <ListingRow key={l.id} listing={l} />)}
            {listings.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No listings.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ListingRow({ listing }: { listing: Listing }) {
  const [isPending, startTransition] = useTransition()
  const setStatus = (status: Status) =>
    startTransition(() => { setBusinessStatusAdmin(listing.id, status) })

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20">
      <td className="p-3">
        <Link href={`/marketplace/${listing.id}`} className="font-medium hover:text-primary">
          {listing.name}
        </Link>
      </td>
      <td className="p-3 text-muted-foreground">
        {[listing.city, listing.country].filter(Boolean).join(', ') || '—'}
      </td>
      <td className="p-3">
        <Badge className={cn('border', STATUS_COLORS[listing.status])}>{listing.status}</Badge>
      </td>
      <td className="p-3 text-muted-foreground text-xs">
        {format(new Date(listing.created_at), 'MMM d, yyyy')}
      </td>
      <td className="p-3 text-right space-x-1">
        {listing.status !== 'published' && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus('published')}>
            Publish
          </Button>
        )}
        {listing.status !== 'paused' && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus('paused')}
            className="text-destructive hover:text-destructive">
            Pause
          </Button>
        )}
      </td>
    </tr>
  )
}
