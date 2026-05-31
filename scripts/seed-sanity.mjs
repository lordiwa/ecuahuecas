#!/usr/bin/env node
/**
 * Migrate the ecuahuecas markdown seed (src/content/**\/*.md) into the shared
 * Sanity dataset (projectId gvc4yjqj / dataset production), creating ONLY
 * ecuahuecas's own document types: `hueca`, `critico`, `resena`.
 *
 * Idempotent: documents use deterministic _ids (`hueca.<slug>`,
 * `critico.<slug>`, `resena.<slug>`) and are written with createOrReplace, so
 * re-running overwrites in place rather than duplicating.
 *
 * SECURITY:
 *  - The Sanity write token is loaded at RUNTIME from blog-component's `.env`
 *    (BLOG_ENV_PATH below). It is NEVER printed, logged, or written to any file.
 *  - This script only ever writes _ids prefixed `hueca.`/`critico.`/`resena.`,
 *    so it cannot touch blog-component's `post`/`author`/`category` documents.
 *
 * Usage:
 *   node scripts/seed-sanity.mjs            # dry-run plan, then real write + verify
 *   node scripts/seed-sanity.mjs --dry-run  # plan only, no writes
 *   SEED_DRY_RUN=1 node scripts/seed-sanity.mjs
 */
import {readFileSync, readdirSync, existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join, resolve} from 'node:path'
import {parse as parseYaml} from 'yaml'
import {createClient} from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const CONTENT_DIR = join(REPO_ROOT, 'src', 'content')

// blog-component is the sibling repo; reuse ITS .env for the write token.
const BLOG_ENV_PATH = resolve(REPO_ROOT, '..', 'blog-component', '.env')

const PROJECT_ID = 'gvc4yjqj'
const DATASET = 'production'
const API_VERSION = '2025-01-01'

const DRY_RUN =
  process.argv.includes('--dry-run') ||
  process.env.SEED_DRY_RUN === '1' ||
  process.env.SEED_DRY_RUN === 'true'

// ---------------------------------------------------------------------------
// Minimal .env loader (no `dotenv` dep). Loads keys into process.env WITHOUT
// logging any value. Returns the set of keys it loaded (names only).
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
// Markdown parsing — mirrors src/lib/content.ts splitFrontmatter().
// ---------------------------------------------------------------------------
function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return {data: {}, body: raw.trim()}
  const data = parseYaml(match[1]) ?? {}
  return {data, body: match[2].trim()}
}

function readMdDir(sub) {
  const dir = join(CONTENT_DIR, sub)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(dir, f), 'utf8')
      return {file: f, ...splitFrontmatter(raw)}
    })
}

// ---------------------------------------------------------------------------
// Minimal markdown -> PortableText converter.
//
// Approach (documented for the ticket): this is the MINIMAL converter the
// ticket permits for the single seed resena — `@sanity/block-tools` is not a
// dependency of either repo. It splits the body on blank lines into blocks,
// maps a leading `#` to an h2 style and `##` to h3, and everything else to a
// normal paragraph. Inline marks are NOT parsed (the seed body has none); rich
// authoring comes later via the AI flow.
// ---------------------------------------------------------------------------
function markdownToPortableText(md) {
  const chunks = md
    .split(/\r?\n\s*\r?\n/)
    .map((c) => c.trim())
    .filter(Boolean)

  return chunks.map((chunk) => {
    let style = 'normal'
    let text = chunk.replace(/\r?\n/g, ' ').trim()
    const h = text.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      style = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4'
      text = h[2].trim()
    }
    return {
      _type: 'block',
      style,
      markDefs: [],
      children: [{_type: 'span', marks: [], text}],
    }
  })
}

// ---------------------------------------------------------------------------
// Mappers: markdown frontmatter -> Sanity documents (deterministic _ids).
// ---------------------------------------------------------------------------
const huecaId = (slug) => `hueca.${slug}`
const criticoId = (slug) => `critico.${slug}`
const resenaId = (slug) => `resena.${slug}`

function mapHueca({data}) {
  const slug = String(data.slug)
  const coords =
    data.coords && typeof data.coords === 'object'
      ? {lat: Number(data.coords.lat), lng: Number(data.coords.lng)}
      : undefined
  const doc = {
    _id: huecaId(slug),
    _type: 'hueca',
    nombre: data.nombre,
    slug: {_type: 'slug', current: slug},
    ciudad: data.ciudad,
    barrio: data.barrio,
    direccion: data.direccion,
    plato_estrella: data.plato_estrella,
    precio: data.precio,
    rating: typeof data.rating === 'number' ? data.rating : undefined,
    reviews: typeof data.reviews === 'number' ? data.reviews : undefined,
    horario: data.horario,
    desde: typeof data.desde === 'number' ? data.desde : undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    // `fotos` in the seed are URL strings / empty; image assets are uploaded
    // later via the Studio, so we seed an empty image array here.
    fotos: [],
    descripcion: data.descripcion,
    coords,
    activa: true,
  }
  return doc
}

function mapCritico({data, body}) {
  const slug = String(data.slug)
  return {
    _id: criticoId(slug),
    _type: 'critico',
    nombre: data.nombre,
    slug: {_type: 'slug', current: slug},
    bio: body ? markdownToPortableText(body) : [],
    ciudad: data.ciudad,
    especialidad: data.especialidad,
    desde: typeof data.desde === 'number' ? data.desde : undefined,
    activo: true,
  }
}

function mapResena({data, body}) {
  const slug = String(data.slug)
  const veredicto = data.veredicto
    ? {
        aFavor: Array.isArray(data.veredicto.aFavor) ? data.veredicto.aFavor : [],
        enContra: Array.isArray(data.veredicto.enContra) ? data.veredicto.enContra : [],
        ticket: data.veredicto.ticket,
      }
    : undefined
  return {
    _id: resenaId(slug),
    _type: 'resena',
    titulo: data.titulo,
    slug: {_type: 'slug', current: slug},
    hueca: {_type: 'reference', _ref: huecaId(String(data.hueca_id))},
    critico: {_type: 'reference', _ref: criticoId(String(data.critico_id))},
    // The seed stores `fecha` as a human string ("Hace 3 días"); publishedAt is
    // required + datetime, so we seed today's date. Editors can refine later.
    publishedAt: new Date().toISOString(),
    rating: typeof data.rating === 'number' ? data.rating : undefined,
    extracto: data.extracto,
    body: body ? markdownToPortableText(body) : [],
    veredicto,
    activa: true,
    featured: false,
  }
}

function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ecuahuecas seed → Sanity ===')
  console.log(`project: ${PROJECT_ID}  dataset: ${DATASET}  apiVersion: ${API_VERSION}`)
  console.log(`mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE + VERIFY'}`)

  // --- 1. Load token from blog-component's .env (never log its value). -------
  const loadedKeys = loadEnvFile(BLOG_ENV_PATH)
  const envFound = existsSync(BLOG_ENV_PATH)
  console.log(
    `\n[env] ${envFound ? 'loaded' : 'NOT FOUND'}: ${BLOG_ENV_PATH}` +
      (envFound ? `  (keys: ${[...loadedKeys].join(', ') || 'none'})` : ''),
  )
  const token = process.env.SANITY_WRITE_TOKEN
  if (token) console.log('[env] SANITY_WRITE_TOKEN present (value hidden).')

  // --- 2. Read & map the markdown seed. -------------------------------------
  const huecaDocs = readMdDir('huecas').map(mapHueca).map(stripUndefined)
  const criticoDocs = readMdDir('criticos').map(mapCritico).map(stripUndefined)
  const resenaDocs = readMdDir('resenas').map(mapResena).map(stripUndefined)
  const allDocs = [...huecaDocs, ...criticoDocs, ...resenaDocs]

  console.log(
    `\n[parse] ${huecaDocs.length} hueca(s), ${criticoDocs.length} critico(s), ` +
      `${resenaDocs.length} resena(s)`,
  )

  // --- Plan summary (printed in both dry-run and real mode). ----------------
  console.log('\n--- PLAN: documents to createOrReplace ---')
  for (const d of allDocs) {
    const title = d.nombre || d.titulo || d._id
    const refs =
      d._type === 'resena' ? `  → hueca=${d.hueca._ref}, critico=${d.critico._ref}` : ''
    console.log(`  ${d._type.padEnd(8)} ${d._id.padEnd(34)} ${title}${refs}`)
  }

  // Sanity-check that resena references point at docs we are also writing.
  for (const r of resenaDocs) {
    if (!allDocs.some((d) => d._id === r.hueca._ref)) {
      console.error(`[STOP] resena ${r._id} references missing hueca ${r.hueca._ref}`)
      process.exit(1)
    }
    if (!allDocs.some((d) => d._id === r.critico._ref)) {
      console.error(`[STOP] resena ${r._id} references missing critico ${r.critico._ref}`)
      process.exit(1)
    }
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] no documents written. Re-run without --dry-run to apply.')
    return
  }

  // Token is required to write. STOP clearly if it is missing.
  if (!token) {
    console.error(
      '\n[STOP] SANITY_WRITE_TOKEN is not set — cannot write.\n' +
        `       Add an Administrator-scoped token to:\n` +
        `         ${BLOG_ENV_PATH}\n` +
        `       as a line:  SANITY_WRITE_TOKEN=<token>\n` +
        `       (The token is read at runtime and never logged or committed.)\n` +
        `       To preview the plan without a token, run with --dry-run.`,
    )
    process.exit(1)
  }

  // --- 3. Write. ------------------------------------------------------------
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
  })

  console.log('\n[write] applying createOrReplace in a single transaction…')
  let tx = client.transaction()
  for (const d of allDocs) tx = tx.createOrReplace(d)
  try {
    await tx.commit({autoGenerateArrayKeys: true})
  } catch (err) {
    const status = err && (err.statusCode || err.response?.statusCode)
    const msg = (err && err.message) || String(err)
    if (status === 403 || /permission .*create.* required/i.test(msg)) {
      console.error(
        '\n[STOP] 403 from Sanity: the token lacks "create" permission.\n' +
          '       This means the token is Viewer-scoped, not Administrator.\n' +
          '       Supply an Administrator-scoped SANITY_WRITE_TOKEN and re-run.',
      )
      process.exit(1)
    }
    console.error('\n[STOP] write failed:', msg)
    process.exit(1)
  }
  console.log(`[write] committed ${allDocs.length} document(s).`)

  // --- 4. Read back & verify (GROQ). ----------------------------------------
  console.log('\n[verify] reading documents back…')
  const huecaCount = await client.fetch(`count(*[_type == "hueca"])`)
  const criticoCount = await client.fetch(`count(*[_type == "critico"])`)
  const resenaCount = await client.fetch(`count(*[_type == "resena"])`)

  const resenas = await client.fetch(
    `*[_type == "resena"]{
      _id, titulo,
      "hueca": hueca->{_id, nombre},
      "critico": critico->{_id, nombre},
      "bodyBlocks": count(body)
    } | order(_id)`,
  )

  console.log(
    `[verify] counts → hueca: ${huecaCount}, critico: ${criticoCount}, resena: ${resenaCount}`,
  )
  let refsOk = resenas.length > 0
  for (const r of resenas) {
    const hOk = !!r.hueca?._id
    const cOk = !!r.critico?._id
    if (!hOk || !cOk) refsOk = false
    console.log(
      `[verify] ${r._id}: hueca→${r.hueca?.nombre ?? 'UNRESOLVED'} ` +
        `| critico→${r.critico?.nombre ?? 'UNRESOLVED'} | bodyBlocks=${r.bodyBlocks}`,
    )
  }

  if (refsOk) {
    console.log('\n[verify] OK — all resena references resolve.')
  } else {
    console.error('\n[verify] FAILED — some references did not resolve.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[fatal]', (err && err.message) || err)
  process.exit(1)
})
