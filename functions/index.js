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
