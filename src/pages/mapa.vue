<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHead } from '@unhead/vue'
import { huecas } from '@/lib/content'
import MapaReal, { type MapHueca } from '@/components/MapaReal.vue'

useHead({ title: 'Mapa — EcuaHuecas' })

const conCoords = computed<MapHueca[]>(() =>
  huecas
    .filter((h) => h.coords)
    .map((h) => ({
      slug: h.slug,
      nombre: h.nombre,
      ciudad: h.ciudad,
      rating: h.rating,
      coords: h.coords!,
    })),
)

const mapaRef = ref<InstanceType<typeof MapaReal> | null>(null)
const sheetOpen = ref(true)
const selected = ref<string | null>(null)

function focus(slug: string) {
  const h = conCoords.value.find((x) => x.slug === slug)
  if (!h) return
  selected.value = slug
  mapaRef.value?.flyTo(h.coords, 14)
  setTimeout(() => mapaRef.value?.openPopup(slug), 350)
}

function onSelect(slug: string) {
  selected.value = slug
  const card = document.querySelector(`[data-slug="${slug}"]`)
  card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
</script>

<template>
  <section class="mapa-section">
    <div class="mapa-header container">
      <p class="eyebrow">Mapa</p>
      <h1 class="h-display">Las huecas, en el mapa</h1>
      <p class="cuerpo-editorial">
        Quito y Guayaquil con coordenadas reales. Toca un pin para abrir la hueca.
      </p>
    </div>

    <div class="mapa-layout">
      <MapaReal
        ref="mapaRef"
        :huecas="conCoords"
        height="calc(100vh - 240px)"
        @select="onSelect"
      />

      <aside class="sheet" :data-open="sheetOpen">
        <button
          type="button"
          class="sheet-handle"
          :aria-expanded="sheetOpen"
          @click="sheetOpen = !sheetOpen"
        >
          <span class="sheet-handle-bar" />
          <span class="sheet-handle-label">{{ sheetOpen ? 'Ocultar lista' : `Mostrar lista (${conCoords.length})` }}</span>
        </button>

        <ul class="sheet-list">
          <li
            v-for="h in conCoords"
            :key="h.slug"
            :data-slug="h.slug"
            class="sheet-card"
            :class="{ 'is-selected': selected === h.slug }"
            @click="focus(h.slug)"
          >
            <div class="sheet-card-meta">
              <span class="chip" :class="{ 'chip--rojo': h.ciudad === 'Quito', 'chip--azul': h.ciudad === 'Guayaquil' }">
                {{ h.ciudad }}
              </span>
              <span class="rating">{{ h.rating.toFixed(1) }} ★</span>
            </div>
            <div class="sheet-card-name">{{ h.nombre }}</div>
            <RouterLink :to="`/huecas/${h.slug}`" class="sheet-card-link" @click.stop>
              Ver hueca →
            </RouterLink>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.mapa-section { padding-block: 32px 0; }
.mapa-header { margin-bottom: 16px; }

.mapa-layout {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  width: min(1400px, 100% - 24px);
  margin-inline: auto;
}
@media (min-width: 900px) {
  .mapa-layout {
    grid-template-columns: 1fr 340px;
    gap: 16px;
  }
}

.sheet {
  background: var(--crema);
  border: var(--borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-bloque-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@media (max-width: 899px) {
  .sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 60vh;
    border-radius: var(--radio-md) var(--radio-md) 0 0;
    transform: translateY(calc(100% - 56px));
    transition: transform 220ms ease;
    z-index: 20;
  }
  .sheet[data-open="true"] {
    transform: translateY(0);
  }
}

.sheet-handle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border: none;
  border-bottom: 2.5px solid var(--linea);
  background: var(--amarillo);
  cursor: pointer;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.sheet-handle-bar {
  display: block;
  width: 48px;
  height: 4px;
  border-radius: 2px;
  background: var(--linea);
}

.sheet-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}
.sheet-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-bottom: 2px solid var(--linea);
  cursor: pointer;
  transition: background 80ms ease;
}
.sheet-card:hover { background: var(--amarillo-suave); }
.sheet-card.is-selected {
  background: var(--amarillo);
}
.sheet-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sheet-card-meta .rating {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--rojo);
  font-weight: 700;
}
.sheet-card-name {
  font-family: var(--display);
  font-size: 16px;
}
.sheet-card-link {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--rojo);
  text-decoration: none;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.sheet-card-link:hover { text-decoration: underline; }
</style>
