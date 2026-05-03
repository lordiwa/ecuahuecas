<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { huecas } from '@/lib/content'

useHead({ title: 'Mapa — EcuaHuecas' })

// Placeholder. Pendiente: portar MapaEstilizado del prototipo a SVG Vue.
const conCoords = huecas.filter((h) => h.coords)
</script>

<template>
  <section class="container section">
    <p class="eyebrow">Mapa</p>
    <h1 class="h-display">Las huecas, en el mapa</h1>
    <p class="cuerpo-editorial">
      (Pendiente) Aquí va el mapa estilizado con pines posicionados por <code>coords.x/y</code>.
    </p>
    <ul class="lista">
      <li v-for="h in conCoords" :key="h.slug">
        <RouterLink :to="`/huecas/${h.slug}`">
          <strong>{{ h.nombre }}</strong> — {{ h.ciudad }} · {{ h.barrio }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.lista { list-style: none; padding: 0; margin-top: 24px; display: grid; gap: 8px; font-family: var(--titulo); }
code { font-family: var(--mono); background: var(--amarillo-suave); padding: 2px 6px; border-radius: 3px; }
</style>
