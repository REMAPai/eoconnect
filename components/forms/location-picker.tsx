'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Country } from 'country-state-city'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Check, MapPin, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocationValue {
  countryCode: string
  countryName: string
  city: string
}

interface Props {
  countryCode: string
  city: string
  onChange: (value: LocationValue) => void
  required?: boolean
}

interface CityResult {
  name: string
  state: string | null
}

/**
 * Country dropdown + city search combobox. Country list is bundled
 * (~250 entries from country-state-city). Cities are fetched on demand
 * from /api/cities — that endpoint imports the heavy dataset server-side
 * so we don't ship 150k cities to the browser.
 */
export function LocationPicker({ countryCode, city, onChange, required }: Props) {
  // Bundled country list. Cheap — ~250 entries.
  const countries = useMemo(() => {
    return Country.getAllCountries()
      .map(c => ({ code: c.isoCode, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const selectedCountry = countries.find(c => c.code === countryCode) ?? null

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country {required && '*'}</Label>
        <CountryPicker
          countries={countries}
          value={countryCode}
          onChange={(code, name) => onChange({ countryCode: code, countryName: name, city })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City {required && '*'}</Label>
        <CitySearch
          countryCode={countryCode}
          countryName={selectedCountry?.name ?? ''}
          value={city}
          onChange={(cityName) => onChange({
            countryCode,
            countryName: selectedCountry?.name ?? '',
            city: cityName,
          })}
        />
      </div>
    </div>
  )
}

// ─── Country dropdown ────────────────────────────────────────

function CountryPicker({
  countries, value, onChange,
}: {
  countries: { code: string; name: string }[]
  value: string
  onChange: (code: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = countries.find(c => c.code === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return countries
    return countries.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)
  }, [countries, query])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" className="w-full justify-start font-normal h-10" />}
      >
        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.name : 'Select country…'}
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base">Select country</DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search country…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No country matches &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map(c => {
              const isSelected = c.code === value
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.code, c.name); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-5 py-2.5 hover:bg-muted transition-colors flex items-center gap-2',
                    isSelected && 'bg-primary/10'
                  )}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <span className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="text-sm">{c.name}</span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── City search (debounced fetch) ───────────────────────────

function CitySearch({
  countryCode, countryName, value, onChange,
}: {
  countryCode: string
  countryName: string
  value: string
  onChange: (city: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open || !countryCode) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/cities?country=${countryCode}&q=${encodeURIComponent(query)}&limit=80`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as CityResult[]
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, countryCode, open])

  const disabled = !countryCode

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!disabled) setOpen(v) }}>
      <DialogTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-start font-normal h-10"
          />
        }
      >
        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value || (disabled ? 'Pick a country first' : 'Select city…')}
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base">
            City in {countryName || 'selected country'}
          </DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search city…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {query ? `No city matches "${query}" in ${countryName}` : 'Start typing to search'}
            </div>
          )}
          {!loading && results.map((c, i) => {
            const isSelected = c.name === value
            return (
              <button
                key={`${c.name}-${c.state}-${i}`}
                type="button"
                onClick={() => { onChange(c.name); setOpen(false) }}
                className={cn(
                  'w-full text-left px-5 py-2.5 hover:bg-muted transition-colors flex items-center gap-2',
                  isSelected && 'bg-primary/10'
                )}
              >
                {isSelected ? (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <span className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-sm flex-1">{c.name}</span>
                {c.state && <span className="text-xs text-muted-foreground">{c.state}</span>}
              </button>
            )
          })}
          {/* Manual entry fallback if their city isn't in the dataset */}
          {!loading && query && !results.some(r => r.name.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              onClick={() => { onChange(query); setOpen(false) }}
              className="w-full text-left px-5 py-2.5 border-t border-border hover:bg-muted transition-colors text-sm text-muted-foreground"
            >
              Use &ldquo;<span className="text-foreground font-medium">{query}</span>&rdquo; (not in list)
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
