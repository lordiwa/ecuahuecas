import { describe, it, expect, vi } from 'vitest'
// Import the PURE ESM helpers directly. Like portableText.js / resolveHueca.js
// this module must NOT pull in firebase-admin / firebase-functions — the
// allowlist math and the authorization decision are dependency-injected so they
// are unit-testable without a live Firestore or Auth.
import { emailInList, verifiedEmailFrom, authorizeAdmin } from './adminAllowlist.js'

describe('emailInList', () => {
  it('is true when the email is present in the list', () => {
    expect(emailInList('a@b.com', ['a@b.com'])).toBe(true)
  })

  it('is case-insensitive on both the email and the list entries', () => {
    expect(emailInList('A@B.com', ['a@b.com'])).toBe(true)
    expect(emailInList('a@b.com', ['A@B.COM'])).toBe(true)
    expect(emailInList('  Mixed@Case.com ', ['mixed@case.com'])).toBe(true)
  })

  it('is false when the email is not in the list', () => {
    expect(emailInList('x@y.com', ['a@b.com', 'c@d.com'])).toBe(false)
  })

  it('is false for an empty / missing email', () => {
    expect(emailInList('', ['a@b.com'])).toBe(false)
    expect(emailInList(null, ['a@b.com'])).toBe(false)
    expect(emailInList(undefined, ['a@b.com'])).toBe(false)
  })

  it('is false for an empty / missing list', () => {
    expect(emailInList('a@b.com', [])).toBe(false)
    expect(emailInList('a@b.com', null)).toBe(false)
    expect(emailInList('a@b.com', undefined)).toBe(false)
  })

  it('ignores non-string entries in the list (fail closed)', () => {
    expect(emailInList('a@b.com', [null, 42, 'a@b.com'])).toBe(true)
    expect(emailInList('a@b.com', [null, 42])).toBe(false)
  })
})

describe('verifiedEmailFrom', () => {
  it('returns the lowercased email when auth is present and verified', () => {
    expect(verifiedEmailFrom({ token: { email: 'A@B.com', email_verified: true } })).toBe(
      'a@b.com',
    )
  })

  it('returns null when there is no auth context', () => {
    expect(verifiedEmailFrom(null)).toBe(null)
    expect(verifiedEmailFrom(undefined)).toBe(null)
  })

  it('returns null when the email is not verified', () => {
    expect(verifiedEmailFrom({ token: { email: 'a@b.com', email_verified: false } })).toBe(null)
    expect(verifiedEmailFrom({ token: { email: 'a@b.com' } })).toBe(null)
  })

  it('returns null when there is no email on the token', () => {
    expect(verifiedEmailFrom({ token: { email_verified: true } })).toBe(null)
  })
})

describe('authorizeAdmin', () => {
  it('resolves true for a verified email that is in the allowlist', async () => {
    const isAdminEmail = vi.fn().mockResolvedValue(true)
    const ok = await authorizeAdmin(
      { token: { email: 'a@b.com', email_verified: true } },
      isAdminEmail,
    )
    expect(ok).toBe(true)
    // Delegates to the IO lookup with the lowercased verified email.
    expect(isAdminEmail).toHaveBeenCalledWith('a@b.com')
  })

  it('resolves false (without an IO lookup) when there is no auth', async () => {
    const isAdminEmail = vi.fn().mockResolvedValue(true)
    expect(await authorizeAdmin(null, isAdminEmail)).toBe(false)
    expect(isAdminEmail).not.toHaveBeenCalled()
  })

  it('resolves false (without an IO lookup) when the email is unverified', async () => {
    const isAdminEmail = vi.fn().mockResolvedValue(true)
    expect(
      await authorizeAdmin({ token: { email: 'a@b.com', email_verified: false } }, isAdminEmail),
    ).toBe(false)
    expect(isAdminEmail).not.toHaveBeenCalled()
  })

  it('resolves false when the verified email is not in the allowlist', async () => {
    const isAdminEmail = vi.fn().mockResolvedValue(false)
    expect(
      await authorizeAdmin({ token: { email: 'x@y.com', email_verified: true } }, isAdminEmail),
    ).toBe(false)
    expect(isAdminEmail).toHaveBeenCalledWith('x@y.com')
  })
})
