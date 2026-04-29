// Normalizes the raw EO chapter scrape into a clean seed file.
// Run: node scripts/normalize-eo-chapters.mjs <raw.json> <out.json>
import fs from 'node:fs'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) {
  console.error('Usage: node normalize-eo-chapters.mjs <raw.json> <out.json>')
  process.exit(1)
}

const raw = JSON.parse(fs.readFileSync(inPath, 'utf8'))

// Cities that are actually US states / regions / countries — null them out.
const NON_CITY_VALUES = new Set([
  'Connecticut', 'Punjab', 'Goa', 'Portugal', 'Romandy',
])

// Manual city corrections for known scrape bugs.
const CITY_FIXES = {
  'EO Adelaide': 'Adelaide',
}

function cleanCity(name, raw) {
  if (CITY_FIXES[name]) return CITY_FIXES[name]
  if (!raw) return null
  let city = raw.trim()
  if (NON_CITY_VALUES.has(city)) return null
  // Strip US state codes / country suffixes: "Dallas, TX" -> "Dallas"
  city = city.replace(/,\s*[A-Z]{2}$/, '')
  city = city.replace(/,\s*California,\s*USA$/i, '')
  city = city.replace(/,\s*[A-Za-z\s]+$/, m => {
    // Only strip if the trailing part looks like a country/region name we want gone
    if (/Bulgaria|California|USA|United States/i.test(m)) return ''
    return m
  })
  // "Denver / Boulder" -> "Denver"
  city = city.split('/')[0].trim()
  return city || null
}

const VIRTUAL_BRIDGES = /\bBridge\b/i

const cleaned = raw.map(c => ({
  name: c.name,
  region: c.region,
  country: c.country, // keep null for global bridges
  city: cleanCity(c.name, c.city),
  virtual: VIRTUAL_BRIDGES.test(c.name) || undefined,
}))

// Deduplicate by name (last wins) and sort
const byName = new Map()
for (const c of cleaned) byName.set(c.name, c)
const sorted = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))

fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2))

const stats = {
  total: sorted.length,
  virtual: sorted.filter(c => c.virtual).length,
  byRegion: sorted.reduce((acc, c) => {
    acc[c.region] = (acc[c.region] ?? 0) + 1
    return acc
  }, {}),
  withCity: sorted.filter(c => c.city).length,
  countryOnly: sorted.filter(c => !c.city && c.country).length,
  noLocation: sorted.filter(c => !c.country).length,
}

console.log('Wrote', outPath)
console.log(JSON.stringify(stats, null, 2))
