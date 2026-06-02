// Typed client wrapper for the `checkAdmin` Cloud Function (see functions/
// index.js). SSG-safe: Firebase is only touched inside the exported async
// function, which runs in the browser after the user is known.
//
// The function is the real gate (it re-reads the Firestore allowlist server-
// side); this wrapper just gives the app a typed boolean. It deliberately maps
// any missing/garbled response to `false` so the UI fails closed.
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from './firebase'

interface CheckAdminResult {
  admin?: boolean
}

/**
 * Ask the server whether the signed-in caller is an admin (their verified email
 * is in config/admins). Must be called only when a user is signed in — the
 * callable throws `unauthenticated` otherwise.
 */
export async function checkAdmin(): Promise<boolean> {
  const fn = httpsCallable<unknown, CheckAdminResult>(getFirebaseFunctions(), 'checkAdmin')
  const res = await fn()
  return res.data?.admin === true
}
