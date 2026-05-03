<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import { getMapStyle, pinElement, fitBoundsForPoints, ECUADOR_CENTER, type LngLat } from '@/lib/map'
import 'maplibre-gl/dist/maplibre-gl.css'

export interface MapHueca {
  slug: string
  nombre: string
  ciudad: string
  rating: number
  coords: LngLat
}

const props = withDefaults(
  defineProps<{
    huecas: MapHueca[]
    center?: LngLat
    zoom?: number
    height?: string
    interactive?: boolean
  }>(),
  {
    center: () => ECUADOR_CENTER,
    zoom: 6,
    height: '480px',
    interactive: true,
  },
)

const emit = defineEmits<{ (e: 'select', slug: string): void }>()

const container = ref<HTMLDivElement | null>(null)
const map = shallowRef<import('maplibre-gl').Map | null>(null)
const markers = shallowRef<import('maplibre-gl').Marker[]>([])

onMounted(async () => {
  if (!container.value) return
  const maplibre = await import('maplibre-gl')
  const fit = fitBoundsForPoints(props.huecas.map((h) => h.coords))
  const startCenter = fit?.center ?? props.center

  map.value = new maplibre.Map({
    container: container.value,
    style: getMapStyle(),
    center: [startCenter.lng, startCenter.lat],
    zoom: props.zoom,
    interactive: props.interactive,
    attributionControl: { compact: true },
  })

  map.value.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')
  map.value.on('load', () => {
    if (fit) {
      map.value?.fitBounds(fit.bounds, { padding: 80, duration: 0, maxZoom: 12 })
    }
    syncMarkers()
  })
})

function syncMarkers() {
  if (!map.value) return
  for (const m of markers.value) m.remove()
  const next: import('maplibre-gl').Marker[] = []
  void import('maplibre-gl').then((maplibre) => {
    if (!map.value) return
    for (const h of props.huecas) {
      const popup = new maplibre.Popup({ offset: 28, closeButton: false }).setHTML(`
        <div class="map-popup">
          <strong>${escapeHtml(h.nombre)}</strong>
          <div class="map-popup-meta">${escapeHtml(h.ciudad)} · ${h.rating.toFixed(1)} ★</div>
          <a class="map-popup-link" href="/huecas/${encodeURIComponent(h.slug)}">Ver hueca →</a>
        </div>
      `)
      const el = pinElement()
      el.addEventListener('click', () => emit('select', h.slug))
      const marker = new maplibre.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([h.coords.lng, h.coords.lat])
        .setPopup(popup)
        .addTo(map.value)
      next.push(marker)
    }
    markers.value = next
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]!))
}

watch(() => props.huecas, syncMarkers, { deep: true })

defineExpose({
  flyTo(coords: LngLat, zoom = 14) {
    map.value?.flyTo({ center: [coords.lng, coords.lat], zoom })
  },
  openPopup(slug: string) {
    const idx = props.huecas.findIndex((h) => h.slug === slug)
    if (idx >= 0) markers.value[idx]?.togglePopup()
  },
})

onBeforeUnmount(() => {
  for (const m of markers.value) m.remove()
  map.value?.remove()
})
</script>

<template>
  <div ref="container" class="mapa-real" :style="{ height }" />
</template>

<style scoped>
.mapa-real {
  width: 100%;
  border: var(--borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-bloque-sm);
  overflow: hidden;
  background: var(--amarillo-suave);
}
</style>

<style>
.maplibregl-popup-content {
  font-family: var(--texto);
  border: 2.5px solid var(--linea);
  border-radius: 8px;
  box-shadow: 4px 4px 0 var(--linea);
  padding: 10px 14px;
  background: var(--crema);
}
.maplibregl-popup-tip { display: none; }
.map-popup strong {
  font-family: var(--display);
  font-size: 15px;
  display: block;
  margin-bottom: 4px;
}
.map-popup-meta {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.75;
  margin-bottom: 8px;
}
.map-popup-link {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--rojo);
  text-decoration: none;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.map-popup-link:hover { text-decoration: underline; }
.maplibregl-ctrl-attrib.maplibregl-compact {
  font-family: var(--mono);
  font-size: 10px;
}
</style>
