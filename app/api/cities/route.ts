import { NextResponse } from 'next/server'
import { City } from 'country-state-city'

// Search cities within a country (ISO-2 code).
// GET /api/cities?country=AU&q=syd  →  [{ name: 'Sydney', country: 'AU', state: 'NSW' }, ...]
//
// Heavy import (country-state-city ships ~150k cities). Server-side only,
// never bundled into the client. Cap result count to keep payloads sane.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const country = url.searchParams.get('country')?.toUpperCase()
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)

  if (!country || country.length !== 2) {
    return NextResponse.json({ error: 'country (ISO-2) required' }, { status: 400 })
  }

  const cities = City.getCitiesOfCountry(country) ?? []
  const filtered = q
    ? cities.filter(c => c.name.toLowerCase().includes(q))
    : cities

  // Dedupe on (name, stateCode) since some sources duplicate entries.
  const seen = new Set<string>()
  const out: Array<{ name: string; state: string | null }> = []
  for (const c of filtered) {
    const key = `${c.name}|${c.stateCode ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name: c.name, state: c.stateCode ?? null })
    if (out.length >= limit) break
  }

  return NextResponse.json(out)
}
