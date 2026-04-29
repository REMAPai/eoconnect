'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Check, MapPin, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Chapter {
  name: string
  region: string
  country: string | null
  city: string | null
  virtual?: boolean
}

interface Props {
  chapters: Chapter[]
  value?: string | null   // chapter name
  onChange: (chapter: Chapter | null) => void
  /** Show "I'm not part of any chapter" option (for non-EO members). */
  allowNone?: boolean
  placeholder?: string
}

/**
 * Searchable EO chapter picker. Filters by name, city, country, and region.
 * Picking a chapter sets the user's region/country/city tags via the parent
 * form (the chapter object is returned through onChange).
 */
export function ChapterPicker({ chapters, value, onChange, allowNone, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => chapters.find(c => c.name === value) ?? null,
    [chapters, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter(c => {
      const haystack = [c.name, c.region, c.country ?? '', c.city ?? ''].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [chapters, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Chapter[]>()
    for (const c of filtered) {
      const key = c.region
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-start font-normal h-10" />
        }
      >
        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
        {selected ? (
          <span className="truncate">
            <span className="font-medium">{selected.name}</span>
            {selected.city && <span className="text-muted-foreground"> · {selected.city}</span>}
            {!selected.city && selected.country && (
              <span className="text-muted-foreground"> · {selected.country}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder ?? 'Select your EO chapter…'}</span>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base">Select your EO chapter</DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by name, city, country…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-5 py-3 text-sm border-b border-border hover:bg-muted transition-colors flex items-center gap-2',
                !selected && 'bg-muted/50'
              )}
            >
              {!selected && <Check className="h-4 w-4 text-primary" />}
              <span className={cn(!selected ? 'font-medium' : 'text-muted-foreground')}>
                I'm not part of any EO chapter
              </span>
            </button>
          )}
          {grouped.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No chapters match "{query}"
            </div>
          )}
          {grouped.map(([region, rows]) => (
            <div key={region}>
              <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky top-0">
                {region}
              </div>
              {rows.map(c => {
                const isSelected = c.name === value
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      onChange(c)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-5 py-2.5 hover:bg-muted transition-colors flex items-start gap-2',
                      isSelected && 'bg-primary/10'
                    )}
                  >
                    {isSelected ? (
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    ) : (
                      <span className="h-4 w-4 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[c.city, c.country].filter(Boolean).join(', ') || 'Virtual / global'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
