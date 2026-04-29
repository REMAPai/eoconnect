// Portfolio upload limits — single source of truth shared between
// client validation, server validation, and any UI copy.
export const PORTFOLIO_MAX_FILES = 5
export const PORTFOLIO_MAX_TOTAL_BYTES = 25 * 1024 * 1024 // 25 MB

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Returns an error message if adding `incoming` files to `existing` files
 * would exceed limits. Returns null when ok.
 */
export function validatePortfolioAddition(
  existing: { size: number }[],
  incoming: { size: number }[]
): string | null {
  const totalCount = existing.length + incoming.length
  if (totalCount > PORTFOLIO_MAX_FILES) {
    return `Maximum ${PORTFOLIO_MAX_FILES} portfolio files`
  }
  const totalBytes = [...existing, ...incoming].reduce((sum, f) => sum + (f.size ?? 0), 0)
  if (totalBytes > PORTFOLIO_MAX_TOTAL_BYTES) {
    return `Portfolio total size ${formatBytes(totalBytes)} exceeds the ${formatBytes(PORTFOLIO_MAX_TOTAL_BYTES)} limit`
  }
  return null
}
