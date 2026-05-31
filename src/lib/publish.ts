// Typed client wrappers for the publishing Cloud Functions (see
// functions/publishResena.js). SSG-safe: Firebase is only touched inside the
// exported async functions, which run in the browser on the /admin wizard.
//
// The functions fail closed server-side (caller must hold the `critico` or
// `admin` claim and the real secrets live only on the server); these wrappers
// just give the wizard typed calls and shapes.
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from './firebase'
import type { DraftPhotoInMemory } from './drafts'

// ── generateResenaDraft ──────────────────────────────────────────────────────

export interface GenerateResenaDraftInput {
  huecaNombre: string
  ciudad: string
  rating: number
  notas: string
  tagline: string
}

export interface GenerateResenaDraftResult {
  titulo: string
  extracto: string
  bodyMarkdown: string
}

export async function generateResenaDraft(
  input: GenerateResenaDraftInput,
): Promise<GenerateResenaDraftResult> {
  const fn = httpsCallable<GenerateResenaDraftInput, GenerateResenaDraftResult>(
    getFirebaseFunctions(),
    'generateResenaDraft',
  )
  const res = await fn(input)
  return res.data
}

// ── publishResena ────────────────────────────────────────────────────────────

/** One photo as sent to `publishResena` (base64 already resolved client-side). */
export interface PublishPhoto {
  id: string
  dataBase64: string
  mime: string
  filename: string
  alt?: string
  caption?: string
  credit?: string
  /** Exactly one photo carries `isHero: true`; it becomes `resena.imagen`. */
  isHero: boolean
}

export interface PublishResenaPayload {
  huecaMode: 'existente' | 'nueva'
  /** For 'existente': the hueca's slug. For 'nueva': ignored. */
  huecaId: string | null
  nombre?: string
  ciudad?: string
  descripcion?: string
  coords?: { lat: number; lng: number } | null
  rating: number
  titulo: string
  tagline: string
  body: string
  veredicto: string
  heroId: string | null
  photos: PublishPhoto[]
  /** Optional crítico slug; the server defaults to the first active crítico. */
  criticoSlug?: string
}

export interface PublishResenaResult {
  ok: boolean
  resenaId: string
  slug: string
  huecaId: string
  criticoSlug: string | null
}

export async function publishResena(
  payload: PublishResenaPayload,
): Promise<PublishResenaResult> {
  const fn = httpsCallable<PublishResenaPayload, PublishResenaResult>(
    getFirebaseFunctions(),
    'publishResena',
  )
  const res = await fn(payload)
  return res.data
}

// ── pure helpers (unit-tested) ───────────────────────────────────────────────

/** A draft photo with its base64 resolved — the input to {@link buildPublishPhotos}. */
export interface PublishPhotoInput {
  id: string
  dataBase64: string
  mime: string
  filename: string
  alt?: string
  caption?: string
  credit?: string
}

/**
 * PURE mapper: draft photos (+ heroId) → the `photos[]` payload for
 * `publishResena`. The hero is the photo whose id === heroId, falling back to
 * the first photo when heroId is null/unknown. Input order is preserved.
 */
export function buildPublishPhotos(
  photos: PublishPhotoInput[],
  heroId: string | null | undefined,
): PublishPhoto[] {
  if (photos.length === 0) return []
  const heroIndex = photos.findIndex((p) => p.id === heroId)
  const resolvedHero = heroIndex >= 0 ? heroIndex : 0
  return photos.map((p, i) => ({
    id: p.id,
    dataBase64: p.dataBase64,
    mime: p.mime,
    filename: p.filename,
    alt: p.alt,
    caption: p.caption,
    credit: p.credit,
    isHero: i === resolvedHero,
  }))
}

// ── blob IO (kept separate from the pure shaper so tests need no real blobs) ──

/** Resolve a Blob to a bare base64 string (no data: prefix) via FileReader. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('FileReader falló'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      // result is a data URL: "data:<mime>;base64,<payload>"
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Resolve every in-memory draft photo's blob to base64, returning the inputs to
 * {@link buildPublishPhotos}. Photos without a live blob are SKIPPED (their
 * blob:-URLs are dead after a refresh).
 *
 * CALLER CONTRACT: this silently drops blob-less photos, so the count of the
 * result may be smaller than the input. Callers that intend to publish photos
 * MUST guard against publishing imageless — compare `result.length` to the
 * number of photos the user expected and abort/warn on a mismatch (the wizard's
 * `onPublicar` does this via its re-upload guard + a post-shape length check).
 */
export async function photosToPublishInputs(
  photos: DraftPhotoInMemory[],
): Promise<PublishPhotoInput[]> {
  const out: PublishPhotoInput[] = []
  for (const p of photos) {
    if (!p.blob) continue
    out.push({
      id: p.id,
      dataBase64: await blobToBase64(p.blob),
      mime: p.mime,
      filename: p.name,
    })
  }
  return out
}
