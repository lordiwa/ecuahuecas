// EcuaHuecas Cloud Functions — Firestore admin allowlist auth (TASK-025).
//
// THE AUTH MODEL (drastically simple): a caller is an admin iff their VERIFIED
// email is listed in the Firestore document `config/admins` (field
// `emails: string[]`, stored lowercased). Admins are added/removed by editing
// that doc in the Firebase console — no redeploy, no custom claims, no
// self-service. The client only shows/hides UI; every privileged callable
// re-checks the allowlist server-side via the Admin SDK (which bypasses the
// Firestore security rules that deny all client reads of config/**).
//
// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURE & DEPLOY (the user's parallel task — do NOT run from CI):
//   1. Firebase project on Blaze (Functions v2 requires it).
//   2. `firebase login` (once).
//   3. Ensure a Firestore database exists (Native mode). Seed config/admins
//      with your email lowercased — see the deploy notes accompanying this task.
//   4. Optional fallback: set ADMIN_EMAIL (functions/.env -> ADMIN_EMAIL=…). It
//      is folded into the allowlist so a missing/empty config/admins doc can
//      never fully lock you out. Leave it unset to rely solely on Firestore.
//   5. (cd functions && npm install) then `firebase deploy --only functions`
//      (use --force to PRUNE the removed role functions).
// ─────────────────────────────────────────────────────────────────────────────

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { authorizeAdmin } from './lib/adminAllowlist.js'
import { isAdminEmail } from './isAdminEmail.js'

initializeApp()

// Publishing callables (Claude draft + Sanity publish). Kept in their own module
// to keep this file readable; re-exported here so the Functions deploy picks
// them up. See publishResena.js for the GEN2 CALLABLE GOTCHA notes.
export { generateResenaDraft, publishResena } from './publishResena.js'

// ─────────────────────────────────────────────────────────────────────────────
// checkAdmin — authenticated callable the client uses to show/hide admin UI and
// gate the /admin route guard. Returns { admin: <boolean> } for the CALLER'S own
// verified email. Unauthenticated callers get HttpsError('unauthenticated'),
// which the callable protocol returns as HTTP 401 (curl-401 check holds; same
// no-options onCall shape as the publishing callables so the gen2 public-invoker
// binding behaves identically). An authenticated-but-unverified or not-listed
// email simply gets { admin: false } — there is nothing secret to hide here, so
// we answer rather than 403.
// ─────────────────────────────────────────────────────────────────────────────
export const checkAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  }
  const admin = await authorizeAdmin(request.auth, isAdminEmail)
  return { admin }
})
