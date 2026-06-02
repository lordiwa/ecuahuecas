import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import type { ContentSnapshot, Hueca } from '@/types/content'

/**
 * Reactivity contract for the content store (TASK-027).
 *
 * content.ts seeds its reactive state SYNCHRONOUSLY from the imported snapshot
 * (SSR-safe, no Sanity at import time) and exposes `refreshContent()` which
 * fetches LIVE from Sanity (via sanityContent.fetchContent) and replaces the
 * reactive state in place. The existing helpers (getHueca, resenasDeHueca,
 * huecasTop) read the CURRENT reactive state, so `computed()` wrappers in the
 * pages re-evaluate after a refresh — proving live updates on reload.
 *
 * We MOCK `./sanityContent` so no network happens; the mock returns a controlled
 * "live" snapshot that differs from the seed, and we assert the helpers reflect
 * it AFTER refreshContent() resolves.
 */

const liveSnapshot = vi.hoisted<() => ContentSnapshot>(() => {
  const hueca = (over: Partial<Hueca>): Hueca => ({
    slug: 'x',
    nombre: 'x',
    ciudad: 'Quito',
    barrio: '',
    direccion: '',
    plato_estrella: '',
    precio: '$',
    rating: 0,
    reviews: 0,
    horario: '',
    desde: 0,
    tags: [],
    fotos: [],
    ...over,
  })
  return () => ({
    huecas: [
      hueca({ slug: 'live-top', nombre: 'Live Top', rating: 4.9 }),
      hueca({ slug: 'live-low', nombre: 'Live Low', rating: 1.0 }),
    ],
    criticos: [],
    resenas: [
      {
        slug: 'live-resena',
        hueca_id: 'live-top',
        critico_id: 'c',
        fecha: '15 de enero de 2026',
        rating: 5,
        titulo: 'Reseña en vivo',
        extracto: 'Editada en Sanity.',
        body: [],
      },
    ],
  })
})

const fetchContentMock = vi.hoisted(() => vi.fn())
vi.mock('./sanityContent', () => ({ fetchContent: fetchContentMock }))

import {
  huecas,
  resenas,
  getHueca,
  resenasDeHueca,
  huecasTop,
  refreshContent,
} from './content'

describe('content reactivity + refreshContent', () => {
  beforeEach(() => {
    fetchContentMock.mockReset()
  })

  it('refreshContent replaces the reactive state from the live fetch', async () => {
    fetchContentMock.mockResolvedValueOnce(liveSnapshot())
    await refreshContent()
    expect(fetchContentMock).toHaveBeenCalledTimes(1)
    expect(huecas.value.map((h) => h.slug)).toContain('live-top')
    expect(resenas.value.map((r) => r.slug)).toContain('live-resena')
  })

  it('helpers read the CURRENT reactive state after a refresh', async () => {
    fetchContentMock.mockResolvedValueOnce(liveSnapshot())
    await refreshContent()
    expect(getHueca('live-top')?.nombre).toBe('Live Top')
    expect(huecasTop(1)[0].slug).toBe('live-top') // highest rating wins
    expect(resenasDeHueca('live-top').map((r) => r.slug)).toEqual(['live-resena'])
  })

  it('computed wrappers re-evaluate after refreshContent (live update on reload)', async () => {
    const destacada = computed(() => huecasTop(1)[0])
    const recientes = computed(() => resenas.value.slice(0, 6))
    fetchContentMock.mockResolvedValueOnce(liveSnapshot())
    await refreshContent()
    expect(destacada.value.slug).toBe('live-top')
    expect(recientes.value.map((r) => r.slug)).toEqual(['live-resena'])
  })

  it('swallows fetch errors without throwing (refresh is best-effort)', async () => {
    fetchContentMock.mockRejectedValueOnce(new Error('network down'))
    await expect(refreshContent()).resolves.toBeUndefined()
  })
})
