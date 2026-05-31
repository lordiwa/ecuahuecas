import { describe, it, expect } from 'vitest'
import { authErrorMessage, getAuthErrorCode } from './authErrors'

describe('getAuthErrorCode', () => {
  it('extracts the string code from a Firebase-style error', () => {
    expect(getAuthErrorCode({ code: 'auth/wrong-password' })).toBe(
      'auth/wrong-password',
    )
  })

  it('returns undefined when there is no code', () => {
    expect(getAuthErrorCode(new Error('boom'))).toBeUndefined()
    expect(getAuthErrorCode(null)).toBeUndefined()
    expect(getAuthErrorCode('nope')).toBeUndefined()
  })
})

describe('authErrorMessage', () => {
  it('maps known auth codes to Spanish and never leaks the raw code', () => {
    const msg = authErrorMessage({ code: 'auth/invalid-credential' })
    expect(msg).toBe('Correo o contraseña incorrectos.')
    expect(msg).not.toContain('auth/')
  })

  it('maps popup-closed to a friendly message', () => {
    expect(authErrorMessage({ code: 'auth/popup-closed-by-user' })).toContain(
      'Cerraste la ventana',
    )
  })

  it('passes through our own config Error message (no code)', () => {
    const err = new Error('Firebase no está configurado: faltan VITE_FIREBASE_API_KEY.')
    expect(authErrorMessage(err)).toContain('Firebase no está configurado')
  })

  it('falls back to a generic message for unknown codes', () => {
    const msg = authErrorMessage({ code: 'auth/some-future-code' })
    expect(msg).toBe('No se pudo completar la operación. Inténtalo de nuevo.')
    expect(msg).not.toContain('auth/')
  })

  it('falls back to generic for non-error values', () => {
    expect(authErrorMessage(42)).toBe(
      'No se pudo completar la operación. Inténtalo de nuevo.',
    )
  })
})
