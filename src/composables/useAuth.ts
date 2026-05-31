// Auth composable — module-singleton reactive state shared across the app.
//
// SSG SAFETY: nothing here touches Firebase at import time. `getFirebaseAuth()`
// is lazy, and `initAuthListener()` is guarded to run only in the browser.
import { ref, computed } from 'vue'
import type { User } from 'firebase/auth'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as fbSignOut,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { authErrorMessage } from './authErrors'

// Module-singleton state — one source of truth for the whole app.
const currentUser = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const ready = ref(false) // true once the first auth state has resolved
// `false` only when Firebase config is missing (lazy init throws). The router
// guard MUST distinguish "auth not configured" from "configured but logged
// out": a missing config is NOT a definitive logout.
const authConfigured = ref(true)

let listenerRegistered = false

// A promise that resolves after the FIRST `onAuthStateChanged` resolution (or
// immediately, if config is missing / we're off-browser). A route guard can
// `await whenAuthReady()` instead of racing the async listener — otherwise a
// logged-in user gets bounced to /login on a hard refresh.
let resolveAuthReady: (() => void) | null = null
const authReady: Promise<void> = new Promise<void>((resolve) => {
  resolveAuthReady = resolve
})

function markReady(): void {
  if (!ready.value) {
    ready.value = true
    resolveAuthReady?.()
    resolveAuthReady = null
  }
}

/**
 * Resolves once the first auth state has settled. Safe to `await` from a route
 * guard. During SSR/prerender (no window) it resolves immediately.
 */
export function whenAuthReady(): Promise<void> {
  return authReady
}

/**
 * Register the `onAuthStateChanged` listener exactly once, in the browser only.
 * Idempotent: safe to call from every mounted component.
 */
export function initAuthListener(): void {
  if (listenerRegistered) return
  if (typeof window === 'undefined') {
    // Off-browser (SSR/prerender): never touch Firebase. Unblock any awaiter so
    // guards short-circuit instead of hanging.
    markReady()
    return
  }
  listenerRegistered = true
  try {
    const auth = getFirebaseAuth()
    authConfigured.value = true
    onAuthStateChanged(
      auth,
      (user) => {
        currentUser.value = user
        markReady()
      },
      () => {
        markReady()
      },
    )
  } catch (err) {
    // Config missing (no .env.local yet) — don't crash the app; surface nothing
    // until the user actually tries to log in. Record that auth is NOT
    // configured so the guard can tell this apart from a real logout.
    listenerRegistered = false
    authConfigured.value = false
    markReady()
    if (import.meta.env.DEV) console.warn('[useAuth] auth listener not started:', err)
  }
}

async function withState<T>(fn: () => Promise<T>): Promise<T | undefined> {
  loading.value = true
  error.value = null
  try {
    return await fn()
  } catch (err) {
    error.value = authErrorMessage(err)
    return undefined
  } finally {
    loading.value = false
  }
}

export async function signInWithGoogle(): Promise<User | undefined> {
  return withState(async () => {
    const auth = getFirebaseAuth()
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    return cred.user
  })
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User | undefined> {
  return withState(async () => {
    const auth = getFirebaseAuth()
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  })
}

export async function signOut(): Promise<void> {
  await withState(async () => {
    const auth = getFirebaseAuth()
    await fbSignOut(auth)
  })
}

export function useAuth() {
  return {
    currentUser,
    loading,
    error,
    ready,
    authConfigured,
    isAuthenticated: computed(() => currentUser.value !== null),
    initAuthListener,
    whenAuthReady,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  }
}
