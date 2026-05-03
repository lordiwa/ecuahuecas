export interface LngLat {
  lat: number
  lng: number
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined

const FALLBACK_STYLE = 'https://demotiles.maplibre.org/style.json'

export function getMapStyle(): string {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  }
  return FALLBACK_STYLE
}

export const usingMaptiler = !!MAPTILER_KEY

export const ECUADOR_CENTER: LngLat = { lat: -1.5, lng: -78.5 }

export const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dx="3" dy="3" result="off" />
      <feFlood flood-color="#1A1A1A" />
      <feComposite in2="off" operator="in" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <path d="M17 1 C8.5 1 2 7.5 2 16 C2 27.5 17 42 17 42 C17 42 32 27.5 32 16 C32 7.5 25.5 1 17 1 Z"
          fill="#C73E1D" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round" />
    <circle cx="17" cy="16" r="5" fill="#FFF8E7" stroke="#1A1A1A" stroke-width="2" />
  </g>
</svg>`

export function pinElement(): HTMLDivElement {
  const el = document.createElement('div')
  el.innerHTML = PIN_SVG
  el.style.cursor = 'pointer'
  el.style.lineHeight = '0'
  return el
}

export function fitBoundsForPoints(points: LngLat[]): {
  bounds: [[number, number], [number, number]]
  center: LngLat
} | null {
  if (points.length === 0) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lat < minLat) minLat = p.lat
    if (p.lng > maxLng) maxLng = p.lng
    if (p.lat > maxLat) maxLat = p.lat
  }
  return {
    bounds: [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
  }
}
