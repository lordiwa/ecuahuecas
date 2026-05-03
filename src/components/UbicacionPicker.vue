<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef, computed } from 'vue'
import { getMapStyle, pinElement, ECUADOR_CENTER, type LngLat } from '@/lib/map'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = withDefaults(
  defineProps<{
    modelValue: LngLat | null
    initialCenter?: LngLat
    initialZoom?: number
    height?: string
  }>(),
  {
    initialCenter: () => ECUADOR_CENTER,
    initialZoom: 6,
    height: '380px',
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: LngLat | null): void }>()

const container = ref<HTMLDivElement | null>(null)
const map = shallowRef<import('maplibre-gl').Map | null>(null)
const marker = shallowRef<import('maplibre-gl').Marker | null>(null)

const latInput = ref<string>(props.modelValue ? String(props.modelValue.lat) : '')
const lngInput = ref<string>(props.modelValue ? String(props.modelValue.lng) : '')
const inputError = ref<string | null>(null)

const summary = computed(() => {
  if (!props.modelValue) return 'Sin ubicación. Click en el mapa o ingresa lat/lng.'
  return `${props.modelValue.lat.toFixed(6)}, ${props.modelValue.lng.toFixed(6)}`
})

onMounted(async () => {
  if (!container.value) return
  const maplibre = await import('maplibre-gl')
  const start = props.modelValue ?? props.initialCenter

  map.value = new maplibre.Map({
    container: container.value,
    style: getMapStyle(),
    center: [start.lng, start.lat],
    zoom: props.modelValue ? 14 : props.initialZoom,
    attributionControl: { compact: true },
  })

  map.value.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')
  map.value.addControl(new maplibre.GeolocateControl({ trackUserLocation: false }), 'top-right')

  if (props.modelValue) placeMarker(props.modelValue)

  map.value.on('click', (event) => {
    placeMarker({ lat: event.lngLat.lat, lng: event.lngLat.lng }, { emit: true })
  })
})

async function placeMarker(coords: LngLat, opts: { emit?: boolean } = {}) {
  if (!map.value) return
  const maplibre = await import('maplibre-gl')
  if (!marker.value) {
    const el = pinElement()
    marker.value = new maplibre.Marker({ element: el, anchor: 'bottom', draggable: true })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map.value)
    marker.value.on('dragend', () => {
      const ll = marker.value?.getLngLat()
      if (!ll) return
      const next = { lat: ll.lat, lng: ll.lng }
      latInput.value = String(next.lat)
      lngInput.value = String(next.lng)
      emit('update:modelValue', next)
    })
  } else {
    marker.value.setLngLat([coords.lng, coords.lat])
  }
  latInput.value = String(coords.lat)
  lngInput.value = String(coords.lng)
  if (opts.emit) emit('update:modelValue', coords)
}

watch(
  () => props.modelValue,
  (next) => {
    if (!next) {
      marker.value?.remove()
      marker.value = null
      latInput.value = ''
      lngInput.value = ''
      return
    }
    void placeMarker(next)
  },
)

function applyInputs() {
  const lat = Number.parseFloat(latInput.value)
  const lng = Number.parseFloat(lngInput.value)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    inputError.value = 'Ingresa números válidos para lat y lng'
    return
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    inputError.value = 'Rangos válidos: lat ∈ [-90, 90], lng ∈ [-180, 180]'
    return
  }
  inputError.value = null
  const next = { lat, lng }
  emit('update:modelValue', next)
  void placeMarker(next)
  map.value?.flyTo({ center: [lng, lat], zoom: 14 })
}

function clearLocation() {
  emit('update:modelValue', null)
}

function pasteFromGoogleMaps() {
  const raw = window.prompt('Pega coordenadas desde Google Maps (formato "lat, lng"):')
  if (!raw) return
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/)
  if (!match) {
    inputError.value = 'No pude leer lat/lng en ese texto'
    return
  }
  latInput.value = match[1]
  lngInput.value = match[2]
  applyInputs()
}

onBeforeUnmount(() => {
  marker.value?.remove()
  map.value?.remove()
})
</script>

<template>
  <div class="picker">
    <div ref="container" class="picker-map" :style="{ height }" />

    <div class="picker-controls">
      <div class="picker-summary">
        <span class="picker-label">Ubicación:</span>
        <span class="picker-value">{{ summary }}</span>
      </div>
      <div class="picker-inputs">
        <label>
          <span>Lat</span>
          <input v-model="latInput" type="text" inputmode="decimal" placeholder="-0.2105" />
        </label>
        <label>
          <span>Lng</span>
          <input v-model="lngInput" type="text" inputmode="decimal" placeholder="-78.4868" />
        </label>
        <button type="button" class="btn btn--blanco" @click="applyInputs">Aplicar</button>
        <button type="button" class="btn btn--ghost" @click="pasteFromGoogleMaps">Pegar de Maps</button>
        <button v-if="modelValue" type="button" class="btn btn--ghost picker-clear" @click="clearLocation">Limpiar</button>
      </div>
      <p v-if="inputError" class="picker-error">{{ inputError }}</p>
    </div>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.picker-map {
  width: 100%;
  border: var(--borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-bloque-sm);
  overflow: hidden;
}
.picker-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
}
.picker-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--mono);
  font-size: 12px;
}
.picker-label { letter-spacing: 1px; text-transform: uppercase; opacity: 0.7; }
.picker-value { font-weight: 700; color: var(--rojo); }

.picker-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
}
.picker-inputs label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.picker-inputs input {
  font-family: var(--mono);
  font-size: 13px;
  padding: 8px 10px;
  border: 2px solid var(--linea);
  border-radius: var(--radio-sm);
  background: var(--amarillo-suave);
  width: 130px;
}
.picker-inputs input:focus-visible {
  outline: none;
  background: var(--amarillo);
}
.picker-clear { color: var(--rojo); }

.picker-error {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--rojo);
}
</style>
