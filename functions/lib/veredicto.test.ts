import { describe, it, expect } from 'vitest'
// Import the PURE ESM helper directly. Like portableText.js / resolveHueca.js it
// must NOT pull in firebase-functions / @anthropic-ai/sdk / @sanity/client — it
// only normalizes a loosely-typed input into the structured veredicto shape.
import { normalizeVeredicto } from './veredicto.js'

describe('normalizeVeredicto', () => {
  it('keeps non-empty trimmed strings in aFavor / enContra and the ticket', () => {
    const out = normalizeVeredicto({
      aFavor: [' Caldo concentrado ', 'Atún fresco'],
      enContra: ['Local pequeño'],
      ticket: ' $3.50 ',
    })
    expect(out).toEqual({
      aFavor: ['Caldo concentrado', 'Atún fresco'],
      enContra: ['Local pequeño'],
      ticket: '$3.50',
    })
  })

  it('drops empty / whitespace-only / non-string array entries', () => {
    const out = normalizeVeredicto({
      aFavor: ['Bueno', '', '   ', 42 as unknown as string, null as unknown as string],
      enContra: ['  Malo  ', ''],
      ticket: '$5',
    })
    expect(out).toEqual({ aFavor: ['Bueno'], enContra: ['Malo'], ticket: '$5' })
  })

  it('omits ticket entirely when it is empty or whitespace', () => {
    const out = normalizeVeredicto({ aFavor: ['Rico'], enContra: [], ticket: '   ' })
    expect(out).toEqual({ aFavor: ['Rico'], enContra: [] })
    expect(out && 'ticket' in out).toBe(false)
  })

  it('omits ticket when not supplied', () => {
    const out = normalizeVeredicto({ aFavor: ['Rico'], enContra: [] })
    expect(out).toEqual({ aFavor: ['Rico'], enContra: [] })
  })

  it('returns undefined when both arrays are empty and there is no ticket', () => {
    expect(normalizeVeredicto({ aFavor: [], enContra: [] })).toBeUndefined()
    expect(normalizeVeredicto({ aFavor: ['  ', ''], enContra: [''], ticket: '' })).toBeUndefined()
  })

  it('returns undefined for a missing / non-object input', () => {
    expect(normalizeVeredicto(undefined)).toBeUndefined()
    expect(normalizeVeredicto(null)).toBeUndefined()
    expect(normalizeVeredicto('vale la pena' as unknown as object)).toBeUndefined()
  })

  it('tolerates missing arrays (treats them as empty)', () => {
    const out = normalizeVeredicto({ ticket: '$2' })
    expect(out).toEqual({ aFavor: [], enContra: [], ticket: '$2' })
  })

  it('returns a defined object when only the ticket is present', () => {
    const out = normalizeVeredicto({ aFavor: [], enContra: [], ticket: '$2' })
    expect(out).toEqual({ aFavor: [], enContra: [], ticket: '$2' })
  })
})
