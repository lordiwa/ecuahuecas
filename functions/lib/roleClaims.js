// Pure custom-claim merge helpers — NO firebase imports. Like portableText.js /
// resolveHueca.js this module is unit-testable in isolation; the onCall handlers
// in index.js (which DO import firebase-admin) wire these in so the claim math
// is covered without standing up a live Auth instance.
//
// Custom claims model (TASK-024):
//   admin            → full privileges (implies crítico)
//   critico          → can publish reseñas
//   criticoRequested → a self-service REQUEST marker; grants NOTHING on its own.
//                      Set by requestCriticoRole, cleared when an admin promotes.

/** True when these claims already confer crítico access (crítico OR admin). */
export function alreadyHasCriticoAccess(claims) {
  const c = claims || {}
  return c.critico === true || c.admin === true
}

/**
 * Claims to write when a user self-requests the crítico role. Merges
 * `criticoRequested: true` onto the caller's existing claims WITHOUT granting
 * any privilege (never sets critico/admin). Pure: does not mutate the input.
 */
export function requestedClaims(existing) {
  return { ...(existing || {}), criticoRequested: true }
}

/**
 * Claims to write when an admin promotes a user to crítico. Sets
 * `critico: true`, preserves every other claim (notably `admin`), and clears
 * the now-satisfied `criticoRequested` request marker. Pure: does not mutate
 * the input.
 */
export function grantedCriticoClaims(existing) {
  const { criticoRequested: _drop, ...rest } = existing || {}
  return { ...rest, critico: true }
}
