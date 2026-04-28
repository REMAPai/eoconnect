'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    const params = new URLSearchParams()
    params.set('q', trimmed)
    params.set('smart', '1')
    router.push(`/marketplace/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Try "lawyers in Sydney" or "AI consultancy"…'
          className="pl-10 h-12 text-base bg-card border-border"
        />
      </div>
      <Button type="submit" size="lg" className="bg-primary text-primary-foreground font-bold px-6 gap-1.5">
        <Search className="h-4 w-4" /> Search
      </Button>
    </form>
  )
}
