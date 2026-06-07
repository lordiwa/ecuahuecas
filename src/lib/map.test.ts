import { describe, it, expect } from 'vitest'
import type { StyleSpecification } from 'maplibre-gl'
import { getMapStyle } from './map'

// In the vitest/jsdom env VITE_MAPTILER_KEY is unset, so getMapStyle() should
// return the inline keyless raster street style object (Carto Voyager).
describe('getMapStyle (no MapTiler key)', () => {
  it('returns a StyleSpecification object, not a URL string', () => {
    const style = getMapStyle()
    expect(typeof style).not.toBe('string')
    expect(typeof style).toBe('object')
  })

  it('is a MapLibre style version 8', () => {
    const style = getMapStyle() as StyleSpecification
    expect(style.version).toBe(8)
  })

  it('has a raster source with keyless Carto Voyager street tiles', () => {
    const style = getMapStyle() as StyleSpecification
    const sources = Object.values(style.sources)
    const raster = sources.find((s) => s.type === 'raster') as
      | { type: 'raster'; tiles?: string[]; attribution?: string }
      | undefined
    expect(raster).toBeDefined()
    expect(Array.isArray(raster!.tiles)).toBe(true)
    expect(
      raster!.tiles!.some(
        (t) =>
          /basemaps\.cartocdn\.com\/rastertiles\/voyager/.test(t) &&
          t.includes('{z}/{x}/{y}'),
      ),
    ).toBe(true)
  })

  it('has at least one raster layer', () => {
    const style = getMapStyle() as StyleSpecification
    const rasterLayers = style.layers.filter((l) => l.type === 'raster')
    expect(rasterLayers.length).toBeGreaterThanOrEqual(1)
  })

  it('carries a non-empty attribution mentioning OpenStreetMap', () => {
    const style = getMapStyle() as StyleSpecification
    const raster = Object.values(style.sources).find(
      (s) => s.type === 'raster',
    ) as { attribution?: string } | undefined
    expect(raster?.attribution).toBeTruthy()
    expect(raster!.attribution).toMatch(/OpenStreetMap/i)
  })
})
