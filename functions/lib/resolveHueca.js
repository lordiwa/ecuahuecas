// Pure, dependency-light helper for resolving which hueca a brand-new reseña
// should reference when the wizard publishes with huecaMode==='nueva'.
//
// IMPORTANT: like portableText.js this module imports ONLY local pure helpers.
// It must stay free of firebase-functions / @anthropic-ai/sdk / @sanity/client
// so the reuse-vs-create decision is unit-testable with an injected sanity-like
// object (a fake `{ fetch, create }`) — no live secrets, no heavy SDKs.
import { slugify } from './portableText.js'

/**
 * Resolve the hueca id for a NEW hueca by slug, reusing an existing doc instead
 * of blindly creating a duplicate.
 *
 * REUSE-BY-SLUG TRADE-OFF: we key on `slug.current` (derived from the nombre).
 * If a hueca with that slug already exists we reuse its _id and DO NOT touch its
 * fields; only when none exists do we create. The known downside is that two
 * *genuinely different* places that happen to share a name would collapse onto
 * one hueca — accepted for the andamio, since the alternative (the previous
 * behaviour) was worse: it produced duplicate huecas sharing one slug (e.g. two
 * 'kim-s-chicken'), which makes the slug ambiguous and breaks the detail page.
 *
 * @param {{ fetch: Function, create: Function }} sanity - injected Sanity client.
 * @param {{ nombre: string, ciudad?: string, descripcion?: string,
 *           coords?: { lat: number, lng: number } }} data
 * @returns {Promise<{ huecaId: string, reused: boolean }>}
 */
export async function resolveNuevaHuecaId(sanity, data) {
  const nombre = String((data && data.nombre) || '').trim()
  const slug = slugify(nombre)

  // Look up an existing hueca with this slug before creating anything.
  const existingId = await sanity.fetch(
    '*[_type=="hueca" && slug.current==$slug][0]._id',
    { slug },
  )
  if (existingId) {
    // Reuse the existing hueca verbatim — never overwrite its fields.
    return { huecaId: existingId, reused: true }
  }

  const huecaDoc = {
    _type: 'hueca',
    nombre,
    slug: { _type: 'slug', current: slug },
    ciudad: (data && data.ciudad) || undefined,
    descripcion: (data && data.descripcion) || undefined,
    coords: data && data.coords ? { lat: data.coords.lat, lng: data.coords.lng } : undefined,
    activa: true,
  }
  const created = await sanity.create(huecaDoc, { autoGenerateArrayKeys: true })
  return { huecaId: created._id, reused: false }
}
