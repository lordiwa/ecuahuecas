#!/usr/bin/env node
/**
 * THROWAWAY ONE-OFF: purge the ecuahuecas DEMO seed documents from the shared
 * Sanity dataset (projectId gvc4yjqj / dataset production) once a REAL critico
 * exists. This is the inverse of scripts/seed-sanity.mjs and is meant to be run
 * exactly once (then deleted); re-runs are idempotent no-ops.
 *
 * WHAT IT DOES (in reference-safe order):
 *   1. Resolve the REAL critico _id by its slug (--critico=<slug>). FAIL LOUD if
 *      missing — we must never leave a kept resena pointing at a deleted critico.
 *   2. Repoint Kim's Chicken resena's `critico` reference to the real critico.
 *   3. Delete the demo resena, then the demo huecas, then the demo criticos
 *      (children before parents, so no dangling references are deleted first).
 *   4. Verify at least one active critico remains; FAIL LOUD otherwise.
 *
 * SAFETY PROPERTIES:
 *  - ALLOWLIST: only the hardcoded demo slugs below are ever deleted. Nothing
 *    outside that set is touched, and `post`/`author`/`category` docs (owned by
 *    blog-component) are never read or written.
 *  - RESOLVE-BY-SLUG: every doc is resolved via `slug.current`, never by an
 *    assumed _id format (Kim's resena was API-created with a random _id; seed
 *    docs use deterministic `critico.<slug>` etc.).
 *  - REPOINT-BEFORE-DELETE: Kim's resena is repointed to the real critico
 *    BEFORE any demo critico is deleted.
 *  - DRY-RUN: `--dry-run` (or PURGE_DRY_RUN=1) prints the full resolved plan
 *    (slug + resolved _id) and performs NO writes/deletes.
 *  - TOKEN HYGIENE: the Sanity write token is loaded at RUNTIME from
 *    blog-component's `.env` (BLOG_ENV_PATH below) and is NEVER printed, logged,
 *    or written to any file.
 *  - IDEMPOTENT: a demo slug that no longer resolves is treated as a no-op with
 *    a printed note, not a crash.
 *
 * Usage:
 *   node scripts/purge-demo.mjs --critico=<real-slug> --dry-run   # plan only
 *   node scripts/purge-demo.mjs --critico=<real-slug>             # apply + verify
 *   REAL_CRITICO_SLUG=<real-slug> PURGE_DRY_RUN=1 node scripts/purge-demo.mjs
 */
import {readFileSync, existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'
import {createClient} from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

// blog-component is the sibling repo; reuse ITS .env for the write token.
const BLOG_ENV_PATH = resolve(REPO_ROOT, '..', 'blog-component', '.env')

const PROJECT_ID = 'gvc4yjqj'
const DATASET = 'production'
const API_VERSION = '2025-01-01'

const DRY_RUN =
  process.argv.includes('--dry-run') ||
  process.env.PURGE_DRY_RUN === '1' ||
  process.env.PURGE_DRY_RUN === 'true'

// ---------------------------------------------------------------------------
// Hardcoded demo allowlist. NOTHING outside this set is ever deleted.
// ---------------------------------------------------------------------------
const DEMO_RESENA_SLUG = 'un-encebollado-honesto'
const DEMO_HUECA_SLUGS = ['encebollado-del-mercado', 'seco-de-chivo-cali']
const DEMO_CRITICO_SLUGS = ['carmen-la-chola', 'manolo-el-calado']
// KEEP this resena — its `critico` reference is repointed onto the real critico
// before the demo criticos are deleted.
const KEEP_RESENA_SLUG =
  'kim-s-chicken-el-crujido-perfecto-que-nos-tiene-enamorados'

// ---------------------------------------------------------------------------
// CLI: the real critico slug to repoint Kim's resena onto.
// ---------------------------------------------------------------------------
function parseCriticoSlug() {
  const arg = process.argv.find((a) => a.startsWith('--critico='))
  if (arg) return arg.slice('--critico='.length).trim()
  if (process.env.REAL_CRITICO_SLUG) return process.env.REAL_CRITICO_SLUG.trim()
  return ''
}

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

// Resolve a document _id by its slug.current for a given _type. Returns null if
// no such doc exists (so callers can treat it as an idempotent no-op).
async function resolveIdBySlug(client, type, slug) {
  return client.fetch(
    `*[_type == $type && slug.current == $slug][0]._id`,
    {type, slug},
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ecuahuecas DEMO purge → Sanity ===')
  console.log(`project: ${PROJECT_ID}  dataset: ${DATASET}  apiVersion: ${API_VERSION}`)
  console.log(`mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE + VERIFY'}`)

  const realCriticoSlug = parseCriticoSlug()
  if (!realCriticoSlug) {
    console.error(
      '\n[STOP] No real critico slug provided — cannot proceed.\n' +
        '       Pass the REAL critico to repoint Kim\'s resena onto:\n' +
        '         node scripts/purge-demo.mjs --critico=<slug> [--dry-run]\n' +
        '       (or set REAL_CRITICO_SLUG). The slug must NOT be one of the\n' +
        `       demo criticos (${DEMO_CRITICO_SLUGS.join(', ')}).`,
    )
    process.exit(1)
  }
  if (DEMO_CRITICO_SLUGS.includes(realCriticoSlug)) {
    console.error(
      `\n[STOP] --critico=${realCriticoSlug} is a DEMO critico slated for ` +
        'deletion. Provide the slug of your REAL critico.',
    )
    process.exit(1)
  }
  console.log(`real critico slug: ${realCriticoSlug}`)

  // --- 1. Load token from blog-component's .env (never log its value). -------
  const loadedKeys = loadEnvFile(BLOG_ENV_PATH)
  const envFound = existsSync(BLOG_ENV_PATH)
  console.log(
    `\n[env] ${envFound ? 'loaded' : 'NOT FOUND'}: ${BLOG_ENV_PATH}` +
      (envFound ? `  (keys: ${[...loadedKeys].join(', ') || 'none'})` : ''),
  )
  const token = process.env.SANITY_WRITE_TOKEN
  if (token) console.log('[env] SANITY_WRITE_TOKEN present (value hidden).')

  // Token is required to read+write. STOP clearly if it is missing (we resolve
  // _ids via the API, so even dry-run needs read access).
  if (!token) {
    console.error(
      '\n[STOP] SANITY_WRITE_TOKEN is not set — cannot resolve or purge.\n' +
        `       Add an Administrator-scoped token to:\n` +
        `         ${BLOG_ENV_PATH}\n` +
        `       as a line:  SANITY_WRITE_TOKEN=<token>\n` +
        `       (The token is read at runtime and never logged or committed.)`,
    )
    process.exit(1)
  }

  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
  })

  // --- 2. Resolve everything by slug. ---------------------------------------
  console.log('\n[resolve] resolving documents by slug.current…')

  // The real critico MUST exist — otherwise we cannot safely repoint Kim's
  // resena and must abort before deleting anything.
  const realCriticoId = await resolveIdBySlug(client, 'critico', realCriticoSlug)
  if (!realCriticoId) {
    console.error(
      `\n[STOP] real critico slug "${realCriticoSlug}" did not resolve to any\n` +
        '       critico document. Create your real critico first, then re-run.\n' +
        '       (Refusing to delete demo criticos while Kim\'s resena would be\n' +
        '       left pointing at a deleted reference.)',
    )
    process.exit(1)
  }
  console.log(`  real critico   ${realCriticoSlug.padEnd(34)} ${realCriticoId}`)

  const kimResenaId = await resolveIdBySlug(client, 'resena', KEEP_RESENA_SLUG)
  console.log(
    `  KEEP resena    ${KEEP_RESENA_SLUG.padEnd(34)} ${kimResenaId ?? '(not found)'}`,
  )

  const demoResenaId = await resolveIdBySlug(client, 'resena', DEMO_RESENA_SLUG)
  const demoHuecaIds = {}
  for (const slug of DEMO_HUECA_SLUGS) {
    demoHuecaIds[slug] = await resolveIdBySlug(client, 'hueca', slug)
  }
  const demoCriticoIds = {}
  for (const slug of DEMO_CRITICO_SLUGS) {
    demoCriticoIds[slug] = await resolveIdBySlug(client, 'critico', slug)
  }

  // --- Plan summary (printed in both dry-run and real mode). ----------------
  console.log('\n--- PLAN ---')
  console.log(
    `  repoint  resena ${KEEP_RESENA_SLUG} (${kimResenaId ?? 'MISSING'})` +
      `  critico → ${realCriticoId}`,
  )
  console.log(
    `  delete   resena ${DEMO_RESENA_SLUG.padEnd(34)} ${demoResenaId ?? '(already gone)'}`,
  )
  for (const slug of DEMO_HUECA_SLUGS) {
    console.log(
      `  delete   hueca  ${slug.padEnd(34)} ${demoHuecaIds[slug] ?? '(already gone)'}`,
    )
  }
  for (const slug of DEMO_CRITICO_SLUGS) {
    console.log(
      `  delete   critico ${slug.padEnd(33)} ${demoCriticoIds[slug] ?? '(already gone)'}`,
    )
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] no documents written or deleted. Re-run without --dry-run to apply.')
    return
  }

  let repointed = 0
  let deleted = 0
  let skipped = 0

  // --- 3. Repoint Kim's resena BEFORE deleting any demo critico. ------------
  if (kimResenaId) {
    console.log(`\n[repoint] resena ${kimResenaId} → critico ${realCriticoId}`)
    await client
      .patch(kimResenaId)
      .set({critico: {_type: 'reference', _ref: realCriticoId}})
      .commit()
    repointed = 1
  } else {
    console.log(
      `\n[repoint] KEEP resena "${KEEP_RESENA_SLUG}" not found — nothing to ` +
        'repoint (no-op).',
    )
  }

  // --- 4. Delete demo docs: resena, then huecas, then criticos. -------------
  async function deleteBySlug(label, slug, id) {
    if (!id) {
      console.log(`[delete] ${label} "${slug}" already gone — no-op.`)
      skipped++
      return
    }
    await client.delete(id)
    console.log(`[delete] ${label} "${slug}" (${id}) deleted.`)
    deleted++
  }

  console.log('')
  await deleteBySlug('resena', DEMO_RESENA_SLUG, demoResenaId)
  for (const slug of DEMO_HUECA_SLUGS) {
    await deleteBySlug('hueca', slug, demoHuecaIds[slug])
  }
  for (const slug of DEMO_CRITICO_SLUGS) {
    await deleteBySlug('critico', slug, demoCriticoIds[slug])
  }

  // --- 5. Verify at least one active critico remains. -----------------------
  console.log('\n[verify] checking at least one active critico remains…')
  const activeCriticos = await client.fetch(
    `count(*[_type == "critico" && activo == true])`,
  )
  console.log(`[verify] active criticos (activo == true): ${activeCriticos}`)
  if (!(activeCriticos >= 1)) {
    console.error(
      '\n[STOP] No active critico remains after purge. Something is wrong —\n' +
        '       the real critico should be active. Investigate before relying\n' +
        '       on the site (the critico repoint may dangle).',
    )
    process.exit(1)
  }

  // --- Final summary. -------------------------------------------------------
  console.log('\n--- SUMMARY ---')
  console.log(`  repointed: ${repointed}`)
  console.log(`  deleted:   ${deleted}`)
  console.log(`  skipped (already gone): ${skipped}`)
  console.log('  active criticos remaining: ' + activeCriticos)
  console.log('\n[done] demo purge complete.')
}

main().catch((err) => {
  console.error('[fatal]', (err && err.message) || err)
  process.exit(1)
})
