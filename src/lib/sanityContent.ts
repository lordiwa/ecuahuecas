/**
 * RUNTIME (browser) Sanity content reader for ecuahuecas.
 *
 * This is the live-read twin of the build-time `scripts/snapshot-sanity.mjs`.
 * The snapshot script runs in Node at BUILD time (with a read token) and writes
 * `src/content-snapshot.json` (the SSR/prerender seed). THIS module runs in the
 * BROWSER at RUNTIME, reads the same docs ANONYMOUSLY (the dataset is public —
 * aclMode 'public'; tokenless reads work for hueca/critico/resena), and maps
 * them to EXACTLY the same shape, so pages can hydrate with live data on reload
 * WITHOUT a rebuild/deploy.
 *
 * ⚠️ KEEP IN PARALLEL WITH scripts/snapshot-sanity.mjs ⚠️
 *   The GROQ projections (HUECA_QUERY / CRITICO_QUERY / RESENA_QUERY) and the
 *   JS shaping below INTENTIONALLY DUPLICATE the snapshot script: one is Node
 *   (build), one is browser (runtime). They must stay byte-for-byte equivalent
 *   in OUTPUT shape. If you change a projection or default here, change it there
 *   too (and vice-versa), or live reads will drift from the prerendered seed.
 *
 * SECURITY / SSG:
 *   - NO token. Anonymous public CDN read only (useCdn:true, perspective
 *     'published'). projectId/dataset come from PUBLIC `VITE_SANITY_*` env vars.
 *   - No Sanity call at module import/eval — the client + image builder are
 *     created lazily inside `fetchContent`, which only runs in the browser
 *     (App.vue onMounted). This keeps vite-ssg prerender side-effect free.
 */
import { createClient, type SanityClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type {
  ContentSnapshot,
  Hueca as HuecaT,
  Resena as ResenaT,
  Critico as CriticoT,
} from '@/types/content'

const API_VERSION = '2025-01-01'

// --- GROQ projections (mirror scripts/snapshot-sanity.mjs) -------------------
// Images are returned as RAW asset objects; URLs are built in JS via
// @sanity/image-url after the fetch. `resena.body` / `critico.bio` stay raw
// PortableText with `internalLink` markDefs resolved to slugs. Refs on resena
// are projected to the referenced doc's slug.
export const HUECA_QUERY = `*[_type == "hueca" && activa == true]{
  _id, nombre, "slug": slug.current, ciudad, barrio, direccion,
  plato_estrella, precio, rating, reviews, horario, desde, tags,
  fotos, descripcion, coords
}`

export const CRITICO_QUERY = `*[_type == "critico" && activo == true]{
  _id, nombre, "slug": slug.current, image, bio, ciudad, especialidad, desde
}`

export const RESENA_QUERY = `*[_type == "resena" && activa == true]{
  _id, titulo, "slug": slug.current,
  "hueca_id": hueca->slug.current,
  "critico_id": critico->slug.current,
  publishedAt, rating, extracto, imagen, veredicto,
  body[]{
    ...,
    markDefs[]{
      ...,
      _type == "internalLink" => { "slug": @.reference->slug.current }
    }
  }
}`

// Minimal structural type for a Sanity image object (asset ref present or not).
interface SanityImage {
  asset?: { _ref?: string } | null
}

// Anything with `.image(img).url()` — both the real @sanity/image-url builder
// and the test fake satisfy this.
interface UrlBuilderLike {
  image(source: unknown): { url(): string | null }
}

/** Resolve a Sanity image object (or null/undefined) to a CDN URL string. */
function makeUrlFor(builder: UrlBuilderLike) {
  return (img: SanityImage | null | undefined): string | undefined => {
    if (!img || !img.asset) return undefined
    try {
      return builder.image(img).url() ?? undefined
    } catch {
      return undefined
    }
  }
}

// --- Mapping (mirror scripts/snapshot-sanity.mjs `.map()` shaping) -----------
function mapHueca(h: Record<string, unknown>, urlFor: ReturnType<typeof makeUrlFor>): HuecaT {
  const coords = h.coords as { lat?: unknown; lng?: unknown } | undefined
  return {
    slug: h.slug as string,
    nombre: h.nombre as string,
    ciudad: h.ciudad as HuecaT['ciudad'],
    barrio: (h.barrio as string) ?? '',
    direccion: (h.direccion as string) ?? '',
    plato_estrella: (h.plato_estrella as string) ?? '',
    precio: ((h.precio as HuecaT['precio']) ?? '$') as HuecaT['precio'],
    rating: typeof h.rating === 'number' ? h.rating : 0,
    reviews: typeof h.reviews === 'number' ? h.reviews : 0,
    horario: (h.horario as string) ?? '',
    desde: typeof h.desde === 'number' ? h.desde : 0,
    tags: Array.isArray(h.tags) ? (h.tags as string[]) : [],
    fotos: Array.isArray(h.fotos)
      ? (h.fotos as SanityImage[]).map(urlFor).filter((u): u is string => typeof u === 'string')
      : [],
    descripcion: (h.descripcion as string) ?? undefined,
    coords:
      coords && typeof coords.lat === 'number' && typeof coords.lng === 'number'
        ? { lat: coords.lat, lng: coords.lng }
        : undefined,
  }
}

function mapCritico(c: Record<string, unknown>, urlFor: ReturnType<typeof makeUrlFor>): CriticoT {
  return {
    slug: c.slug as string,
    nombre: c.nombre as string,
    avatar: urlFor(c.image as SanityImage | undefined),
    ciudad: c.ciudad as CriticoT['ciudad'],
    // `reviews` is intentionally OMITTED (not modeled on the Sanity `critico`);
    // mirrors scripts/snapshot-sanity.mjs so live reads match the seed.
    especialidad: (c.especialidad as string) ?? '',
    desde: typeof c.desde === 'number' ? c.desde : 0,
    bio: (Array.isArray(c.bio) ? c.bio : []) as CriticoT['bio'],
  }
}

function mapResena(r: Record<string, unknown>, urlFor: ReturnType<typeof makeUrlFor>): ResenaT {
  const veredicto = r.veredicto as
    | { aFavor?: unknown; enContra?: unknown; ticket?: unknown }
    | undefined
  return {
    slug: r.slug as string,
    hueca_id: (r.hueca_id as string) ?? '',
    critico_id: (r.critico_id as string) ?? '',
    fecha: r.publishedAt
      ? new Date(r.publishedAt as string).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '',
    rating: typeof r.rating === 'number' ? r.rating : 0,
    titulo: r.titulo as string,
    extracto: (r.extracto as string) ?? '',
    imagen: urlFor(r.imagen as SanityImage | undefined),
    veredicto: veredicto
      ? {
          aFavor: Array.isArray(veredicto.aFavor) ? (veredicto.aFavor as string[]) : [],
          enContra: Array.isArray(veredicto.enContra) ? (veredicto.enContra as string[]) : [],
          ticket: (veredicto.ticket as string) ?? undefined,
        }
      : undefined,
    body: (Array.isArray(r.body) ? r.body : []) as ResenaT['body'],
  }
}

// --- Lazy client construction (SSG-safe: never at module eval) ---------------
let memoClient: SanityClient | null = null
function defaultClient(): SanityClient {
  if (memoClient === null) {
    memoClient = createClient({
      projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
      dataset: import.meta.env.VITE_SANITY_DATASET,
      apiVersion: API_VERSION,
      useCdn: true,
      perspective: 'published',
      // NO token — anonymous public read.
    })
  }
  return memoClient
}

interface FetchClientLike {
  fetch<T = unknown>(query: string): Promise<T>
}

export interface FetchContentDeps {
  /** Inject a (mock) Sanity client; defaults to the tokenless CDN client. */
  client?: FetchClientLike
  /** Inject a (mock) image-url builder; defaults to @sanity/image-url. */
  builder?: UrlBuilderLike
}

/**
 * Fetch hueca/critico/resena LIVE from Sanity and map to the snapshot shape.
 * Runs in the browser only (called from App.vue onMounted). Deps are injectable
 * for tests; in production both default to the tokenless CDN client + builder.
 */
export async function fetchContent(deps: FetchContentDeps = {}): Promise<ContentSnapshot> {
  const client = deps.client ?? (defaultClient() as unknown as FetchClientLike)
  const builder = deps.builder ?? (imageUrlBuilder(defaultClient()) as UrlBuilderLike)
  const urlFor = makeUrlFor(builder)

  const [huecasRaw, criticosRaw, resenasRaw] = await Promise.all([
    client.fetch<Record<string, unknown>[]>(HUECA_QUERY),
    client.fetch<Record<string, unknown>[]>(CRITICO_QUERY),
    client.fetch<Record<string, unknown>[]>(RESENA_QUERY),
  ])

  return {
    huecas: huecasRaw.map((h) => mapHueca(h, urlFor)),
    criticos: criticosRaw.map((c) => mapCritico(c, urlFor)),
    resenas: resenasRaw.map((r) => mapResena(r, urlFor)),
  }
}
