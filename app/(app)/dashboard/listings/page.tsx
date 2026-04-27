import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Service } from '@/types/database'
import { ServiceActions } from './service-actions'

function formatPrice(service: Pick<Service, 'pricing_model' | 'price_from' | 'price_to'>) {
  if (service.pricing_model === 'contact' || !service.price_from) return 'Contact for pricing'
  const from = `$${service.price_from.toLocaleString()}`
  const to = service.price_to ? `–$${service.price_to.toLocaleString()}` : ''
  return `${from}${to} / ${service.pricing_model}`
}

export default async function ListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: business } = await db
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  const { data: services } = business
    ? await db
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Manage Services</h1>
          {business && (
            <p className="text-sm text-muted-foreground mt-1">{business.name}</p>
          )}
        </div>
        {business && (
          <Link
            href="/dashboard/listings/new"
            className={cn(buttonVariants(), 'bg-primary text-primary-foreground font-bold gap-1.5')}
          >
            + Add Service
          </Link>
        )}
      </div>

      {!business && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">No business profile yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You need to create a business profile before you can add services.
          </p>
          <Link
            href="/dashboard/business/new"
            className={cn(buttonVariants(), 'bg-primary text-primary-foreground font-bold')}
          >
            Create Business Profile
          </Link>
        </div>
      )}

      {business && (!services || services.length === 0) && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">No services yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Add your first service to start getting discovered by other members.
          </p>
          <Link
            href="/dashboard/listings/new"
            className={cn(buttonVariants(), 'bg-primary text-primary-foreground font-bold gap-1')}
          >
            + Add Your First Service
          </Link>
        </div>
      )}

      {business && services && services.length > 0 && (
        <div className="space-y-3">
          {(services as Service[]).map(service => (
            <div
              key={service.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{service.title}</h3>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                    service.status === 'published'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {service.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{formatPrice(service)}</p>
                {service.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{service.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/dashboard/listings/${service.id}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Edit
                </Link>
                <ServiceActions serviceId={service.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
