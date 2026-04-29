import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import { NewListingClient } from './new-listing-client'

interface Props {
  searchParams: Promise<{ business?: string }>
}

export default async function NewListingPage({ searchParams }: Props) {
  const { business: requestedBusinessId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: businesses } = await db
    .from('businesses')
    .select('id, name, logo_url')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true }) as {
      data: Array<{ id: string; name: string; logo_url: string | null }> | null
    }

  const list = businesses ?? []

  // No businesses → kick to wizard
  if (list.length === 0) redirect('/dashboard/business/new')

  // If exactly one business, auto-select it
  if (list.length === 1) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-center mb-2">Add a Service</h1>
        <p className="text-muted-foreground text-center mb-8">
          List a service you offer to other members.
        </p>
        <NewListingClient businessId={list[0].id} />
      </div>
    )
  }

  // Multiple businesses but caller specified which one
  if (requestedBusinessId && list.find(b => b.id === requestedBusinessId)) {
    const target = list.find(b => b.id === requestedBusinessId)!
    return (
      <div>
        <h1 className="text-2xl font-bold text-center mb-2">Add a Service</h1>
        <p className="text-muted-foreground text-center mb-8">
          Adding to <span className="text-foreground font-medium">{target.name}</span> ·{' '}
          <Link href="/dashboard/services/new" className="text-primary hover:underline">change</Link>
        </p>
        <NewListingClient businessId={target.id} />
      </div>
    )
  }

  // Multi-business picker
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-2">Add a Service</h1>
      <p className="text-muted-foreground text-center mb-8">
        Which business is this service for?
      </p>
      <div className="space-y-3">
        {list.map(b => (
          <Link
            key={b.id}
            href={`/dashboard/services/new?business=${b.id}`}
            className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
              {b.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 font-medium">{b.name}</div>
            <span className="text-sm text-primary">Choose →</span>
          </Link>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/dashboard/business/new"
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
        >
          + Add Another Business
        </Link>
      </div>
    </div>
  )
}
