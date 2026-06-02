import { describe, it, expect, vi, beforeEach } from 'vitest'

// The wrappers in adminUsers.ts call Firebase's httpsCallable against the
// lazily-initialized Functions instance. We mock BOTH the firebase/functions
// SDK and the local firebase module so the unit tests never touch a live
// project — they assert the right callable NAME is invoked with the right
// payload and that the response is mapped correctly. This keeps the module
// SSG-safe (no Firebase at import time) while still covering the wrappers.

// A single shared spy that every httpsCallable() returns; each test sets its
// resolved value. Calls record [name] (captured via the factory below).
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

import {
  listCriticos,
  grantCriticoRole,
  revokeCriticoRole,
  requestCriticoRole,
  bootstrapAdmin,
  sortByRequestThenName,
  type AdminUser,
} from './adminUsers'

function makeUser(over: Partial<AdminUser> = {}): AdminUser {
  return {
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'Alice',
    photoURL: null,
    admin: false,
    critico: false,
    criticoRequested: false,
    ...over,
  }
}

beforeEach(() => {
  callable.mockReset()
  callableNames.length = 0
})

describe('listCriticos', () => {
  it('invokes the listCriticos callable and returns its users array', async () => {
    callable.mockResolvedValue({ data: { users: [makeUser({ criticoRequested: true })] } })
    const users = await listCriticos()
    expect(callableNames).toContain('listCriticos')
    expect(users).toHaveLength(1)
    // The criticoRequested flag must survive the wrapper untouched.
    expect(users[0].criticoRequested).toBe(true)
  })

  it('returns an empty array when the response has no users', async () => {
    callable.mockResolvedValue({ data: {} })
    expect(await listCriticos()).toEqual([])
  })
})

describe('grantCriticoRole', () => {
  it('invokes grantCriticoRole with the uid', async () => {
    callable.mockResolvedValue({ data: { ok: true } })
    await grantCriticoRole('uid-123')
    expect(callableNames).toContain('grantCriticoRole')
    expect(callable).toHaveBeenCalledWith({ uid: 'uid-123' })
  })
})

describe('revokeCriticoRole', () => {
  it('invokes revokeCriticoRole with the uid', async () => {
    callable.mockResolvedValue({ data: { ok: true } })
    await revokeCriticoRole('uid-123')
    expect(callableNames).toContain('revokeCriticoRole')
    expect(callable).toHaveBeenCalledWith({ uid: 'uid-123' })
  })
})

describe('requestCriticoRole', () => {
  it('invokes the requestCriticoRole callable with no payload', async () => {
    callable.mockResolvedValue({ data: { ok: true } })
    await requestCriticoRole()
    expect(callableNames).toContain('requestCriticoRole')
    expect(callable).toHaveBeenCalledTimes(1)
  })

  it('returns the server result (so already:true can be handled)', async () => {
    callable.mockResolvedValue({ data: { ok: true, already: true } })
    const res = await requestCriticoRole()
    expect(res.ok).toBe(true)
    expect(res.already).toBe(true)
  })
})

describe('bootstrapAdmin', () => {
  it('invokes the bootstrapAdmin callable with no payload', async () => {
    callable.mockResolvedValue({ data: { ok: true, admin: true } })
    await bootstrapAdmin()
    expect(callableNames).toContain('bootstrapAdmin')
    expect(callable).toHaveBeenCalledTimes(1)
  })

  it('propagates a rejection (non-ADMIN_EMAIL gets "No estás autorizado")', async () => {
    callable.mockRejectedValue(Object.assign(new Error('No estás autorizado'), {
      code: 'functions/permission-denied',
    }))
    await expect(bootstrapAdmin()).rejects.toThrow('No estás autorizado')
  })
})

describe('sortByRequestThenName', () => {
  it('places users who requested access (and are not yet critico/admin) first', () => {
    const list: AdminUser[] = [
      makeUser({ uid: 'a', displayName: 'Zoe', critico: true }),
      makeUser({ uid: 'b', displayName: 'Bob', criticoRequested: true }),
      makeUser({ uid: 'c', displayName: 'Ana' }),
    ]
    const sorted = sortByRequestThenName(list)
    expect(sorted[0].uid).toBe('b') // requester first
  })

  it('does not treat an already-critico requester as a pending requester', () => {
    const list: AdminUser[] = [
      makeUser({ uid: 'a', displayName: 'Ana' }),
      // criticoRequested but already critico → not pending, should not jump first
      makeUser({ uid: 'b', displayName: 'Bob', critico: true, criticoRequested: true }),
    ]
    const sorted = sortByRequestThenName(list)
    expect(sorted[0].uid).toBe('a')
  })

  it('does not mutate the input array', () => {
    const list = [makeUser({ uid: 'a' })]
    const copy = [...list]
    sortByRequestThenName(list)
    expect(list).toEqual(copy)
  })
})
