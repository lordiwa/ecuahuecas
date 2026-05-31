// Typed client wrappers for the role-management Cloud Functions (see
// functions/index.js). SSG-safe: Firebase is only touched inside the exported
// async functions, which run in the browser on the /admin/usuarios page.
//
// The functions themselves fail closed server-side (caller must hold the
// `admin` claim); these wrappers just give the page typed calls and shapes.
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from './firebase'

/** One row returned by `listCriticos`. */
export interface AdminUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  admin: boolean
  critico: boolean
}

export interface ListCriticosResult {
  users: AdminUser[]
}

export async function listCriticos(): Promise<AdminUser[]> {
  const fn = httpsCallable<unknown, ListCriticosResult>(
    getFirebaseFunctions(),
    'listCriticos',
  )
  const res = await fn()
  return res.data.users ?? []
}

export async function grantCriticoRole(uid: string): Promise<void> {
  const fn = httpsCallable<{ uid: string }, { ok: boolean }>(
    getFirebaseFunctions(),
    'grantCriticoRole',
  )
  await fn({ uid })
}

export async function revokeCriticoRole(uid: string): Promise<void> {
  const fn = httpsCallable<{ uid: string }, { ok: boolean }>(
    getFirebaseFunctions(),
    'revokeCriticoRole',
  )
  await fn({ uid })
}
