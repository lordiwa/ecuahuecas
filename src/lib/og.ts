/**
 * Open Graph / social-card URL helpers (TASK-014).
 *
 * Social scrapers (Facebook, WhatsApp, Twitter/X, Telegram) require ABSOLUTE
 * `og:image` and `og:url` values — a root-relative path is silently dropped.
 * Sanity CDN URLs are already absolute; only the static fallback and our own
 * page paths need to be prefixed with the site base.
 *
 * The site base is configurable via `VITE_SITE_URL` so the real domain can be
 * swapped in (TASK-015) without code changes. The default is the Firebase
 * Hosting URL the project ships to first.
 *
 * Both functions are PURE (no DOM, no fetch) and unit-tested in og.test.ts.
 */

/** Configurable site base, no trailing slash. */
export const SITE_URL: string = (
  (import.meta as ImportMeta).env?.VITE_SITE_URL || 'https://ecuahuecas.web.app'
).replace(/\/+$/, '')

/** Path of the committed static fallback social card (1200x630). */
const FALLBACK_PATH = '/og-default.png'

/**
 * Turn a path or URL into an absolute URL.
 * - Already-absolute http(s) URLs are returned unchanged.
 * - Everything else is treated as a site path and prefixed with SITE_URL,
 *   guaranteeing exactly one slash between base and path.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const rel = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${rel}`
}

/** Sanity transform params for a 1200x630 social card. */
const OG_PARAMS = 'w=1200&h=630&fit=crop&auto=format'

/**
 * Resolve the `og:image` URL for a piece of content.
 *
 * @param src  The content's own image — a Sanity CDN URL (already absolute) or
 *             undefined/empty when the content has no photo.
 * @returns    For a Sanity URL: the same URL with social-card transform params
 *             appended (using `&` if it already has a query string, `?`
 *             otherwise). For undefined/empty: the ABSOLUTE static fallback.
 */
export function ogImageUrl(src: string | undefined | null): string {
  if (!src) return absoluteUrl(FALLBACK_PATH)
  const sep = src.includes('?') ? '&' : '?'
  return `${src}${sep}${OG_PARAMS}`
}
