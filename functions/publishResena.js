// EcuaHuecas publishing Cloud Functions (v2, us-central1).
//
// Two callables, both restricted to críticos/admins:
//   - generateResenaDraft: drafts a reseña body with Claude (forced tool call).
//   - publishResena: writes a reseña (+ optional new hueca) to Sanity, uploading
//     photos as image assets.
//
// SECRETS stay server-side. The Anthropic key, Sanity write token, and model id
// come from Functions params (defineSecret/defineString) bound via the onCall
// `secrets:[...]` option — never from the committed source and never shipped to
// the browser. The Sanity + Anthropic clients are constructed LAZILY inside the
// handlers so neither deploy-time analysis nor a bare `import()` needs the
// values (that keeps the import smoke-check secret-free).
//
// ─────────────────────────────────────────────────────────────────────────────
// GEN2 CALLABLE GOTCHA — allUsers run.invoker / 401-vs-403 curl check:
//   A v2 onCall is a Cloud Run service. If its IAM run.invoker binding DOES
//   include `allUsers`, the platform forwards the request and our auth code runs;
//   invoked with no auth, our guard throws HttpsError('unauthenticated') which
//   the callable protocol returns as HTTP 401. If the `allUsers` binding is
//   MISSING, the Google Front End rejects the request at the edge with HTTP 403
//   BEFORE our code runs. Diagnose with curl:
//     curl -i -X POST <fn-url> -H 'Content-Type: application/json' -d '{"data":{}}'
//       → 401 (our HttpsError 'unauthenticated') = GOOD, the function is reachable
//         and ran our app-level auth guard. (Our 'permission-denied' would be 403,
//         but only AFTER our code runs — i.e. for an authed-but-unauthorized call.)
//       → 403 (rejected by the platform, before our code) = BAD, missing
//         public-invoker binding. The Firebase CLI adds it on deploy, but org
//         policy can strip it; fix by deleting + recreating the function, or:
//         gcloud run services add-iam-policy-binding <svc> \
//           --region us-central1 --member allUsers --role roles/run.invoker
// ─────────────────────────────────────────────────────────────────────────────

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { slugify, markdownToPortableText } from './lib/portableText.js'
import { resolveNuevaHuecaId } from './lib/resolveHueca.js'

// Sanity project coordinates are public identifiers (not secrets).
const SANITY_PROJECT_ID = 'gvc4yjqj'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'

// Secrets/params — bound per-function via the `secrets:[...]` option below.
const SANITY_WRITE_TOKEN = defineSecret('SANITY_WRITE_TOKEN')
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
const ANTHROPIC_MODEL = defineString('ANTHROPIC_MODEL')

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const REGION = 'us-central1'

/**
 * Throw unless the caller is authenticated AND holds `admin === true` or
 * `critico === true`. Mirrors the fail-closed guard style in index.js.
 */
function assertCallerIsCriticoOrAdmin(request) {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  }
  if (auth.token.admin !== true && auth.token.critico !== true) {
    throw new HttpsError('permission-denied', 'Requiere ser crítico o administrador.')
  }
  return auth
}

/** Lazily build a Sanity client with the write token (never at module top). */
async function makeSanityClient() {
  const { createClient } = await import('@sanity/client')
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token: SANITY_WRITE_TOKEN.value(),
    useCdn: false,
  })
}

/** Lazily build an Anthropic client (never at module top). */
async function makeAnthropicClient() {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
}

const DRAFT_TOOL = {
  name: 'emit_resena',
  description: 'Devuelve la reseña estructurada para EcuaHuecas.',
  input_schema: {
    type: 'object',
    properties: {
      titulo: { type: 'string', description: 'Título atractivo de la reseña.' },
      extracto: { type: 'string', description: 'Gancho de una o dos frases (<= 280 caracteres).' },
      bodyMarkdown: {
        type: 'string',
        description: 'Cuerpo de la reseña en MARKDOWN (encabezados, párrafos, listas).',
      },
    },
    required: ['titulo', 'extracto', 'bodyMarkdown'],
  },
}

const SYSTEM_PROMPT = [
  'Eres un crítico gastronómico de EcuaHuecas que escribe en español ecuatoriano, con voz cercana y sabrosa.',
  'SIEMPRE respondes llamando a la herramienta `emit_resena`.',
  'En `bodyMarkdown` devuelve MARKDOWN (encabezados, párrafos y listas están bien); no inventes imágenes ni campos.',
  'El cuerpo debe leerse como una reseña completa y publicable.',
].join(' ')

// ── generateResenaDraft ──────────────────────────────────────────────────────

export const generateResenaDraft = onCall(
  // ANTHROPIC_MODEL is a defineString (read from functions/.env at deploy like
  // ADMIN_EMAIL) — it must NOT go in `secrets:[...]`, which only accepts
  // defineSecret params. .value() still works at runtime.
  { region: REGION, secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    assertCallerIsCriticoOrAdmin(request)

    const data = request.data || {}
    const huecaNombre = String(data.huecaNombre || '').trim()
    const ciudad = String(data.ciudad || '').trim()
    const rating = Number(data.rating) || 0
    const notas = String(data.notas || '').trim()
    const tagline = String(data.tagline || '').trim()

    if (!huecaNombre) {
      throw new HttpsError('invalid-argument', 'Falta el nombre de la hueca.')
    }

    const userPrompt = [
      `Hueca: ${huecaNombre}`,
      ciudad ? `Ciudad: ${ciudad}` : null,
      rating ? `Calificación del crítico: ${rating}/5` : null,
      tagline ? `Tagline propuesto: ${tagline}` : null,
      notas ? `Notas del crítico:\n${notas}` : null,
      '',
      'Redacta una reseña fiel a estas notas. Devuélvela con la herramienta emit_resena.',
    ]
      .filter((l) => l !== null)
      .join('\n')

    const client = await makeAnthropicClient()
    const model = (ANTHROPIC_MODEL.value() || '').trim() || DEFAULT_MODEL

    const message = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [DRAFT_TOOL],
      // Force the structured tool so the model cannot drift into prose.
      tool_choice: { type: 'tool', name: DRAFT_TOOL.name },
      messages: [{ role: 'user', content: userPrompt }],
    })

    const toolUse = message.content.find(
      (c) => c.type === 'tool_use' && c.name === DRAFT_TOOL.name,
    )
    if (!toolUse) {
      throw new HttpsError('internal', 'El modelo no devolvió la reseña esperada.')
    }

    const out = toolUse.input || {}
    return {
      titulo: String(out.titulo || ''),
      extracto: String(out.extracto || ''),
      bodyMarkdown: String(out.bodyMarkdown || ''),
    }
  },
)

// ── publishResena ────────────────────────────────────────────────────────────

/** Build a Sanity image value from an uploaded asset + optional metadata. */
function imageValue(assetId, { alt, caption, credit } = {}) {
  const img = { _type: 'image', asset: { _type: 'reference', _ref: assetId } }
  if (alt) img.alt = alt
  if (caption) img.caption = caption
  if (credit) img.credit = credit
  return img
}

/** Find a unique resena slug, appending -2, -3, … on collision. */
async function uniqueResenaSlug(sanity, base) {
  const root = base || 'resena'
  let candidate = root
  let n = 2
  // eslint-disable-next-line no-await-in-loop
  while (await sanity.fetch('*[_type=="resena" && slug.current==$s][0]._id', { s: candidate })) {
    candidate = `${root}-${n}`
    n += 1
  }
  return candidate
}

export const publishResena = onCall(
  // ANTHROPIC_MODEL stays OUT of secrets:[...] (it's a defineString, not a
  // defineSecret); .value() reads it from functions/.env at runtime.
  { region: REGION, secrets: [SANITY_WRITE_TOKEN, ANTHROPIC_API_KEY] },
  async (request) => {
    assertCallerIsCriticoOrAdmin(request)

    const data = request.data || {}
    const sanity = await makeSanityClient()

    // a. Resolve the hueca (create or look up).
    let huecaId
    if (data.huecaMode === 'nueva') {
      const nombre = String(data.nombre || '').trim()
      if (!nombre) {
        throw new HttpsError('invalid-argument', 'Falta el nombre de la nueva hueca.')
      }
      // Reuse an existing hueca with the same slug instead of creating a
      // duplicate (see resolveNuevaHuecaId for the reuse-by-slug trade-off).
      const resolved = await resolveNuevaHuecaId(sanity, {
        nombre,
        ciudad: data.ciudad,
        descripcion: data.descripcion,
        coords: data.coords,
      })
      huecaId = resolved.huecaId
    } else {
      const slug = String(data.huecaId || '').trim()
      huecaId = await sanity.fetch('*[_type=="hueca" && slug.current==$slug][0]._id', { slug })
      if (!huecaId) {
        throw new HttpsError('not-found', 'No se encontró la hueca seleccionada.')
      }
    }

    // b. Resolve the crítico (explicit slug, else first active by creation date).
    let criticoId
    let criticoSlug = null
    const explicitSlug = String(data.criticoSlug || '').trim()
    if (explicitSlug) {
      const c = await sanity.fetch(
        '*[_type=="critico" && slug.current==$slug][0]{_id, "slug": slug.current}',
        { slug: explicitSlug },
      )
      if (!c) throw new HttpsError('not-found', 'No se encontró el crítico indicado.')
      criticoId = c._id
      criticoSlug = c.slug
    } else {
      const c = await sanity.fetch(
        '*[_type=="critico" && activo==true]|order(_createdAt asc)[0]{_id, "slug": slug.current}',
      )
      if (!c) throw new HttpsError('failed-precondition', 'No hay críticos.')
      criticoId = c._id
      criticoSlug = c.slug
    }

    // c. Upload photos. Hero → resena.imagen; the rest → appended to hueca.fotos.
    const photos = Array.isArray(data.photos) ? data.photos : []
    let resenaImagen
    const extraHuecaFotos = []
    for (const photo of photos) {
      const buffer = Buffer.from(String(photo.dataBase64 || ''), 'base64')
      // eslint-disable-next-line no-await-in-loop
      const asset = await sanity.assets.upload('image', buffer, {
        filename: photo.filename || 'foto',
        contentType: photo.mime || 'application/octet-stream',
      })
      const isHero = photo.isHero === true || (resenaImagen === undefined && extraHuecaFotos.length === 0 && photos.length === 1)
      if (isHero && resenaImagen === undefined) {
        resenaImagen = imageValue(asset._id, {
          alt: photo.alt,
          caption: photo.caption,
          credit: photo.credit,
        })
      } else {
        extraHuecaFotos.push(imageValue(asset._id, { alt: photo.alt }))
      }
    }
    // If nothing was flagged hero but photos exist, promote the first extra.
    if (resenaImagen === undefined && extraHuecaFotos.length > 0) {
      resenaImagen = extraHuecaFotos.shift()
    }
    if (extraHuecaFotos.length > 0) {
      await sanity
        .patch(huecaId)
        .setIfMissing({ fotos: [] })
        .append('fotos', extraHuecaFotos)
        .commit({ autoGenerateArrayKeys: true })
    }

    // d. Build the body; append the veredicto as a blockquote when present.
    const body = markdownToPortableText(String(data.body || ''))
    const veredicto = String(data.veredicto || '').trim()
    if (veredicto) {
      body.push({
        _type: 'block',
        _key: `bv${body.length}`,
        style: 'blockquote',
        markDefs: [],
        children: [{ _type: 'span', _key: `bv${body.length}s0`, text: veredicto, marks: [] }],
      })
    }

    // e. Create the reseña with a unique slug.
    const slugBase = slugify(String(data.titulo || '') || huecaId)
    const slug = await uniqueResenaSlug(sanity, slugBase)
    const resenaDoc = {
      _type: 'resena',
      titulo: String(data.titulo || ''),
      slug: { _type: 'slug', current: slug },
      hueca: { _type: 'reference', _ref: huecaId },
      critico: { _type: 'reference', _ref: criticoId },
      publishedAt: new Date().toISOString(),
      rating: Number(data.rating) || 0,
      extracto: String(data.tagline || '').slice(0, 280),
      body,
      activa: true,
    }
    if (resenaImagen) resenaDoc.imagen = resenaImagen

    const created = await sanity.create(resenaDoc, { autoGenerateArrayKeys: true })

    // f.
    return { ok: true, resenaId: created._id, slug, huecaId, criticoSlug }
  },
)
