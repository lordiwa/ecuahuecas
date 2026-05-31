// Role composable — reactive custom-claim state derived from the current user.
//
// SSG SAFETY: nothing here touches Firebase at import time. Claims are read
// from the User object (`getIdTokenResult`) only when `currentUser` changes,
// which can only happen in the browser after the auth listener fires.
import { ref, computed, watch } from 'vue'
import { useAuth } from './useAuth'
import { deriveIsAdmin, deriveIsCritico, type RoleClaims } from './roleClaims'

// Module-singleton claim state, shared app-wide (mirrors useAuth's pattern).
const claims = ref<RoleClaims | null>(null)
let watcherRegistered = false

const { currentUser } = useAuth()

/**
 * Re-read the current user's custom claims. `force` triggers a server token
 * refresh first (`getIdToken(true)`) — required immediately after a role is
 * granted/revoked, since the cached ID token still carries the old claims.
 */
async function refreshClaims(force = false): Promise<void> {
  const user = currentUser.value
  if (!user) {
    claims.value = null
    return
  }
  try {
    if (force) await user.getIdToken(true)
    const result = await user.getIdTokenResult()
    claims.value = result.claims as RoleClaims
  } catch {
    // Network/token error — fail closed (no claims => no elevated access).
    claims.value = null
  }
}

/** Recompute claims whenever the signed-in user changes. Registered once. */
function ensureWatcher(): void {
  if (watcherRegistered) return
  watcherRegistered = true
  watch(
    currentUser,
    () => {
      // Fire-and-forget; `claims` updates reactively when it resolves.
      void refreshClaims(false)
    },
    { immediate: true },
  )
}

export function useRole() {
  ensureWatcher()
  return {
    claims,
    isAdmin: computed(() => deriveIsAdmin(claims.value)),
    isCritico: computed(() => deriveIsCritico(claims.value)),
    /** Force a token refresh, then re-read claims. Use after granting a role. */
    refreshClaims: () => refreshClaims(true),
  }
}
