import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Service } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
}

function formatPrice(s: Pick<Service, 'pricing_model' | 'price_from' | 'price_to'>) {
  if (s.pricing_model === 'contact' || !s.price_from) return 'Contact for pricing'
  return `$${s.price_from.toLocaleString()}${s.price_to ? `–$${s.price_to.toLocaleString()}` : ''} / ${s.pricing_model}`
}

export default async function AdminBusinessServicesPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: business }, { data: services }] = await Promise.all([
    db.from('businesses').select('id, name, profiles!owner_id(full_name)').eq('id', id).maybeSingle(),
    db.from('services').select('*').eq('business_id', id).order('created_at', { ascending: false }),
  ])

  if (!business) notFound()

  const list = (services ?? []) as Service[]
  const ownerName = business.profiles?.full_name ?? 'Unknown owner'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/listings" className="text-xs text-muted-foreground hover:text-foreground inline-block mb-1">
          ← Back to listings
        </Link>
        <h1 className="text-2xl font-bold">Services — {business.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Owned by <span className="text-foreground font-medium">{ownerName}</span>
        </p>
      </div>

      {list.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No services on this business yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(service => (
            <div
              key={service.id}
              className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {service.thumbnail_url && (
                  <div className="relative h-16 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={service.thumbnail_url} alt={service.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{service.title}</h3>
                    <Badge variant={service.status === 'published' ? 'default' : 'secondary'} className="capitalize text-[10px]">
                      {service.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatPrice(service)}</p>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                  )}
                </div>
              </div>
              <Link
                href={`/dashboard/listings/${service.id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
