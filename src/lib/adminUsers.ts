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
  /** Self-service marker: the user asked for the crítico role (TASK-024). */
  criticoRequested: boolean
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

/** Result of the self-service crítico request (TASK-024). */
export interface RequestCriticoResult {
  ok: boolean
  /** True when the caller was already crítico/admin (amicable no-op). */
  already?: boolean
  requested?: boolean
}

/**
 * Self-service: the signed-in user requests the crítico role. Grants nothing;
 * it only marks the request so an admin can approve it in /admin/usuarios.
 */
export async function requestCriticoRole(): Promise<RequestCriticoResult> {
  const fn = httpsCallable<unknown, RequestCriticoResult>(
    getFirebaseFunctions(),
    'requestCriticoRole',
  )
  const res = await fn()
  return res.data
}

/** Result of the admin bootstrap callable. */
export interface BootstrapAdminResult {
  ok: boolean
  uid?: string
  admin?: boolean
}

/**
 * One-time admin bootstrap from the UI (replaces the old dev-only console
 * helper). The server only succeeds for the configured ADMIN_EMAIL with a
 * verified email; everyone else gets a `permission-denied` ("No estás
 * autorizado") which the caller surfaces via authErrorMessage.
 */
export async function bootstrapAdmin(): Promise<BootstrapAdminResult> {
  const fn = httpsCallable<unknown, BootstrapAdminResult>(
    getFirebaseFunctions(),
    'bootstrapAdmin',
  )
  const res = await fn()
  return res.data
}

/**
 * Pure ordering helper for /admin/usuarios: surface PENDING crítico requesters
 * (criticoRequested && not yet critico && not admin) first, then everyone else
 * by display name. Does not mutate the input array.
 */
export function sortByRequestThenName(users: AdminUser[]): AdminUser[] {
  const isPending = (u: AdminUser) => u.criticoRequested && !u.critico && !u.admin
  const label = (u: AdminUser) => (u.displayName || u.email || u.uid).toLowerCase()
  return [...users].sort((a, b) => {
    const pa = isPending(a)
    const pb = isPending(b)
    if (pa !== pb) return pa ? -1 : 1
    return label(a).localeCompare(label(b))
  })
}
