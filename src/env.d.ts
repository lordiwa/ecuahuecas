/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** MapTiler key for streets tiles; falls back to MapLibre demo tiles when unset. */
  readonly VITE_MAPTILER_KEY?: string
  /** Sanity project id (public, non-secret) — reused from the blog-component project. */
  readonly VITE_SANITY_PROJECT_ID: string
  /** Sanity dataset (public, non-secret), e.g. `production`. */
  readonly VITE_SANITY_DATASET: string

  // Firebase web config — PUBLIC, non-secret browser identifiers. Optional at
  // build time so vite-ssg can prerender without them; required at runtime for
  // login (a clear error is thrown when first used if any are missing).
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
