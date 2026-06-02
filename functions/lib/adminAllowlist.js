// Admin allowlist helpers — the auth model is "you are an admin iff your
// VERIFIED email is in the Firestore doc config/admins.emails (lowercased)".
//
// This module is split into PURE, firebase-free helpers (unit-tested directly,
// like portableText.js / resolveHueca.js) and dependency-injected logic. The IO
// reader (`isAdminEmail`) lives in functions/isAdminEmail.js next to the Admin
// SDK so this file stays importable in the vitest suite without firebase-admin.

/** Lowercase + trim a value to a string ('' for null/undefined). */
function norm(v) {
  return String(v ?? '').trim().toLowerCase()
}

/**
 * Case-insensitive membership: is `email` present in `list`? Both sides are
 * lowercased/trimmed. Returns false for an empty/missing email, an empty/missing
 * list, and ignores non-string entries (fail closed).
 * @param {string|null|undefined} email
 * @param {Array<unknown>|null|undefined} list
 * @returns {boolean}
 */
export function emailInList(email, list) {
  const e = norm(email)
  if (!e) return false
  if (!Array.isArray(list) || list.length === 0) return false
  return list.some((entry) => typeof entry === 'string' && norm(entry) === e)
}

/**
 * Extract the caller's VERIFIED, lowercased email from a callable auth context,
 * or null when there is no auth, the email is unverified, or absent. This is the
 * single chokepoint that enforces "verified email only" before any allowlist
 * lookup.
 * @param {{ token?: { email?: string, email_verified?: boolean } }|null|undefined} auth
 * @returns {string|null}
 */
export function verifiedEmailFrom(auth) {
  if (!auth || !auth.token) return null
  if (auth.token.email_verified !== true) return null
  const email = norm(auth.token.email)
  return email || null
}

/**
 * Decide whether a caller is an admin. Pure of firebase: takes the auth context
 * and an injected `isAdminEmail(email) => Promise<boolean>` IO function. Short-
 * circuits to false (NO IO lookup) when there is no auth or the email is
 * unverified, so an unverified user can never even probe the allowlist.
 * @param {object|null|undefined} auth
 * @param {(email: string) => Promise<boolean>} isAdminEmail
 * @returns {Promise<boolean>}
 */
export async function authorizeAdmin(auth, isAdminEmail) {
  const email = verifiedEmailFrom(auth)
  if (!email) return false
  return (await isAdminEmail(email)) === true
}
