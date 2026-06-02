import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { RouterLink as RouterLinkStub } from 'vue-router'
import type { Hueca, Resena } from '@/types/content'

/**
 * Render contract for the public hueca page (TASK-026). Two reported bugs:
 *
 *  (1) GALLERY: the page used to render only `hueca.fotos[0]`, so a hueca with
 *      several uploaded photos showed just one. It must render ALL of
 *      `hueca.fotos` (a string[] of CDN URLs) as a gallery, and fall back to the
 *      branded SVG placeholder (no <img>) when the hueca has no photos.
 *  (2) CLICKABLE REVIEW: each reseña in the "Reseñas" section must be a real
 *      link to `/resenas/<slug>` (a RouterLink), keeping titulo/extracto/fecha.
 *
 * The page reads its data from the static snapshot via `@/lib/content`, so we
 * mock that module per-test to inject controlled fixtures. `vue-router` is
 * mocked to supply `useRoute` and a minimal RouterLink that renders an
 * `<a href>` (mirroring the real navigation target we assert on).
 */

// --- module mocks (hoisted by vitest) ---
const state = vi.hoisted(() => ({
  hueca: undefined as Hueca | undefined,
  resenas: [] as Resena[],
}))

// Mock vue-router: `useRoute` feeds the page its slug, and `RouterLink` is a
// minimal stub that renders the real navigation target as an <a href>. The SFC
// template resolves RouterLink by name (resolveComponent), so we also register
// the stub (imported from this same mocked module) globally in `render`.
vi.mock('vue-router', async () => {
  const { defineComponent, h: createEl } = await import('vue')
  return {
    useRoute: () => ({ params: { slug: state.hueca?.slug ?? 'x' } }),
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
  getHueca: (_slug: string) => state.hueca,
  resenasDeHueca: (_id: string) => state.resenas,
}))

// useHead touches an injected unhead instance that isn't present in a bare
// createSSRApp; stub it to a no-op so the component's head block doesn't throw.
vi.mock('@unhead/vue', () => ({ useHead: () => {} }))

import HuecaDetail from './HuecaDetail.vue'

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
  const app = createSSRApp({ render: () => h(HuecaDetail) })
  // RouterLink is a globally-registered component in the real app; provide it
  // here so the page's `<RouterLink>` usages resolve.
  app.component('RouterLink', RouterLinkStub)
  return renderToString(app)
}

// The Foto placeholder is the only SVG with this viewBox; Estrellas also emits
// SVGs, so we match the placeholder specifically rather than any `<svg>`.
const PLACEHOLDER_SVG = 'viewBox="0 0 100 75"'

const F1 = 'https://cdn.sanity.io/images/p/production/uno-800x600.jpg'
const F2 = 'https://cdn.sanity.io/images/p/production/dos-800x600.jpg'

describe('HuecaDetail gallery', () => {
  it('renders one <img> per photo when the hueca has several fotos', async () => {
    state.hueca = baseHueca({ fotos: [F1, F2] })
    state.resenas = []
    const html = await render()

    const imgCount = (html.match(/<img\b/g) || []).length
    expect(imgCount).toBe(2)
    expect(html).toContain(`src="${F1}"`)
    expect(html).toContain(`src="${F2}"`)
    // No leftover placeholder when real photos exist.
    expect(html).not.toContain(PLACEHOLDER_SVG)
  })

  it('renders the placeholder (no real <img>) when the hueca has zero fotos', async () => {
    state.hueca = baseHueca({ fotos: [] })
    state.resenas = []
    const html = await render()

    expect(html).not.toContain('<img')
    expect(html).not.toContain('src="undefined"')
    expect(html).toContain(PLACEHOLDER_SVG)
  })
})

describe('HuecaDetail reseñas', () => {
  it('renders each reseña as a link to /resenas/<slug>, keeping its content', async () => {
    state.hueca = baseHueca({ fotos: [] })
    state.resenas = [
      baseResena({ slug: 'pollo-que-no-falla', titulo: 'El pollo que no falla' }),
      baseResena({ slug: 'segunda-visita', titulo: 'Segunda visita' }),
    ]
    const html = await render()

    expect(html).toContain('href="/resenas/pollo-que-no-falla"')
    expect(html).toContain('href="/resenas/segunda-visita"')
    // Content preserved inside the link.
    expect(html).toContain('El pollo que no falla')
    expect(html).toContain('Crocante por fuera, jugoso por dentro.')
    expect(html).toContain('2026-01-01')
  })
})
