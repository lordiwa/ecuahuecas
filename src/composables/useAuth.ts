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

let listenerRegistered = false

/**
 * Register the `onAuthStateChanged` listener exactly once, in the browser only.
 * Idempotent: safe to call from every mounted component.
 */
export function initAuthListener(): void {
  if (listenerRegistered) return
  if (typeof window === 'undefined') return
  listenerRegistered = true
  try {
    const auth = getFirebaseAuth()
    onAuthStateChanged(
      auth,
      (user) => {
        currentUser.value = user
        ready.value = true
      },
      () => {
        ready.value = true
      },
    )
  } catch (err) {
    // Config missing (no .env.local yet) — don't crash the app; surface nothing
    // until the user actually tries to log in.
    listenerRegistered = false
    ready.value = true
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
    isAuthenticated: computed(() => currentUser.value !== null),
    initAuthListener,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  }
}
