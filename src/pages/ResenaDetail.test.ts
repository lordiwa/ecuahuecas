import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { RouterLink as RouterLinkStub } from 'vue-router'
import type { Resena, Hueca, Critico } from '@/types/content'

function baseHueca(over: Partial<Hueca> = {}): Hueca {
  return {
    slug: 'kim-s-chicken',
    nombre: "Kim's Chicken",
    ciudad: 'Quito',
    barrio: 'La Carolina',
    direccion: 'Av. Siempre Viva 123',
    plato_estrella: 'Pollo broaster',
    precio: '$$',
    rating: 4.5,
    reviews: 12,
    horario: '12:00-22:00',
    desde: 2010,
    tags: [],
    fotos: [],
    descripcion: 'Una hueca de prueba.',
    ...over,
  }
}

function baseCritico(over: Partial<Critico> = {}): Critico {
  return {
    slug: 'ana-paladar',
    nombre: 'Ana Paladar',
    ciudad: 'Quito',
    reviews: 30,
    especialidad: 'Comida criolla',
    desde: 2018,
    bio: [],
    ...over,
  }
}

/**
 * Render contract for the public reseña page ("el post").
 *
 * TASK-028: the hero photo (resena.imagen) used to render through <Foto>, which
 * boxes the image into a fixed 16/9 aspect-ratio and applies object-fit:cover —
 * so real uploads looked zoomed/cropped. When a real image exists the page must
 * now render it at NATURAL proportions (no crop). When there is no image the
 * branded SVG placeholder must remain.
 *
 * We mock @/lib/content to inject fixtures, vue-router for useRoute/RouterLink,
 * @unhead/vue to a no-op, and blog-component's BlogPostPreview to a stub (it
 * pulls in Sanity client code we don't exercise here).
 */

const state = vi.hoisted(() => ({
  resena: undefined as Resena | undefined,
  hueca: undefined as Hueca | undefined,
  critico: undefined as Critico | undefined,
}))

vi.mock('vue-router', async () => {
  const { defineComponent, h: createEl } = await import('vue')
  return {
    useRoute: () => ({ params: { slug: state.resena?.slug ?? 'x' } }),
    RouterLink: defineComponent({
      name: 'RouterLink',
      props: { to: { type: [String, Object], required: true } },
      setup(props, { slots }) {
        return () => createEl('a', { href: String(props.to) }, slots.default?.())
      },
    }),
  }
})

vi.mock('@/lib/content', () => ({
  getResena: (_slug: string) => state.resena,
  getHueca: (_id: string) => state.hueca,
  getCritico: (_id: string) => state.critico,
}))

vi.mock('@unhead/vue', () => ({ useHead: () => {} }))

// BlogPostPreview renders the PortableText body; stub it so the test doesn't
// reach into the Sanity client. We only care about the hero image here.
vi.mock('blog-component', async () => {
  const { defineComponent } = await import('vue')
  return {
    BlogPostPreview: defineComponent({ name: 'BlogPostPreview', setup: () => () => null }),
  }
})

import ResenaDetail from './ResenaDetail.vue'

// Read the SFC source to assert the scoped CSS for the natural hero never
// applies the cover crop / fixed aspect-ratio.
const ResenaDetailSource = readFileSync(
  resolve(process.cwd(), 'src/pages/ResenaDetail.vue'),
  'utf8',
)

function extractRule(css: string, selector: string): string | null {
  const start = css.indexOf(selector)
  if (start === -1) return null
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  if (open === -1 || close === -1) return null
  return css.slice(open + 1, close)
}

function baseResena(over: Partial<Resena> = {}): Resena {
  return {
    slug: 'pollo-que-no-falla',
    hueca_id: 'kim-s-chicken',
    critico_id: 'c1',
    fecha: '2026-01-01',
    rating: 5,
    titulo: 'El pollo que no falla',
    extracto: 'Crocante por fuera, jugoso por dentro.',
    body: [],
    ...over,
  }
}

async function render(): Promise<string> {
  const app = createSSRApp({ render: () => h(ResenaDetail) })
  app.component('RouterLink', RouterLinkStub)
  return renderToString(app)
}

const PLACEHOLDER_SVG = 'viewBox="0 0 100 75"'
const IMG = 'https://cdn.sanity.io/images/p/production/hero-1200x800.jpg'

describe('ResenaDetail hero', () => {
  it('renders the real image at natural proportions (no cover crop) when imagen exists', async () => {
    state.resena = baseResena({ imagen: IMG })
    state.hueca = undefined
    state.critico = undefined
    const html = await render()

    // The real photo renders as a direct <img src=URL>, not the SVG placeholder.
    expect(html).toContain(`src="${IMG}"`)
    expect(html).not.toContain(PLACEHOLDER_SVG)
    // It carries the natural marker class.
    expect(html).toContain('resena-hero--natural')

    // The scoped CSS for the natural hero must not crop or box the image.
    const rule = extractRule(ResenaDetailSource, '.resena-hero--natural')
    expect(rule).toBeTruthy()
    expect(rule).not.toMatch(/object-fit\s*:\s*cover/)
    expect(rule).not.toMatch(/aspect-ratio/)
    expect(rule).toMatch(/height\s*:\s*auto/)
  })

  it('keeps the SVG placeholder (no real <img>) when imagen is absent', async () => {
    state.resena = baseResena({ imagen: undefined })
    state.hueca = undefined
    state.critico = undefined
    const html = await render()

    expect(html).toContain(PLACEHOLDER_SVG)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src="undefined"')
  })
})

const GEO = { lat: -0.18, lng: -78.47 }
// The href as it serializes in HTML output (the `&` is entity-escaped); in a
// real browser this parses back to the canonical `?api=1&destination=...` URL.
const MAPS_HREF =
  'https://www.google.com/maps/dir/?api=1&amp;destination=-0.18,-78.47'

describe('ResenaDetail "Dónde comer" hueca card (TASK-031)', () => {
  it('shows the hueca data (plato_estrella, direccion, horario) and PrecioDots', async () => {
    state.resena = baseResena()
    state.hueca = baseHueca({
      plato_estrella: 'Pollo broaster',
      direccion: 'Av. Siempre Viva 123',
      horario: '12:00-22:00',
      barrio: 'La Carolina',
      ciudad: 'Quito',
      precio: '$$',
    })
    state.critico = undefined
    const html = await render()

    expect(html).toContain('Pollo broaster')
    expect(html).toContain('Av. Siempre Viva 123')
    expect(html).toContain('12:00-22:00')
    expect(html).toContain('La Carolina')
    expect(html).toContain('Quito')
    // PrecioDots emits its identifying markup.
    expect(html).toContain('precio-dots')
    expect(html).toContain('aria-label="Precio nivel 2"')
    // "Ver hueca" link to the hueca page is always present when hueca exists.
    expect(html).toContain('href="/huecas/kim-s-chicken"')
  })

  it('shows "Cómo llegar" with the Google Maps href when coords exist', async () => {
    state.resena = baseResena()
    state.hueca = baseHueca({ coords: GEO })
    state.critico = undefined
    const html = await render()

    expect(html).toContain(MAPS_HREF)
    expect(html).toContain('Cómo llegar')
    // External link opens in a new tab safely.
    expect(html).toMatch(/target="_blank"/)
    expect(html).toMatch(/rel="[^"]*noopener[^"]*"/)
  })

  it('omits "Cómo llegar" when the hueca has no coords', async () => {
    state.resena = baseResena()
    state.hueca = baseHueca({ coords: undefined })
    state.critico = undefined
    const html = await render()

    expect(html).not.toContain('Cómo llegar')
    expect(html).not.toContain('google.com/maps')
    // The card itself still renders (Ver hueca remains).
    expect(html).toContain('href="/huecas/kim-s-chicken"')
  })

  it('omits the whole card gracefully when the hueca does not resolve', async () => {
    state.resena = baseResena()
    state.hueca = undefined
    state.critico = undefined
    const html = await render()

    expect(html).not.toContain('Dónde comer')
    expect(html).not.toContain('Ver hueca')
    expect(html).not.toContain('google.com/maps')
  })
})

describe('ResenaDetail crítico byline (TASK-031)', () => {
  it('renders the critico name linked to /criticos/<slug> with especialidad', async () => {
    state.resena = baseResena()
    state.hueca = undefined
    state.critico = baseCritico({
      slug: 'ana-paladar',
      nombre: 'Ana Paladar',
      especialidad: 'Comida criolla',
    })
    const html = await render()

    expect(html).toContain('href="/criticos/ana-paladar"')
    expect(html).toContain('Ana Paladar')
    expect(html).toContain('Comida criolla')
    // The fecha stays.
    expect(html).toContain('2026-01-01')
  })

  it('renders the avatar <img> when the critico has one', async () => {
    const AVATAR = 'https://cdn.sanity.io/images/p/production/ana-200x200.jpg'
    state.resena = baseResena({ imagen: undefined })
    state.hueca = undefined
    state.critico = baseCritico({ avatar: AVATAR })
    const html = await render()

    expect(html).toContain(`src="${AVATAR}"`)
  })

  it('renders the Foto placeholder when the critico has no avatar', async () => {
    state.resena = baseResena({ imagen: undefined })
    state.hueca = undefined
    state.critico = baseCritico({ avatar: undefined })
    const html = await render()

    // No avatar <img> means the branded SVG placeholder stands in.
    expect(html).toContain(PLACEHOLDER_SVG)
    expect(html).not.toContain('src="undefined"')
  })

  it('degrades to "—" when there is no critico', async () => {
    state.resena = baseResena()
    state.hueca = undefined
    state.critico = undefined
    const html = await render()

    expect(html).toContain('—')
    expect(html).not.toContain('href="/criticos/')
  })
})

describe('ResenaDetail hueca photo gallery (TASK-031)', () => {
  const G1 = 'https://cdn.sanity.io/images/p/production/g1-800x600.jpg'
  const G2 = 'https://cdn.sanity.io/images/p/production/g2-800x600.jpg'

  it('renders one gallery <img> per hueca foto', async () => {
    // resena.imagen absent so the only <img>s come from the gallery + (no avatar).
    state.resena = baseResena({ imagen: undefined })
    state.hueca = baseHueca({ fotos: [G1, G2] })
    state.critico = undefined
    const html = await render()

    expect(html).toContain(`src="${G1}"`)
    expect(html).toContain(`src="${G2}"`)
    const imgCount = (html.match(/<img\b/g) || []).length
    expect(imgCount).toBe(2)
  })

  it('renders no gallery (no placeholder) when hueca.fotos is empty', async () => {
    state.resena = baseResena({ imagen: undefined })
    state.hueca = baseHueca({ fotos: [] })
    state.critico = undefined
    const html = await render()

    // No gallery images and no SVG placeholder standing in for the gallery.
    expect(html).not.toContain('resena-galeria')
    expect(html).not.toContain('<img')
  })
})
