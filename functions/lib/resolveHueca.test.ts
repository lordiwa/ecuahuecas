import { describe, it, expect, vi } from 'vitest'
// Import the PURE ESM helper directly. Like portableText.js it must NOT pull in
// firebase-functions / @anthropic-ai/sdk / @sanity/client — it operates on an
// injected sanity-like object so the reuse-vs-create decision is unit-testable.
import { resolveNuevaHuecaId } from './resolveHueca.js'

/**
 * Build a fake sanity client: `fetch` returns whatever canned id you give it
 * (null = no existing hueca), and `create` is a spy that echoes a fresh _id.
 */
function fakeSanity({ existingId = null } = {}) {
  return {
    fetch: vi.fn(async () => existingId),
    create: vi.fn(async (doc: Record<string, unknown>) => ({ _id: 'new-hueca-id', ...doc })),
  }
}

describe('resolveNuevaHuecaId', () => {
  it('derives the slug from the nombre when querying for an existing hueca', async () => {
    const sanity = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(sanity, { nombre: "Kim's Chicken" })
    expect(sanity.fetch).toHaveBeenCalledTimes(1)
    const [, params] = sanity.fetch.mock.calls[0]
    expect(params).toEqual({ slug: 'kim-s-chicken' })
  })

  it('reuses the existing hueca id and does NOT create when slug already exists', async () => {
    const sanity = fakeSanity({ existingId: 'existing-kim' })
    const { huecaId, reused } = await resolveNuevaHuecaId(sanity, {
      nombre: "Kim's Chicken",
      ciudad: 'Guayaquil',
    })
    expect(huecaId).toBe('existing-kim')
    expect(reused).toBe(true)
    expect(sanity.create).not.toHaveBeenCalled()
  })

  it('does not overwrite the existing hueca fields when reusing', async () => {
    const sanity = fakeSanity({ existingId: 'existing-kim' })
    await resolveNuevaHuecaId(sanity, {
      nombre: "Kim's Chicken",
      ciudad: 'Quito',
      descripcion: 'otra cosa',
    })
    // Reuse-by-slug must never patch/create over the existing doc.
    expect(sanity.create).not.toHaveBeenCalled()
  })

  it('creates a new hueca when no hueca with that slug exists', async () => {
    const sanity = fakeSanity({ existingId: null })
    const { huecaId, reused } = await resolveNuevaHuecaId(sanity, {
      nombre: 'Encebollados Don Pepe',
      ciudad: 'Manta',
      descripcion: 'rico',
      coords: { lat: -1, lng: -80 },
    })
    expect(reused).toBe(false)
    expect(huecaId).toBe('new-hueca-id')
    expect(sanity.create).toHaveBeenCalledTimes(1)
    const [doc] = sanity.create.mock.calls[0]
    expect(doc._type).toBe('hueca')
    expect(doc.nombre).toBe('Encebollados Don Pepe')
    expect(doc.slug).toEqual({ _type: 'slug', current: 'encebollados-don-pepe' })
    expect(doc.ciudad).toBe('Manta')
    expect(doc.descripcion).toBe('rico')
    expect(doc.coords).toEqual({ lat: -1, lng: -80 })
    expect(doc.activa).toBe(true)
  })

  it('two publishes of the same name resolve to the same id (no duplicate slug)', async () => {
    // First publish: no match → creates. We then simulate the doc now existing.
    const first = fakeSanity({ existingId: null })
    const r1 = await resolveNuevaHuecaId(first, { nombre: "Kim's Chicken" })
    expect(r1.reused).toBe(false)

    const second = fakeSanity({ existingId: 'new-hueca-id' })
    const r2 = await resolveNuevaHuecaId(second, { nombre: "Kim's Chicken" })
    expect(r2.reused).toBe(true)
    expect(r2.huecaId).toBe(r1.huecaId)
    expect(second.create).not.toHaveBeenCalled()
  })

  it('omits optional fields from the created doc when not supplied', async () => {
    const sanity = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(sanity, { nombre: 'Solo Nombre' })
    const [doc] = sanity.create.mock.calls[0]
    expect(doc.ciudad).toBeUndefined()
    expect(doc.descripcion).toBeUndefined()
    expect(doc.coords).toBeUndefined()
  })

  // ── TASK-022: all hueca fields on CREATE; rating/reviews derived ────────────

  it('writes all the new hueca fields + derived rating/reviews on CREATE', async () => {
    const sanity = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(sanity, {
      nombre: 'Encebollados Don Pepe',
      ciudad: 'Manta',
      descripcion: 'rico',
      coords: { lat: -1, lng: -80 },
      barrio: 'Tarqui',
      direccion: 'Av. 4 de Noviembre',
      plato_estrella: 'Encebollado',
      precio: '$$',
      horario: '8:00 - 14:00',
      desde: 1990,
      tags: ['mariscos', 'desayuno'],
      rating: 4,
    })
    const [doc] = sanity.create.mock.calls[0]
    expect(doc.barrio).toBe('Tarqui')
    expect(doc.direccion).toBe('Av. 4 de Noviembre')
    expect(doc.plato_estrella).toBe('Encebollado')
    expect(doc.precio).toBe('$$')
    expect(doc.horario).toBe('8:00 - 14:00')
    expect(doc.desde).toBe(1990)
    expect(doc.tags).toEqual(['mariscos', 'desayuno'])
    // rating is derived from the passed reseña rating; reviews is always 1 on CREATE.
    expect(doc.rating).toBe(4)
    expect(doc.reviews).toBe(1)
  })

  it('clamps an out-of-range rating to the 0–5 scale on CREATE', async () => {
    const high = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(high, { nombre: 'Rating Alto', rating: 99 })
    expect(high.create.mock.calls[0][0].rating).toBe(5)

    const low = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(low, { nombre: 'Rating Bajo', rating: -3 })
    expect(low.create.mock.calls[0][0].rating).toBe(0)
  })

  it('defaults rating to 0 on CREATE when none is supplied', async () => {
    const sanity = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(sanity, { nombre: 'Sin Rating' })
    const [doc] = sanity.create.mock.calls[0]
    expect(doc.rating).toBe(0)
    expect(doc.reviews).toBe(1)
  })

  it('omits empty/blank new fields from the created doc (guarding)', async () => {
    const sanity = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(sanity, {
      nombre: 'Solo Lo Minimo',
      barrio: '',
      direccion: '',
      plato_estrella: '',
      precio: '',
      horario: '',
      desde: null,
      tags: [],
    })
    const [doc] = sanity.create.mock.calls[0]
    expect(doc.barrio).toBeUndefined()
    expect(doc.direccion).toBeUndefined()
    expect(doc.plato_estrella).toBeUndefined()
    expect(doc.precio).toBeUndefined()
    expect(doc.horario).toBeUndefined()
    expect(doc.desde).toBeUndefined()
    expect(doc.tags).toBeUndefined()
    // rating/reviews are still always written on CREATE.
    expect(doc.rating).toBe(0)
    expect(doc.reviews).toBe(1)
  })

  it('omits desde when it is not a finite number', async () => {
    const sanity = fakeSanity({ existingId: null })
    await resolveNuevaHuecaId(sanity, { nombre: 'Desde NaN', desde: Number.NaN })
    const [doc] = sanity.create.mock.calls[0]
    expect(doc.desde).toBeUndefined()
  })

  it('does NOT write any new fields (or rating/reviews) when REUSING an existing slug', async () => {
    const sanity = fakeSanity({ existingId: 'existing-kim' })
    const result = await resolveNuevaHuecaId(sanity, {
      nombre: "Kim's Chicken",
      ciudad: 'Guayaquil',
      barrio: 'Centro',
      direccion: 'Calle 1',
      plato_estrella: 'Pollo',
      precio: '$$$',
      horario: '12:00 - 22:00',
      desde: 2001,
      tags: ['pollo'],
      rating: 5,
    })
    expect(result).toEqual({ huecaId: 'existing-kim', reused: true })
    expect(sanity.create).not.toHaveBeenCalled()
    // The REUSE path must never patch the existing hueca's fields.
    // @ts-expect-error fakeSanity has no patch by default — assert it stays untouched.
    expect(sanity.patch).toBeUndefined()
  })
})
