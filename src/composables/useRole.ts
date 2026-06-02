// Role composable — reactive admin state derived from the Firestore allowlist
// via the `checkAdmin` Cloud Function (TASK-025). There are NO custom claims:
// "admin" means the signed-in user's verified email is in config/admins, which
// only the server can read. The client calls checkAdmin once per signed-in user
// and caches the boolean reactively; the UI uses it to show/hide controls and
// the router guard uses it to gate /admin/**.
//
// SSG SAFETY: nothing here touches Firebase at import time. checkAdmin (which
// lazily inits Firebase) is only invoked when `currentUser` changes, which can
// only happen in the browser after the auth listener fires.
import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { User } from 'firebase/auth'
import { useAuth } from './useAuth'
import { checkAdmin } from '@/lib/adminCheck'

// Module-singleton state, shared app-wide (mirrors useAuth's pattern).
const isAdminState = ref(false)
let watcherRegistered = false

// Resolved lazily (inside ensureWatcher) so this module pulls useAuth's
// reactive state only when first used, never at import-eval time.
let currentUser: Ref<User | null> | null = null

/**
 * Re-derive `isAdmin` for the current user by calling the checkAdmin callable.
 * No user → false (and no network call). Any error → false (fail closed).
 */
async function refreshAdmin(): Promise<void> {
  if (!currentUser?.value) {
    isAdminState.value = false
    return
  }
  try {
    isAdminState.value = await checkAdmin()
  } catch {
    // Network/permission error — fail closed (no admin access).
    isAdminState.value = false
  }
}

/** Recompute whenever the signed-in user changes. Registered once. */
function ensureWatcher(): void {
  if (watcherRegistered) return
  watcherRegistered = true
  currentUser = useAuth().currentUser
  watch(
    currentUser,
    () => {
      // Fire-and-forget; `isAdmin` updates reactively when it resolves.
      void refreshAdmin()
    },
    { immediate: true },
  )
}

export function useRole() {
  ensureWatcher()
  return {
    isAdmin: computed(() => isAdminState.value),
    /**
     * Run a fresh admin check and await it. Used by the /admin route guard on a
     * cold load, where the watcher's fire-and-forget refresh may not have
     * resolved (or may have run while `currentUser` was still null).
     */
    refreshAdmin,
  }
}
