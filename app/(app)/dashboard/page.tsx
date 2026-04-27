import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, status')
    .eq('owner_id', user.id)
    .single() as { data: { id: string; name: string; status: string } | null; error: unknown }

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Welcome back, {business.name}.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/listings" className="block p-6 bg-card border border-border rounded-xl hover:border-primary transition-colors">
          <p className="text-sm text-muted-foreground">Manage Listings</p>
          <p className="text-xl font-bold mt-1">{business.name}</p>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full mt-2 inline-block">{business.status}</span>
        </Link>
        <Link href="/dashboard/messages" className="block p-6 bg-card border border-border rounded-xl hover:border-primary transition-colors">
          <p className="text-sm text-muted-foreground">Messages</p>
          <p className="text-xl font-bold mt-1">Inbox</p>
        </Link>
        <Link href="/dashboard/ads" className="block p-6 bg-card border border-border rounded-xl hover:border-primary transition-colors">
          <p className="text-sm text-muted-foreground">Ad Campaigns</p>
          <p className="text-xl font-bold mt-1">Promote</p>
        </Link>
      </div>
    </div>
  )
}
