import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { createClient } from '@/lib/supabase/server'

interface LandingPageProps {
  searchParams: Promise<{ code?: string; next?: string }>
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const { code, next } = await searchParams

  // Defensive: if Supabase redirected the OAuth code here instead of /auth/callback
  // (because the allowlist isn't configured), forward it.
  if (code) {
    const target = next ? `/auth/callback?code=${code}&next=${encodeURIComponent(next)}` : `/auth/callback?code=${code}`
    redirect(target)
  }

  // Already signed in? Skip the marketing page.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/marketplace')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 border-b border-border">
        <span className="text-2xl font-extrabold tracking-tight">
          Member<span className="text-primary">Market</span>
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-primary text-primary-foreground font-bold" size="sm">
              Join Now
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">
            Exclusive to EO Members
          </p>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            The B2B marketplace<br />built for founders
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Discover, hire, and promote within your trusted EO network. No cold outreach — just deals with people already in the room.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-primary text-primary-foreground font-bold px-8">
                Request Access
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} Member Market · Exclusive to EO Members
      </footer>
    </div>
  )
}
