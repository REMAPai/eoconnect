/**
 * Normalize a user-supplied URL so it always points at an absolute external
 * destination. If the user typed `www.linkedin.com/in/foo` (no protocol),
 * the browser would interpret it as a same-origin relative path and link
 * to `/marketplace/.../www.linkedin.com/in/foo` — which is broken.
 *
 * Rules:
 *   - empty / null / undefined  → returns null
 *   - already starts with http:// or https://  → returned as-is
 *   - starts with //  → prepend https:
 *   - anything else  → prepend https://
 */
export function externalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('//')) return `https:${t}`
  return `https://${t}`
}
