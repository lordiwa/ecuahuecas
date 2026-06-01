import { describe, it, expect } from 'vitest'
import { ogImageUrl, absoluteUrl, SITE_URL } from './og'

/**
 * Contract for the OG/meta helper (TASK-014). Social scrapers (Facebook,
 * WhatsApp, Twitter) require ABSOLUTE og:image / og:url URLs. Sanity CDN URLs
 * are already absolute; the static fallback must be prefixed with the site
 * base. These pure functions are the unit-tested core that the Vue pages call
 * from their `useHead` blocks.
 */
describe('absoluteUrl', () => {
  it('prefixes a root-relative path with the site base', () => {
    expect(absoluteUrl('/og-default.png')).toBe(`${SITE_URL}/og-default.png`)
  })

  it('prefixes a path with no leading slash too (single slash, no double)', () => {
    expect(absoluteUrl('resenas/foo')).toBe(`${SITE_URL}/resenas/foo`)
  })

  it('leaves an already-absolute http(s) URL untouched', () => {
    const abs = 'https://cdn.sanity.io/images/p/production/abc.webp'
    expect(absoluteUrl(abs)).toBe(abs)
  })

  it('does not produce a double slash when the path already starts with /', () => {
    expect(absoluteUrl('/buscar')).toBe(`${SITE_URL}/buscar`)
    expect(absoluteUrl('/buscar')).not.toContain('//buscar')
  })
})

describe('ogImageUrl', () => {
  const SANITY = 'https://cdn.sanity.io/images/gvc4yjqj/production/abc-1238x683.webp'

  it('appends social-card transform params to a bare Sanity URL', () => {
    const out = ogImageUrl(SANITY)
    expect(out.startsWith(SANITY)).toBe(true)
    expect(out).toContain('w=1200')
    expect(out).toContain('h=630')
    expect(out).toContain('fit=crop')
    expect(out).toContain('auto=format')
    // Bare URL → params introduced with '?'
    expect(out).toContain('?')
    expect(out).not.toContain('??')
  })

  it('appends with & when the URL already has a query string', () => {
    const withQuery = `${SANITY}?rect=0,0,100,100`
    const out = ogImageUrl(withQuery)
    expect(out.startsWith(withQuery)).toBe(true)
    expect(out).toContain('&w=1200')
    expect(out).not.toContain('?w=1200')
    // Original query preserved exactly once.
    expect(out.indexOf('rect=0,0,100,100')).toBe(out.lastIndexOf('rect=0,0,100,100'))
  })

  it('returns the ABSOLUTE static fallback for undefined', () => {
    expect(ogImageUrl(undefined)).toBe(`${SITE_URL}/og-default.png`)
  })

  it('returns the ABSOLUTE static fallback for an empty string', () => {
    expect(ogImageUrl('')).toBe(`${SITE_URL}/og-default.png`)
  })

  it('the fallback is an absolute URL (scrapers reject relative)', () => {
    expect(ogImageUrl(undefined)).toMatch(/^https?:\/\//)
  })
})
