import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { flushPromises } from '../../test/flushPromises'

// useRole now derives `isAdmin` from the checkAdmin Cloud Function (no custom
// claims). We mock useAuth so we can drive `currentUser`, and adminCheck so we
// control what the server "would" answer — the test asserts isAdmin reflects it.
//
// vi.mock factories are hoisted above the imports, so they must not reference
// module-scope bindings created later. We stash a mutable holder via vi.hoisted
// (also hoisted) and populate its `currentUser` ref from inside the suite.
const h = vi.hoisted(() => ({
  currentUser: null as unknown as Ref<{ uid: string } | null>,
  checkAdmin: vi.fn(),
}))

vi.mock('./useAuth', () => ({
  useAuth: () => ({ currentUser: h.currentUser }),
}))

vi.mock('@/lib/adminCheck', () => ({
  checkAdmin: () => h.checkAdmin(),
}))

const currentUser = ref<{ uid: string } | null>(null)
h.currentUser = currentUser

import { useRole } from './useRole'

beforeEach(() => {
  currentUser.value = null
  h.checkAdmin.mockReset()
})

describe('useRole.isAdmin', () => {
  it('is false while there is no signed-in user (and never calls checkAdmin)', async () => {
    h.checkAdmin.mockResolvedValue(true)
    const { isAdmin } = useRole()
    await flushPromises()
    expect(isAdmin.value).toBe(false)
    expect(h.checkAdmin).not.toHaveBeenCalled()
  })

  it('becomes true when a signed-in admin is confirmed by checkAdmin', async () => {
    h.checkAdmin.mockResolvedValue(true)
    const { isAdmin } = useRole()
    currentUser.value = { uid: 'u1' }
    await flushPromises()
    expect(h.checkAdmin).toHaveBeenCalled()
    expect(isAdmin.value).toBe(true)
  })

  it('stays false for a signed-in non-admin', async () => {
    h.checkAdmin.mockResolvedValue(false)
    const { isAdmin } = useRole()
    currentUser.value = { uid: 'u2' }
    await flushPromises()
    expect(isAdmin.value).toBe(false)
  })

  it('fails closed to false when checkAdmin rejects', async () => {
    h.checkAdmin.mockRejectedValue(new Error('network'))
    const { isAdmin } = useRole()
    currentUser.value = { uid: 'u3' }
    await flushPromises()
    expect(isAdmin.value).toBe(false)
  })

  it('resets to false when the user signs out', async () => {
    h.checkAdmin.mockResolvedValue(true)
    const { isAdmin } = useRole()
    currentUser.value = { uid: 'u1' }
    await flushPromises()
    expect(isAdmin.value).toBe(true)
    currentUser.value = null
    await flushPromises()
    expect(isAdmin.value).toBe(false)
  })
})
