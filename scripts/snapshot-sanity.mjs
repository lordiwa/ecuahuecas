#!/usr/bin/env node
/**
 * Build-time Sanity SNAPSHOT for ecuahuecas.
 *
 * Reads the migrated `hueca` / `critico` / `resena` documents from the shared
 * Sanity dataset (projectId gvc4yjqj / dataset production) and writes a single
 * static `src/content-snapshot.json`. The Vue app imports that JSON statically
 * (SSG-friendly), so anonymous readers get fully prerendered, zero-JS pages.
 *
 * WHY A TOKEN (see TASK-017 findings):
 *   The migrated `hueca`/`critico`/`resena` docs ARE published, but Sanity's
 *   ANONYMOUS read path currently returns 0 for them (only the older
 *   `post`/`author` resolve anonymously). So this snapshot MUST read WITH a
 *   read token — the tokenless `src/lib/sanity.ts` client would return empty.
 *
 * SECURITY:
 *   - The token is loaded at RUNTIME, never printed/logged/committed.
 *   - Resolution order:
 *       process.env.SANITY_READ_TOKEN
 *         || process.env.SANITY_WRITE_TOKEN
 *         || (SANITY_WRITE_TOKEN loaded from blog-component/.env)
 *   - CI/prod will provide SANITY_READ_TOKEN as a secret (TASK-04). Locally we
 *     reuse blog-component's .env, mirroring scripts/seed-sanity.mjs.
 *
 * Idempotent / re-runnable: it always overwrites src/content-snapshot.json.
 *
 * Usage:
 *   node scripts/snapshot-sanity.mjs
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join, resolve} from 'node:path'
import {createClient} from '@sanity/client'
import {createImageUrlBuilder} from '@sanity/image-url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const OUT_PATH = join(REPO_ROOT, 'src', 'content-snapshot.json')

// blog-component is the sibling repo; reuse ITS .env for the read token.
const BLOG_ENV_PATH = resolve(REPO_ROOT, '..', 'blog-component', '.env')

const PROJECT_ID = 'gvc4yjqj'
const DATASET = 'production'
const API_VERSION = '2025-01-01'

// ---------------------------------------------------------------------------
// Minimal .env loader (no `dotenv` dep). Loads keys into process.env WITHOUT
// logging any value. Returns the set of key NAMES it loaded. Copied from
// scripts/seed-sanity.mjs.
// ---------------------------------------------------------------------------
function loadEnvFile(path) {
  if (!existsSync(path)) return new Set()
  const loaded = new Set()
  const raw = readFileSync(path, 'utf8')
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
    loaded.add(key)
  }
  return loaded
}

// ---------------------------------------------------------------------------
// GROQ projections. Each precomputes image URLs frontend-side via @sanity/image-url
// AFTER the fetch (GROQ returns the raw image objects; we build URLs in JS).
//
// `resena.body` and `critico.bio` stay RAW PortableText arrays (BlockContent),
// with internalLink markDefs resolved to slugs (same gotcha as blog-component's
// POST_BY_SLUG_QUERY).
// ---------------------------------------------------------------------------
const HUECA_QUERY = `*[_type == "hueca" && activa == true]{
  _id, nombre, "slug": slug.current, ciudad, barrio, direccion,
  plato_estrella, precio, rating, reviews, horario, desde, tags,
  fotos, descripcion, coords
}`

const CRITICO_QUERY = `*[_type == "critico" && activo == true]{
  _id, nombre, "slug": slug.current, image, bio, ciudad, especialidad, desde
}`

const RESENA_QUERY = `*[_type == "resena" && activa == true]{
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

async function main() {
  console.log('=== ecuahuecas Sanity snapshot ===')
  console.log(`project: ${PROJECT_ID}  dataset: ${DATASET}  apiVersion: ${API_VERSION}`)

  // --- 1. Resolve the read token (never log its value). ---------------------
  const loadedKeys = loadEnvFile(BLOG_ENV_PATH)
  const envFound = existsSync(BLOG_ENV_PATH)
  // Log only the COUNT of keys loaded — never their names, which can be
  // sensitive (e.g. SANITY_WRITE_TOKEN, ANTHROPIC_API_KEY) and would leak
  // into CI logs.
  console.log(
    `[env] ${envFound ? 'loaded' : 'NOT FOUND'}: ${BLOG_ENV_PATH}` +
      (envFound ? `  (${[...loadedKeys].length} keys loaded)` : ''),
  )
  const token =
    process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN || undefined
  if (!token) {
    console.error(
      '\n[STOP] No read token found.\n' +
        '       Provide SANITY_READ_TOKEN (CI/prod secret, TASK-04) or\n' +
        `       SANITY_WRITE_TOKEN in: ${BLOG_ENV_PATH}\n` +
        '       (The migrated docs require a token; anonymous reads return 0.)',
    )
    process.exit(1)
  }
  console.log('[env] read token present (value hidden).')

  // --- 2. Configure client + image URL builder. ----------------------------
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
  })
  const builder = createImageUrlBuilder({projectId: PROJECT_ID, dataset: DATASET})
  // Resolve a Sanity image object (or null/undefined) to a CDN URL string.
  const urlFor = (img) => {
    if (!img || !img.asset) return undefined
    try {
      return builder.image(img).url() ?? undefined
    } catch {
      return undefined
    }
  }

  // --- 3. Fetch. ------------------------------------------------------------
  console.log('[fetch] reading hueca / critico / resena …')
  const [huecasRaw, criticosRaw, resenasRaw] = await Promise.all([
    client.fetch(HUECA_QUERY),
    client.fetch(CRITICO_QUERY),
    client.fetch(RESENA_QUERY),
  ])

  // --- 4. Shape onto the existing Hueca/Resena/Critico types. ---------------
  // Images become resolved URL strings; body/bio stay PortableText.
  const huecas = huecasRaw.map((h) => ({
    slug: h.slug,
    nombre: h.nombre,
    ciudad: h.ciudad,
    barrio: h.barrio ?? '',
    direccion: h.direccion ?? '',
    plato_estrella: h.plato_estrella ?? '',
    precio: h.precio ?? '$',
    rating: typeof h.rating === 'number' ? h.rating : 0,
    reviews: typeof h.reviews === 'number' ? h.reviews : 0,
    horario: h.horario ?? '',
    desde: typeof h.desde === 'number' ? h.desde : 0,
    tags: Array.isArray(h.tags) ? h.tags : [],
    fotos: Array.isArray(h.fotos)
      ? h.fotos.map(urlFor).filter((u) => typeof u === 'string')
      : [],
    descripcion: h.descripcion ?? undefined,
    coords:
      h.coords && typeof h.coords.lat === 'number' && typeof h.coords.lng === 'number'
        ? {lat: h.coords.lat, lng: h.coords.lng}
        : undefined,
  }))

  const criticos = criticosRaw.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    avatar: urlFor(c.image),
    ciudad: c.ciudad,
    // `reviews` is intentionally OMITTED: it is not modeled on the Sanity
    // `critico` doc, and hardcoding 0 rendered a misleading "0" in the UI.
    especialidad: c.especialidad ?? '',
    desde: typeof c.desde === 'number' ? c.desde : 0,
    // bio is PortableText (BlockContent); default to [] when absent.
    bio: Array.isArray(c.bio) ? c.bio : [],
  }))

  const resenas = resenasRaw.map((r) => ({
    slug: r.slug,
    hueca_id: r.hueca_id ?? '',
    critico_id: r.critico_id ?? '',
    fecha: r.publishedAt
      ? new Date(r.publishedAt).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '',
    rating: typeof r.rating === 'number' ? r.rating : 0,
    titulo: r.titulo,
    extracto: r.extracto ?? '',
    imagen: urlFor(r.imagen),
    veredicto: r.veredicto
      ? {
          aFavor: Array.isArray(r.veredicto.aFavor) ? r.veredicto.aFavor : [],
          enContra: Array.isArray(r.veredicto.enContra) ? r.veredicto.enContra : [],
          ticket: r.veredicto.ticket ?? undefined,
        }
      : undefined,
    // body is PortableText (BlockContent), kept raw.
    body: Array.isArray(r.body) ? r.body : [],
  }))

  // Drop undefined leaves for a tidy, deterministic file.
  const snapshot = JSON.parse(JSON.stringify({huecas, criticos, resenas}))

  // --- 5. Write. ------------------------------------------------------------
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')

  console.log(
    `\n[snapshot] wrote ${OUT_PATH}\n` +
      `[snapshot] counts → huecas: ${huecas.length}, ` +
      `criticos: ${criticos.length}, resenas: ${resenas.length}`,
  )
}

main().catch((err) => {
  console.error('[fatal]', (err && err.message) || err)
  process.exit(1)
})
