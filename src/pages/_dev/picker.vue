<script setup lang="ts">
import { ref } from 'vue'
import UbicacionPicker from '@/components/UbicacionPicker.vue'
import type { LngLat } from '@/lib/map'

const coords = ref<LngLat | null>(null)
const presets: { name: string; coords: LngLat }[] = [
  { name: 'Mitad del Mundo', coords: { lat: 0.0022, lng: -78.4558 } },
  { name: 'Malecón 2000', coords: { lat: -2.1894, lng: -79.8810 } },
  { name: 'Cuenca Centro', coords: { lat: -2.9001, lng: -79.0059 } },
]

function setPreset(c: LngLat) {
  coords.value = c
}
</script>

<template>
  <div class="container section">
    <p class="eyebrow">Sub-fase A.3 · UbicacionPicker</p>
    <h1 class="h-display">Picker playground</h1>
    <p class="lead">
      Click en el mapa fija el pin. Arrástralo para reubicar. O ingresa lat/lng manualmente y aplica.
      También puedes pegar coordenadas copiadas de Google Maps (formato "lat, lng").
    </p>

    <div class="dev-toolbar">
      <span class="meta">Presets:</span>
      <button v-for="p in presets" :key="p.name" class="btn btn--ghost" @click="setPreset(p.coords)">
        {{ p.name }}
      </button>
    </div>

    <UbicacionPicker v-model="coords" height="500px" />

    <details class="dev-raw">
      <summary>Estado actual</summary>
      <pre>{{ coords ?? 'null' }}</pre>
    </details>
  </div>
</template>

<style scoped>
.lead {
  max-width: 720px;
  font-family: var(--texto);
  font-size: 1rem;
  margin: 8px 0 24px;
  opacity: 0.85;
}
.dev-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px 14px;
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--amarillo-suave);
  margin-bottom: 16px;
}
.dev-toolbar .meta {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.85;
}
.dev-raw {
  margin-top: 24px;
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  padding: 12px 16px;
}
.dev-raw summary {
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
}
.dev-raw pre {
  margin-top: 12px;
  padding: 12px;
  background: var(--amarillo-suave);
  border-radius: var(--radio-sm);
  font-family: var(--mono);
  font-size: 13px;
}
</style>
