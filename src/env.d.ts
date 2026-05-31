/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** MapTiler key for streets tiles; falls back to MapLibre demo tiles when unset. */
  readonly VITE_MAPTILER_KEY?: string
  /** Sanity project id (public, non-secret) — reused from the blog-component project. */
  readonly VITE_SANITY_PROJECT_ID: string
  /** Sanity dataset (public, non-secret), e.g. `production`. */
  readonly VITE_SANITY_DATASET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
