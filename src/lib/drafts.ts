import { Ciudad, Precio, type Precio as PrecioType } from '@/types/content'
import type { LngLat } from '@/lib/map'
import type { Photo } from '@/components/PhotoUploader.vue'

/**
 * localStorage key prefix for review drafts.
 * Final key shape: `draft:resena:<id>`.
 */
export const DRAFT_PREFIX = 'draft:resena:'

/**
 * Photo metadata as persisted in a draft. This is a {@link Photo} with the
 * binary `blob` removed: blobs are NOT serialized to localStorage (intentional,
 * documented limitation — see ticket TASK-010). The `url` is an in-memory blob
 * URL that becomes dead after a refresh; only `sha256` survives meaningfully.
 */
export type DraftPhoto = Omit<Photo, 'blob'>

/**
 * In-memory draft photo: the persisted metadata plus an OPTIONAL live `blob`.
 * Freshly uploaded photos carry a blob (so they can be previewed/published in
 * this session); once written to localStorage and reloaded, the blob is gone.
 */
export type DraftPhotoInMemory = DraftPhoto & { blob?: Blob }

export interface NuevaHuecaDraft {
  nombre: string
  ciudad: Ciudad
  descripcion: string
  coords: LngLat | null
  barrio: string
  direccion: string
  plato_estrella: string
  precio: PrecioType
  horario: string
  desde: number | null
  tags: string[]
}

/**
 * Full wizard state for an in-progress review. This is deliberately NOT the
 * final `Resena` type — publishing to Firestore is a later ticket.
 */
export interface ResenaDraft {
  id: string
  updatedAt: string
  step: number
  /** Whether step 1 references an existing hueca or creates a new one. */
  huecaMode: 'existente' | 'nueva'
  huecaId: string | null
  nuevaHueca: NuevaHuecaDraft
  rating: number
  titulo: string
  tagline: string
  /** Markdown body produced by RichTextEditor. */
  body: string
  veredicto: string
  /**
   * Private guide for the AI: free-text the critic writes to steer
   * "Generar con IA" (sent as `notas`). It is NEVER published — unlike
   * `veredicto`, which is the closing blockquote shown to readers.
   */
  instruccionesIA: string
  /** Photos minus their blobs once persisted; in-memory drafts may carry blobs. */
  photos: DraftPhotoInMemory[]
  heroId: string | null
}

/** Lightweight projection used to render the drafts list without full payloads. */
export interface ResenaDraftSummary {
  id: string
  updatedAt: string
  titulo: string
  huecaId: string | null
  huecaNombre: string
  rating: number
  photoCount: number
}

function keyFor(id: string): string {
  return `${DRAFT_PREFIX}${id}`
}

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

/**
 * Returns a copy of the draft with every photo's `blob` removed, keeping the
 * rest of the metadata (notably `sha256` + `url`). Pure: does not mutate input.
 */
export function stripPhotoBlobs(draft: ResenaDraft): ResenaDraft {
  return {
    ...draft,
    photos: draft.photos.map((p) => {
      // Drop `blob` regardless of whether the runtime object carries one.
      const { blob: _blob, ...rest } = p
      void _blob
      return rest
    }),
  }
}

/** Serialize a draft to a JSON string with blobs stripped. */
export function serializeDraft(draft: ResenaDraft): string {
  return JSON.stringify(stripPhotoBlobs(draft))
}

/** Persist a draft under `draft:resena:<id>`. Blobs are never written. */
export function saveDraft(draft: ResenaDraft): void {
  if (!hasStorage()) return
  localStorage.setItem(keyFor(draft.id), serializeDraft(draft))
}

/** Load a draft by id, or `null` if missing or unparseable. */
export function loadDraft(id: string): ResenaDraft | null {
  if (!hasStorage()) return null
  const raw = localStorage.getItem(keyFor(id))
  if (raw == null) return null
  try {
    return JSON.parse(raw) as ResenaDraft
  } catch {
    return null
  }
}

/** Remove a single draft. No-op if it does not exist. */
export function deleteDraft(id: string): void {
  if (!hasStorage()) return
  localStorage.removeItem(keyFor(id))
}

/**
 * List every stored review draft (and only those — keys not matching
 * `draft:resena:*` are ignored), summarized and sorted newest-first.
 */
export function listDrafts(): ResenaDraftSummary[] {
  if (!hasStorage()) return []
  const summaries: ResenaDraftSummary[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(DRAFT_PREFIX)) continue
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    let draft: ResenaDraft
    try {
      draft = JSON.parse(raw) as ResenaDraft
    } catch {
      continue
    }
    summaries.push({
      id: draft.id,
      updatedAt: draft.updatedAt,
      titulo: draft.titulo,
      huecaId: draft.huecaId,
      huecaNombre:
        draft.huecaMode === 'nueva' ? draft.nuevaHueca.nombre : (draft.huecaId ?? ''),
      rating: draft.rating,
      photoCount: draft.photos.length,
    })
  }
  summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
  return summaries
}

/**
 * Build a fresh, empty draft with a temporary slug id. Caller decides whether
 * to persist it. SSR-safe: does not touch `window`/`localStorage`.
 */
export function createEmptyDraft(id?: string): ResenaDraft {
  return {
    id: id ?? makeDraftId(),
    updatedAt: new Date().toISOString(),
    step: 1,
    huecaMode: 'existente',
    huecaId: null,
    nuevaHueca: {
      nombre: '',
      ciudad: 'Quito',
      descripcion: '',
      coords: null,
      barrio: '',
      direccion: '',
      plato_estrella: '',
      precio: '$',
      horario: '',
      desde: null,
      tags: [],
    },
    rating: 0,
    titulo: '',
    tagline: '',
    body: '',
    veredicto: '',
    instruccionesIA: '',
    photos: [],
    heroId: null,
  }
}

/**
 * PURE guard: is a NEW-hueca draft complete enough to publish? Requires the core
 * fields — nombre, ciudad, barrio, direccion, plato_estrella (non-empty trimmed)
 * and a valid `precio` (`$`/`$$`/`$$$`). Optional fields (descripcion, coords,
 * horario, desde, tags) are ignored. Used by both the wizard's next()/publish
 * guards. Does not touch storage.
 */
export function isNuevaHuecaValid(d: NuevaHuecaDraft): boolean {
  const nonEmpty = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0
  return (
    nonEmpty(d.nombre) &&
    Ciudad.safeParse(d.ciudad).success &&
    nonEmpty(d.barrio) &&
    nonEmpty(d.direccion) &&
    nonEmpty(d.plato_estrella) &&
    Precio.safeParse(d.precio).success
  )
}

/** Generate a temporary slug id for a new draft, e.g. `temp-l3k9x2a-4f8`. */
export function makeDraftId(): string {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `temp-${time}-${rand}`
}
