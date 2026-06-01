import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Foto from './Foto.vue'

/**
 * Contract for the reader image surface (TASK-020). The pages pass the
 * snapshot's CDN image URL (resena.imagen / hueca.fotos[0]) to Foto's `src`,
 * keeping `color` only as a placeholder fallback. We assert the two branches of
 * Foto so a regression that swaps `src` back to `color` (the original bug) is
 * caught: with `src` it must render a real <img src=URL>; without `src` it must
 * render the SVG placeholder and NO <img> (so no broken <img src=undefined>).
 *
 * @vue/test-utils is intentionally not a dependency — we render the SFC via
 * Vue's own SSR renderer, which @vitejs/plugin-vue compiles for the test run.
 */
async function render(props: Record<string, unknown>): Promise<string> {
  const app = createSSRApp({ render: () => h(Foto, props) })
  return renderToString(app)
}

const URL = 'https://cdn.sanity.io/images/p/production/abc-800x600.jpg'

describe('Foto', () => {
  it('renders a real <img> with the given src when src is present', async () => {
    const html = await render({ seed: 'la-hueca', src: URL, color: '#FFCB05' })
    expect(html).toContain('<img')
    expect(html).toContain(`src="${URL}"`)
    expect(html).not.toContain('<svg')
  })

  it('renders the SVG placeholder and no <img> when src is absent', async () => {
    const html = await render({ seed: 'la-hueca', color: '#FFCB05' })
    expect(html).toContain('<svg')
    expect(html).not.toContain('<img')
  })

  it('falls back to the placeholder when src is undefined (no broken img)', async () => {
    // Mirrors `:src="hueca.fotos[0] || undefined"` for a doc without photos.
    const html = await render({ seed: 'sin-foto', src: undefined, color: '#E8833A' })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src="undefined"')
    expect(html).toContain('<svg')
  })
})
