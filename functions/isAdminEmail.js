// IO reader for the admin allowlist. Separated from index.js so both index.js
// (checkAdmin) and publishResena.js can share ONE reader without a circular
// import. Imports firebase-admin (so it is NOT in the vitest path); the pure
// membership math it delegates to lives in lib/adminAllowlist.js and IS tested.
import { getFirestore } from 'firebase-admin/firestore'
import { defineString } from 'firebase-functions/params'
import { emailInList } from './lib/adminAllowlist.js'

// Optional break-glass fallback admin, read from functions/.env at runtime. Not
// required; folded into the allowlist so an empty config/admins can't lock the
// owner out. NEVER hardcoded.
const ADMIN_EMAIL = defineString('ADMIN_EMAIL')

/**
 * Read config/admins.emails and decide whether `email` (already lowercased,
 * verified upstream) is an admin. Uses the Admin SDK, which bypasses Firestore
 * rules. Folds in the optional ADMIN_EMAIL fallback.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function isAdminEmail(email) {
  let list = []
  try {
    const snap = await getFirestore().doc('config/admins').get()
    const data = snap.exists ? snap.data() : null
    if (data && Array.isArray(data.emails)) list = data.emails
  } catch {
    // Firestore unreachable / not provisioned: fall back to ADMIN_EMAIL only.
    list = []
  }
  const fallback = (ADMIN_EMAIL.value() || '').trim()
  if (fallback) list = [...list, fallback]
  return emailInList(email, list)
}
