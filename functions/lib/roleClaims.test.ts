import { describe, it, expect } from 'vitest'
// Import the PURE ESM helper directly. Like portableText.js / resolveHueca.js it
// must NOT pull in firebase-functions / firebase-admin — it operates on plain
// claim objects so the merge logic is unit-testable without live Auth.
import {
  requestedClaims,
  grantedCriticoClaims,
  alreadyHasCriticoAccess,
} from './roleClaims.js'

describe('alreadyHasCriticoAccess', () => {
  it('is true when the caller is already a crítico', () => {
    expect(alreadyHasCriticoAccess({ critico: true })).toBe(true)
  })

  it('is true when the caller is an admin (admins are implicitly críticos)', () => {
    expect(alreadyHasCriticoAccess({ admin: true })).toBe(true)
    expect(alreadyHasCriticoAccess({ admin: true, critico: false })).toBe(true)
  })

  it('is false for a plain user with neither claim', () => {
    expect(alreadyHasCriticoAccess({})).toBe(false)
    expect(alreadyHasCriticoAccess(null)).toBe(false)
    expect(alreadyHasCriticoAccess(undefined)).toBe(false)
    expect(alreadyHasCriticoAccess({ criticoRequested: true })).toBe(false)
  })
})

describe('requestedClaims', () => {
  it('merges criticoRequested:true onto existing claims', () => {
    expect(requestedClaims({})).toEqual({ criticoRequested: true })
  })

  it('preserves any unrelated existing claims', () => {
    expect(requestedClaims({ foo: 'bar' })).toEqual({
      foo: 'bar',
      criticoRequested: true,
    })
  })

  it('grants NO privileges — never sets critico or admin', () => {
    const out = requestedClaims({})
    expect(out.critico).toBeUndefined()
    expect(out.admin).toBeUndefined()
  })

  it('does not mutate the input object', () => {
    const input = { foo: 1 }
    requestedClaims(input)
    expect(input).toEqual({ foo: 1 })
  })

  it('treats null/undefined existing claims as empty', () => {
    expect(requestedClaims(null)).toEqual({ criticoRequested: true })
    expect(requestedClaims(undefined)).toEqual({ criticoRequested: true })
  })
})

describe('grantedCriticoClaims', () => {
  it('sets critico:true', () => {
    expect(grantedCriticoClaims({}).critico).toBe(true)
  })

  it('clears the criticoRequested flag when promoting', () => {
    const out = grantedCriticoClaims({ criticoRequested: true })
    expect(out.critico).toBe(true)
    expect('criticoRequested' in out).toBe(false)
  })

  it('preserves an existing admin claim while granting crítico', () => {
    const out = grantedCriticoClaims({ admin: true, criticoRequested: true })
    expect(out.admin).toBe(true)
    expect(out.critico).toBe(true)
    expect('criticoRequested' in out).toBe(false)
  })

  it('preserves unrelated claims', () => {
    const out = grantedCriticoClaims({ foo: 'bar' })
    expect(out.foo).toBe('bar')
    expect(out.critico).toBe(true)
  })

  it('does not mutate the input object', () => {
    const input = { criticoRequested: true }
    grantedCriticoClaims(input)
    expect(input).toEqual({ criticoRequested: true })
  })

  it('treats null/undefined existing claims as empty', () => {
    expect(grantedCriticoClaims(null)).toEqual({ critico: true })
    expect(grantedCriticoClaims(undefined)).toEqual({ critico: true })
  })
})
