// Chapter admin scope rules.
//
// EO chapters are mixed granularity — some are city-level (EO Sydney),
// some are country-level (EO Pakistan). A chapter_admin's authority
// matches their chapter's scope:
//   - admin_scope_country + admin_scope_city set
//       → only manages members/businesses in that exact city+country
//   - admin_scope_country set, admin_scope_city null
//       → manages anyone in that country (country-level chapter)

export interface ChapterScope {
  country: string | null
  city: string | null
}

export interface LocatedTarget {
  chapter_country: string | null
  chapter_city: string | null
}

/**
 * Returns true when `target` is within `admin`'s area of authority.
 * If admin has no scope_country set, returns false (must explicitly scope).
 */
export function isInChapterScope(target: LocatedTarget, admin: ChapterScope): boolean {
  if (!admin.country) return false
  if (target.chapter_country !== admin.country) return false
  if (admin.city && target.chapter_city !== admin.city) return false
  return true
}

/**
 * Human-readable description of a chapter scope, e.g. "Sydney, Australia"
 * or "Pakistan (country-wide)".
 */
export function describeChapterScope(scope: ChapterScope): string {
  if (!scope.country) return 'unscoped'
  if (scope.city) return `${scope.city}, ${scope.country}`
  return `${scope.country} (country-wide)`
}
