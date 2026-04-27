'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    router.push(`/marketplace/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search services, companies, keywords…"
          className="pl-10 h-12 text-base bg-card border-border"
        />
      </div>
      <Button type="submit" size="lg" className="bg-primary text-primary-foreground font-bold px-6">
        Search
      </Button>
    </form>
  )
}
