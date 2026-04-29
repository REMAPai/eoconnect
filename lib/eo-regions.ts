// Canonical EO region list — matches the dropdown on
// member.eonetwork.org/about/chapter-locations.
// Keep in sync with the CHECK constraint in migration 008.
export const EO_REGIONS = [
  'Asia Pacific',
  'Canada',
  'Europe',
  'Japan',
  'Latin America/Caribbean',
  'MEPA',
  'North Asia',
  'South Asia',
  'United States - Central',
  'United States - East',
  'United States - West',
] as const

export type EORegion = (typeof EO_REGIONS)[number]

export function isEORegion(value: unknown): value is EORegion {
  return typeof value === 'string' && (EO_REGIONS as readonly string[]).includes(value)
}
