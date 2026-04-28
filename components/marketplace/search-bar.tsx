'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue)
  const [isPending, startTransition] = useTransition()

  // useTransition stays pending until React finishes the navigation +
  // the new server component has streamed in, so we get a real
  // "searching" indicator the whole time, not just at form submit.

  // Sync local input when the URL's q changes (e.g. browser back/forward).
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    const params = new URLSearchParams()
    params.set('q', trimmed)
    params.set('smart', '1')
    startTransition(() => {
      router.push(`/marketplace/search?${params.toString()}`)
    })
  }

  // Keep an explicit busy flag for cases where the transition completes
  // but the page just streamed in (covered by useTransition itself, but
  // referenced here so future edits don't accidentally drop the spinner).
  const busy = isPending && pathname.startsWith('/marketplace/search')

  return (
    <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        {busy ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
        ) : (
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        )}
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Try "lawyers in Sydney" or "AI consultancy"…'
          className="pl-10 h-12 text-base bg-card border-border"
          disabled={isPending}
        />
      </div>
      <Button
        type="submit"
        disabled={isPending || !query.trim()}
        className="h-12 bg-primary text-primary-foreground font-bold px-6 gap-1.5"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </>
        ) : (
          <>
            <Search className="h-4 w-4" /> Search
          </>
        )}
      </Button>
    </form>
  )
}
