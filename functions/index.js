// EcuaHuecas Cloud Functions — minimal auth bootstrap.
//
// bootstrapAdmin: a callable that grants the custom claim { admin: true } to the
// authenticated caller IF their email matches the configured ADMIN_EMAIL. This
// is how the very first admin is minted without hardcoding any identity in the
// committed source.
//
// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURE & DEPLOY (the user's parallel task — do NOT run from CI):
//
//   1. Upgrade the Firebase project to the Blaze (pay-as-you-go) plan.
//        Functions v2 requires Blaze.
//   2. From the repo root: `firebase login` (once).
//   3. Set the admin email. ADMIN_EMAIL is read at runtime from a Functions
//      param (defineString) — it is NOT committed. Provide it via either:
//        a) a local .env file for functions:
//             functions/.env  ->  ADMIN_EMAIL=you@example.com
//           (already gitignored by the repo's .env.* rule), or
//        b) Secret/param at deploy time; the CLI will prompt for ADMIN_EMAIL
//           the first time you deploy if it is unset.
//   4. Install deps:  (cd functions && npm install)
//   5. Deploy:        firebase deploy --only functions
//
// USE (from the browser, after signing in as the admin email):
//   import { getFunctions, httpsCallable } from 'firebase/functions'
//   await httpsCallable(getFunctions(), 'bootstrapAdmin')()
//   // then force a token refresh:  await getAuth().currentUser.getIdToken(true)
// ─────────────────────────────────────────────────────────────────────────────

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import {
  alreadyHasCriticoAccess,
  requestedClaims,
  grantedCriticoClaims,
} from './lib/roleClaims.js'

initializeApp()

// Publishing callables (Claude draft + Sanity publish). Kept in their own module
// to keep this file readable; re-exported here so the Functions deploy picks
// them up. See publishResena.js for the GEN2 CALLABLE GOTCHA notes.
export { generateResenaDraft, publishResena } from './publishResena.js'

// Read at deploy/runtime; never hardcoded. See header for how to set it.
const ADMIN_EMAIL = defineString('ADMIN_EMAIL')

export const bootstrapAdmin = onCall(async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  }

  const callerEmail = (auth.token.email || '').toLowerCase()
  const expected = (ADMIN_EMAIL.value() || '').toLowerCase()

  if (!expected) {
    throw new HttpsError(
      'failed-precondition',
      'ADMIN_EMAIL no está configurado en el servidor.',
    )
  }

  // Require a verified email to prevent spoofing via unverified providers.
  if (!auth.token.email_verified) {
    throw new HttpsError('permission-denied', 'Tu correo no está verificado.')
  }

  if (callerEmail !== expected) {
    throw new HttpsError('permission-denied', 'No estás autorizado.')
  }

  await getAuth().setCustomUserClaims(auth.uid, { admin: true })

  return { ok: true, uid: auth.uid, admin: true }
})

// ─────────────────────────────────────────────────────────────────────────────
// SELF-SERVICE CRÍTICO REQUEST (TASK-024)
//
// requestCriticoRole: any AUTHENTICATED user can flag themselves as wanting the
// crítico role. It grants NO privilege — it only merges `criticoRequested: true`
// onto the CALLER'S OWN claims so an admin sees the request in /admin/usuarios.
// No-op (and `already: true`) if the caller is already crítico or admin.
//
// GEN2 GOTCHA (see publishResena.js): an unauthenticated HTTP call must return
// 401, which `throw new HttpsError('unauthenticated', …)` produces here.
//
// DEPLOY (user's step — needs `firebase login` + Blaze):
//   firebase deploy --only functions:requestCriticoRole
// ─────────────────────────────────────────────────────────────────────────────
export const requestCriticoRole = onCall(async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  }

  // Amicable no-op if they already hold (or out-rank) the crítico role: setting
  // the request flag would be noise an admin then has to dismiss.
  if (alreadyHasCriticoAccess(auth.token)) {
    return { ok: true, already: true }
  }

  // Merge so we never clobber other claims; grants nothing, only marks intent.
  const claims = await existingClaims(auth.uid)
  await getAuth().setCustomUserClaims(auth.uid, requestedClaims(claims))

  return { ok: true, requested: true }
})

// ─────────────────────────────────────────────────────────────────────────────
// ROLE MANAGEMENT (admin only)
//
// grantCriticoRole / revokeCriticoRole / listCriticos power the
// /admin/usuarios page. Each FAILS CLOSED: the caller must already hold the
// `admin` custom claim. `unauthenticated` when no auth; `permission-denied`
// otherwise. Claims are merged (never blindly overwritten) so granting/revoking
// `critico` preserves an existing `admin` claim and vice versa.
//
// DEPLOY (user's later step — needs `firebase login` + Blaze):
//   (cd functions && npm install)
//   firebase deploy --only functions:grantCriticoRole,functions:revokeCriticoRole,functions:listCriticos
//
// NOTE: role changes only take effect after the TARGET user refreshes their ID
// token (client calls `getIdToken(true)` — exposed as `refreshClaims()` in the
// app's useRole composable).
//
// TODO(appcheck): add `enforceAppCheck: true` to these onCall options once App
// Check is wired on the client. Not blocking this ticket.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Throw unless the caller is authenticated AND holds `admin === true`.
 * Returns the verified auth context.
 */
function assertCallerIsAdmin(request) {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  }
  if (auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Requiere privilegios de administrador.')
  }
  return auth
}

/** Validate and return a non-empty string uid from the request payload. */
function requireUid(data) {
  const uid = data && typeof data.uid === 'string' ? data.uid.trim() : ''
  if (!uid) {
    throw new HttpsError('invalid-argument', 'Falta el uid del usuario.')
  }
  return uid
}

/** Read a user's existing custom claims (never returns null). */
async function existingClaims(uid) {
  const user = await getAuth().getUser(uid)
  return user.customClaims || {}
}

export const grantCriticoRole = onCall(async (request) => {
  assertCallerIsAdmin(request)
  const uid = requireUid(request.data)

  // Merge so we preserve any other claims (e.g. admin) and clear the
  // now-satisfied self-service request marker (criticoRequested).
  const claims = await existingClaims(uid)
  await getAuth().setCustomUserClaims(uid, grantedCriticoClaims(claims))

  return { ok: true, uid, critico: true }
})

export const revokeCriticoRole = onCall(async (request) => {
  assertCallerIsAdmin(request)
  const uid = requireUid(request.data)

  // Strip `critico` only; keep everything else.
  const claims = await existingClaims(uid)
  const { critico: _drop, ...rest } = claims
  await getAuth().setCustomUserClaims(uid, rest)

  return { ok: true, uid, critico: false }
})

export const listCriticos = onCall(async (request) => {
  assertCallerIsAdmin(request)

  // Small team — cap at one page (max 1000; we ask for 100). No pagination UI.
  const result = await getAuth().listUsers(100)
  const users = result.users.map((u) => {
    const claims = u.customClaims || {}
    return {
      uid: u.uid,
      email: u.email || null,
      displayName: u.displayName || null,
      photoURL: u.photoURL || null,
      admin: claims.admin === true,
      critico: claims.critico === true,
      criticoRequested: claims.criticoRequested === true,
    }
  })

  return { users }
})
