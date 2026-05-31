import { describe, it, expect } from 'vitest'
import { deriveIsAdmin, deriveIsCritico } from './roleClaims'

describe('deriveIsAdmin', () => {
  it('is true only when admin is exactly boolean true', () => {
    expect(deriveIsAdmin({ admin: true })).toBe(true)
  })

  it('is false for falsy/missing/truthy-non-true admin', () => {
    expect(deriveIsAdmin({ admin: false })).toBe(false)
    expect(deriveIsAdmin({})).toBe(false)
    expect(deriveIsAdmin(null)).toBe(false)
    expect(deriveIsAdmin(undefined)).toBe(false)
    // A non-boolean truthy value must not be treated as admin (fail closed).
    expect(deriveIsAdmin({ admin: 'true' as unknown as boolean })).toBe(false)
    expect(deriveIsAdmin({ admin: 1 as unknown as boolean })).toBe(false)
  })
})

describe('deriveIsCritico', () => {
  it('is true when critico is true', () => {
    expect(deriveIsCritico({ critico: true })).toBe(true)
  })

  it('folds admin in: an admin is implicitly a crítico', () => {
    expect(deriveIsCritico({ admin: true })).toBe(true)
    expect(deriveIsCritico({ admin: true, critico: false })).toBe(true)
  })

  it('is false with neither claim', () => {
    expect(deriveIsCritico({})).toBe(false)
    expect(deriveIsCritico(null)).toBe(false)
    expect(deriveIsCritico({ critico: false, admin: false })).toBe(false)
  })
})
