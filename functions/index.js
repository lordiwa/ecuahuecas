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

initializeApp()

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

  // Merge so we preserve any other claims (e.g. admin).
  const claims = await existingClaims(uid)
  await getAuth().setCustomUserClaims(uid, { ...claims, critico: true })

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
    }
  })

  return { users }
})
