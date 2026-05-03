import { z } from 'zod'

export const Ciudad = z.enum(['Quito', 'Guayaquil', 'Cuenca', 'Manta'])
export type Ciudad = z.infer<typeof Ciudad>

export const Precio = z.enum(['$', '$$', '$$$'])
export type Precio = z.infer<typeof Precio>

export const HuecaFrontmatter = z.object({
  slug: z.string(),
  nombre: z.string(),
  ciudad: Ciudad,
  barrio: z.string(),
  direccion: z.string(),
  plato_estrella: z.string(),
  precio: Precio,
  rating: z.number().min(0).max(5),
  reviews: z.number().int().nonnegative().default(0),
  horario: z.string(),
  desde: z.number().int(),
  tags: z.array(z.string()).default([]),
  fotos: z.array(z.string()).default([]),
  descripcion: z.string().optional(),
  coords: z
    .object({ x: z.number(), y: z.number() })
    .optional(),
})
export type HuecaFrontmatter = z.infer<typeof HuecaFrontmatter>

export const Hueca = HuecaFrontmatter.extend({
  body: z.string(),
})
export type Hueca = z.infer<typeof Hueca>

export const VeredictoBox = z.object({
  aFavor: z.array(z.string()).default([]),
  enContra: z.array(z.string()).default([]),
  ticket: z.string().optional(),
})
export type VeredictoBox = z.infer<typeof VeredictoBox>

export const ResenaFrontmatter = z.object({
  slug: z.string(),
  hueca_id: z.string(),
  critico_id: z.string(),
  fecha: z.string(),
  rating: z.number().min(1).max(5),
  titulo: z.string(),
  extracto: z.string(),
  imagen: z.string().optional(),
  veredicto: VeredictoBox.optional(),
})
export type ResenaFrontmatter = z.infer<typeof ResenaFrontmatter>

export const Resena = ResenaFrontmatter.extend({
  body: z.string(),
})
export type Resena = z.infer<typeof Resena>

export const CriticoFrontmatter = z.object({
  slug: z.string(),
  nombre: z.string(),
  avatar: z.string().optional(),
  ciudad: Ciudad,
  reviews: z.number().int().nonnegative().default(0),
  especialidad: z.string(),
  desde: z.number().int(),
})
export type CriticoFrontmatter = z.infer<typeof CriticoFrontmatter>

export const Critico = CriticoFrontmatter.extend({
  body: z.string(),
})
export type Critico = z.infer<typeof Critico>
