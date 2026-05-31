// Firebase client SDK — LAZY, memoized initialization.
//
// SSG SAFETY: This module must NOT touch Firebase at import/eval time. The app
// is prerendered by vite-ssg in Node (no browser) and, until the user wires the
// live project, `.env.local` Firebase config is absent at build time. So
// `initializeApp()` / `getAuth()` run ONLY inside the exported functions, which
// are called at runtime in the browser. There is no top-level `initializeApp`.
//
// The VITE_FIREBASE_* values are PUBLIC browser config (an API key here is an
// identifier, not a secret). Real security comes from Firebase Auth provider
// settings and the server-side Cloud Function that holds true secrets.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFunctions, type Functions } from 'firebase/functions'

interface FirebaseClientConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

function readConfig(): FirebaseClientConfig {
  const env = import.meta.env
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }

  const missing = (Object.keys(cfg) as (keyof FirebaseClientConfig)[]).filter(
    (k) => !cfg[k],
  )
  if (missing.length > 0) {
    const names = missing
      .map((k) => 'VITE_FIREBASE_' + k.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase())
      .join(', ')
    throw new Error(
      `Firebase no está configurado: faltan ${names}. ` +
        'Copia .env.example a .env.local y completa la configuración web de Firebase.',
    )
  }

  return cfg as FirebaseClientConfig
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let functions: Functions | null = null

/** Lazily initialize (or reuse) the Firebase app. Throws if config is missing. */
export function getFirebaseApp(): FirebaseApp {
  if (app) return app
  app = getApps().length ? getApp() : initializeApp(readConfig())
  return app
}

/** Lazily obtain the Auth instance. Safe to call repeatedly (memoized). */
export function getFirebaseAuth(): Auth {
  if (auth) return auth
  auth = getAuth(getFirebaseApp())
  return auth
}

/**
 * Lazily obtain the Functions instance (default region). Used by the admin
 * pages to call the role-management callables. Throws if config is missing,
 * same as the rest of this module.
 */
export function getFirebaseFunctions(): Functions {
  if (functions) return functions
  functions = getFunctions(getFirebaseApp())
  return functions
}
