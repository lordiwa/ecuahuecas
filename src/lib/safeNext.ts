// Hardened same-site redirect validation, shared by the router guard (which
// BUILDS the `?next=` param) and login.vue (which CONSUMES it). Keeping a single
// source of truth prevents the two ends from disagreeing about what's safe.
//
// Pure, no Vue/Firebase — unit-testable and SSG-safe.

/**
 * Returns `value` only when it is a safe same-site absolute path; otherwise
 * `fallback`. Rejects:
 *  - non-strings / empty
 *  - anything not starting with "/" (absolute URLs, relative paths)
 *  - protocol-relative "//evil.com" and the backslash variant "/\evil.com"
 *    (browsers normalize "/\" to "//", enabling open redirects)
 */
export function safeNextPath(value: unknown, fallback = '/'): string {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  ) {
    return value
  }
  return fallback
}
