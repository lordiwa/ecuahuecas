import { describe, it, expect, vi } from 'vitest'
import { fetchContent } from './sanityContent'
import type { Hueca, Resena, Critico } from '@/types/content'

/**
 * Contract for the BROWSER-SIDE live fetch + mapping (TASK-027).
 *
 * `scripts/snapshot-sanity.mjs` is the canonical projection/shape at BUILD time;
 * `src/lib/sanityContent.ts` is its RUNTIME twin (browser, tokenless). These
 * tests pin the runtime mapper so it produces EXACTLY the snapshot shape:
 *   - hueca.fotos / critico.avatar / resena.imagen -> resolved CDN URL STRINGS
 *   - resena.body / critico.bio -> raw PortableText arrays (untouched)
 *   - resena.hueca_id / critico_id -> referenced SLUG strings (resolved by GROQ)
 *   - resena.fecha -> es-EC formatted date string
 *   - sensible defaults for missing scalars (rating 0, tags [], etc.)
 *
 * The Sanity client is fully MOCKED — no network. We inject a fake client whose
 * `fetch(query)` returns canned raw rows keyed by which query string it gets,
 * and a fake image-url builder so URL resolution is deterministic.
 */

// Raw rows shaped like what GROQ returns BEFORE the JS mapping (images are still
// raw asset-ref objects; body/bio are PortableText; refs already projected to slugs).
const rawHueca = {
  _id: 'hueca-1',
  nombre: "Kim's Chicken",
  slug: 'kim-s-chicken',
  ciudad: 'Quito',
  barrio: 'La Carolina',
  direccion: 'Av. Siempre Viva 123',
  plato_estrella: 'Pollo broaster',
  precio: '$$',
  rating: 4.5,
  reviews: 12,
  horario: '12:00-22:00',
  desde: 2010,
  tags: ['pollo', 'broaster'],
  fotos: [{ _type: 'image', asset: { _ref: 'image-aaa' } }, { _type: 'image', asset: { _ref: 'image-bbb' } }],
  descripcion: 'Una hueca de prueba.',
  coords: { lat: -0.18, lng: -78.47 },
}

const rawHuecaMinimal = {
  _id: 'hueca-2',
  nombre: 'Sin Datos',
  slug: 'sin-datos',
  ciudad: 'Guayaquil',
  // everything else absent -> defaults
}

const rawCritico = {
  _id: 'critico-rafael-el-mato',
  nombre: 'Rafael "El Mato"',
  slug: 'rafael-el-mato',
  image: { _type: 'image', asset: { _ref: 'image-ccc' } },
  bio: [{ _type: 'block', children: [{ _type: 'span', text: 'Bio cruda.' }] }],
  ciudad: 'Quito',
  especialidad: 'Encebollados',
  desde: 2008,
}

const rawResena = {
  _id: 'resena-1',
  titulo: 'El pollo que no falla',
  slug: 'pollo-que-no-falla',
  hueca_id: 'kim-s-chicken', // GROQ already resolved hueca->slug.current
  critico_id: 'rafael-el-mato',
  publishedAt: '2026-01-15T12:00:00.000Z',
  rating: 5,
  extracto: 'Crocante por fuera.',
  imagen: { _type: 'image', asset: { _ref: 'image-ddd' } },
  veredicto: { aFavor: ['precio'], enContra: ['cola'], ticket: '$3' },
  body: [{ _type: 'block', children: [{ _type: 'span', text: 'Cuerpo crudo.' }] }],
}

// Map a query string to its canned result. We match by document _type token.
function fakeFetch(query: string): Promise<unknown[]> {
  if (query.includes('"hueca"')) return Promise.resolve([rawHueca, rawHuecaMinimal])
  if (query.includes('"critico"')) return Promise.resolve([rawCritico])
  if (query.includes('"resena"')) return Promise.resolve([rawResena])
  throw new Error(`unexpected query: ${query}`)
}

// A fake image-url builder mirroring @sanity/image-url's chained API: builder
// .image(obj).url() -> deterministic URL derived from the asset ref.
function fakeBuilder() {
  return {
    image(img: { asset?: { _ref?: string } } | null | undefined) {
      return {
        url() {
          const ref = img?.asset?._ref
          return ref ? `https://cdn.sanity.io/images/p/production/${ref}.jpg` : null
        },
      }
    },
  }
}

function makeDeps() {
  const client = { fetch: vi.fn(fakeFetch) }
  return { client, builder: fakeBuilder() }
}

describe('fetchContent (runtime Sanity mapper)', () => {
  it('resolves all three document types via the injected client', async () => {
    const { client, builder } = makeDeps()
    const snap = await fetchContent({ client: client as never, builder: builder as never })
    expect(client.fetch).toHaveBeenCalledTimes(3)
    expect(snap.huecas).toHaveLength(2)
    expect(snap.criticos).toHaveLength(1)
    expect(snap.resenas).toHaveLength(1)
  })

  it('maps hueca to the snapshot shape: fotos -> string[] URLs, scalars preserved', async () => {
    const { client, builder } = makeDeps()
    const snap = await fetchContent({ client: client as never, builder: builder as never })
    const h = snap.huecas.find((x) => x.slug === 'kim-s-chicken') as Hueca
    expect(h).toBeDefined()
    expect(h.fotos).toEqual([
      'https://cdn.sanity.io/images/p/production/image-aaa.jpg',
      'https://cdn.sanity.io/images/p/production/image-bbb.jpg',
    ])
    h.fotos.forEach((f) => expect(typeof f).toBe('string'))
    expect(h.nombre).toBe("Kim's Chicken")
    expect(h.ciudad).toBe('Quito')
    expect(h.rating).toBe(4.5)
    expect(h.reviews).toBe(12)
    expect(h.tags).toEqual(['pollo', 'broaster'])
    expect(h.coords).toEqual({ lat: -0.18, lng: -78.47 })
    expect(h.descripcion).toBe('Una hueca de prueba.')
  })

  it('applies snapshot defaults for a minimal hueca (rating 0, tags [], fotos [], precio $)', async () => {
    const { client, builder } = makeDeps()
    const snap = await fetchContent({ client: client as never, builder: builder as never })
    const h = snap.huecas.find((x) => x.slug === 'sin-datos') as Hueca
    expect(h.rating).toBe(0)
    expect(h.reviews).toBe(0)
    expect(h.desde).toBe(0)
    expect(h.tags).toEqual([])
    expect(h.fotos).toEqual([])
    expect(h.barrio).toBe('')
    expect(h.direccion).toBe('')
    expect(h.plato_estrella).toBe('')
    expect(h.precio).toBe('$')
    expect(h.horario).toBe('')
    expect(h.coords).toBeUndefined()
  })

  it('maps critico: image -> avatar URL string, bio kept as raw PortableText', async () => {
    const { client, builder } = makeDeps()
    const snap = await fetchContent({ client: client as never, builder: builder as never })
    const c = snap.criticos[0] as Critico
    expect(c.slug).toBe('rafael-el-mato')
    expect(c.avatar).toBe('https://cdn.sanity.io/images/p/production/image-ccc.jpg')
    expect(c.especialidad).toBe('Encebollados')
    expect(c.desde).toBe(2008)
    expect(c.reviews).toBe(0)
    // bio is the SAME raw PortableText array (not flattened to text).
    expect(c.bio).toBe(rawCritico.bio)
  })

  it('maps resena: refs->slugs, imagen->URL string, body raw, fecha es-EC formatted', async () => {
    const { client, builder } = makeDeps()
    const snap = await fetchContent({ client: client as never, builder: builder as never })
    const r = snap.resenas[0] as Resena
    expect(r.slug).toBe('pollo-que-no-falla')
    expect(r.hueca_id).toBe('kim-s-chicken')
    expect(r.critico_id).toBe('rafael-el-mato')
    expect(r.imagen).toBe('https://cdn.sanity.io/images/p/production/image-ddd.jpg')
    expect(r.body).toBe(rawResena.body)
    expect(r.veredicto).toEqual({ aFavor: ['precio'], enContra: ['cola'], ticket: '$3' })
    // Date formatted exactly like the snapshot generator (es-EC, day/long-month/year).
    const expected = new Date('2026-01-15T12:00:00.000Z').toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    expect(r.fecha).toBe(expected)
  })
})
