import { parse as parseYaml } from 'yaml'
import {
  Hueca,
  Resena,
  Critico,
  type Hueca as HuecaT,
  type Resena as ResenaT,
  type Critico as CriticoT,
} from '@/types/content'

interface ParsedMd {
  data: Record<string, unknown>
  body: string
}

function splitFrontmatter(raw: string): ParsedMd {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: raw.trim() }
  const data = (parseYaml(match[1]) ?? {}) as Record<string, unknown>
  return { data, body: match[2].trim() }
}

const huecasRaw = import.meta.glob('../content/huecas/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const resenasRaw = import.meta.glob('../content/resenas/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const criticosRaw = import.meta.glob('../content/criticos/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function loadAll<T>(
  source: Record<string, string>,
  schema: { parse: (data: unknown) => T },
  label: string,
): T[] {
  const out: T[] = []
  for (const [path, raw] of Object.entries(source)) {
    const { data, body } = splitFrontmatter(raw)
    try {
      out.push(schema.parse({ ...data, body }))
    } catch (err) {
      console.error(`[content] failed to parse ${label} at ${path}:`, err)
    }
  }
  return out
}

export const huecas: HuecaT[] = loadAll(huecasRaw, Hueca, 'hueca')
export const resenas: ResenaT[] = loadAll(resenasRaw, Resena, 'resena')
export const criticos: CriticoT[] = loadAll(criticosRaw, Critico, 'critico')

export function getHueca(slug: string): HuecaT | undefined {
  return huecas.find((h) => h.slug === slug)
}

export function getResena(slug: string): ResenaT | undefined {
  return resenas.find((r) => r.slug === slug)
}

export function getCritico(slug: string): CriticoT | undefined {
  return criticos.find((c) => c.slug === slug)
}

export function resenasDeHueca(hueca_id: string): ResenaT[] {
  return resenas.filter((r) => r.hueca_id === hueca_id)
}

export function huecasDeCiudad(ciudad: string): HuecaT[] {
  return huecas.filter((h) => h.ciudad === ciudad)
}

export function huecasTop(n: number = 10): HuecaT[] {
  return [...huecas].sort((a, b) => b.rating - a.rating).slice(0, n)
}
