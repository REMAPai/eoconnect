import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function EditBusinessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: business } = await db
    .from('businesses')
    .select('id, name, status, tagline')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/dashboard/business/new')

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Business Profile</h1>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-background p-3 rounded-lg border border-border">
            <p className="text-muted-foreground text-xs mb-1">Business</p>
            <p className="font-semibold">{business.name}</p>
          </div>
          <div className="bg-background p-3 rounded-lg border border-border">
            <p className="text-muted-foreground text-xs mb-1">Status</p>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">{business.status}</span>
          </div>
        </div>
        {business.tagline && (
          <p className="text-sm text-muted-foreground">{business.tagline}</p>
        )}
        <div className="flex gap-3">
          <Link
            href={`/marketplace/${business.id}`}
            className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
          >
            View My Listing
          </Link>
          <Link
            href="/dashboard/listings"
            className={cn(buttonVariants(), 'flex-1 bg-primary text-primary-foreground font-bold')}
          >
            Manage Services
          </Link>
        </div>
      </div>
    </div>
  )
}
