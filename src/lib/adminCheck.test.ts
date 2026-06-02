import { describe, it, expect, vi, beforeEach } from 'vitest'

// adminCheck.ts wraps the `checkAdmin` Cloud Function. We mock BOTH the
// firebase/functions SDK and the local firebase module so the unit test never
// touches a live project — it asserts the right callable NAME is invoked and
// that the boolean is mapped correctly. SSG-safe (no Firebase at import time).

const callable = vi.fn()
const callableNames: string[] = []

vi.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => {
    callableNames.push(name)
    return callable
  },
}))

vi.mock('./firebase', () => ({
  getFirebaseFunctions: () => ({ __fake: true }),
}))

import { checkAdmin } from './adminCheck'

beforeEach(() => {
  callable.mockReset()
  callableNames.length = 0
})

describe('checkAdmin', () => {
  it('invokes the checkAdmin callable and returns true when admin', async () => {
    callable.mockResolvedValue({ data: { admin: true } })
    const res = await checkAdmin()
    expect(callableNames).toContain('checkAdmin')
    expect(res).toBe(true)
  })

  it('returns false when the server says admin:false', async () => {
    callable.mockResolvedValue({ data: { admin: false } })
    expect(await checkAdmin()).toBe(false)
  })

  it('returns false when the response is missing/garbled (fail closed)', async () => {
    callable.mockResolvedValue({ data: {} })
    expect(await checkAdmin()).toBe(false)
  })
})
