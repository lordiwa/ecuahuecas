/**
 * Content types for ecuahuecas.
 *
 * Source of truth is now the build-time Sanity SNAPSHOT (`src/content-snapshot.json`,
 * produced by `scripts/snapshot-sanity.mjs`) rather than local markdown. The
 * shapes below describe the snapshot rows:
 *
 *  - Images are resolved CDN URL strings (precomputed at snapshot time).
 *  - `Resena.body` and `Critico.bio` are PortableText (`BlockContent`) — the
 *    same type the `blog-component` library renders via `<BlogPostPreview>`.
 *  - The Sanity `hueca` has no rich `body`; its prose lives in `descripcion`.
 */
import { z } from 'zod'
import type { BlockContent } from 'blog-component'

// Kept as zod enums because the admin wizard reads `Ciudad.options` at runtime
// to build the city <select>. The inferred `.type` doubles as the TS type.
export const Ciudad = z.enum(['Quito', 'Guayaquil', 'Cuenca', 'Manta'])
export type Ciudad = z.infer<typeof Ciudad>

export const Precio = z.enum(['$', '$$', '$$$'])
export type Precio = z.infer<typeof Precio>

export interface Coords {
  lat: number
  lng: number
}

export interface Hueca {
  slug: string
  nombre: string
  ciudad: Ciudad
  barrio: string
  direccion: string
  plato_estrella: string
  precio: Precio
  rating: number
  reviews: number
  horario: string
  desde: number
  tags: string[]
  /** Resolved CDN image URLs (may be empty until photos are uploaded). */
  fotos: string[]
  descripcion?: string
  coords?: Coords
}

export interface VeredictoBox {
  aFavor: string[]
  enContra: string[]
  ticket?: string
}

export interface Resena {
  slug: string
  hueca_id: string
  critico_id: string
  fecha: string
  rating: number
  titulo: string
  extracto: string
  /** Resolved CDN image URL, if any. */
  imagen?: string
  veredicto?: VeredictoBox
  /** Rich review body as PortableText. */
  body: BlockContent
}

export interface Critico {
  slug: string
  nombre: string
  /** Resolved CDN avatar URL, if any. */
  avatar?: string
  ciudad: Ciudad
  reviews: number
  especialidad: string
  desde: number
  /** Crítico bio as PortableText. */
  bio: BlockContent
}

/** Shape of the generated `src/content-snapshot.json`. */
export interface ContentSnapshot {
  huecas: Hueca[]
  criticos: Critico[]
  resenas: Resena[]
}
