import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { RouterLink as RouterLinkStub } from 'vue-router'
import type { Resena, Hueca, Critico } from '@/types/content'

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
