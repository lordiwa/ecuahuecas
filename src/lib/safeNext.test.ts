import { describe, it, expect } from 'vitest'
import { safeNextPath } from './safeNext'

describe('safeNextPath', () => {
  it('accepts a plain same-site absolute path', () => {
    expect(safeNextPath('/admin/resenas')).toBe('/admin/resenas')
    expect(safeNextPath('/admin/usuarios?x=1')).toBe('/admin/usuarios?x=1')
  })

  it('rejects protocol-relative URLs (open-redirect)', () => {
    expect(safeNextPath('//evil.com')).toBe('/')
  })

  it('rejects the backslash variant that browsers normalize to //', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/')
  })

  it('rejects absolute and relative non-/ values', () => {
    expect(safeNextPath('https://evil.com')).toBe('/')
    expect(safeNextPath('admin/resenas')).toBe('/')
  })

  it('rejects non-string and empty values', () => {
    expect(safeNextPath(undefined)).toBe('/')
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath(['/admin'])).toBe('/')
    expect(safeNextPath('')).toBe('/')
  })

  it('honors a custom fallback', () => {
    expect(safeNextPath('//evil.com', '/login')).toBe('/login')
  })
})
