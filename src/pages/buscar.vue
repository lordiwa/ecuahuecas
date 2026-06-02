<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHead } from '@unhead/vue'
import { huecas } from '@/lib/content'
import Estrellas from '@/components/Estrellas.vue'
import PrecioDots from '@/components/PrecioDots.vue'

useHead({ title: 'Buscar — EcuaHuecas' })

const q = ref('')
const ciudad = ref<'' | 'Quito' | 'Guayaquil' | 'Cuenca' | 'Manta'>('')

const resultados = computed(() => {
  const needle = q.value.trim().toLowerCase()
  return huecas.value.filter((h) => {
    if (ciudad.value && h.ciudad !== ciudad.value) return false
    if (!needle) return true
    return (
      h.nombre.toLowerCase().includes(needle) ||
      h.plato_estrella.toLowerCase().includes(needle) ||
      h.barrio.toLowerCase().includes(needle) ||
      h.tags.some((t) => t.toLowerCase().includes(needle))
    )
  })
})
</script>

<template>
  <section class="container section">
    <p class="eyebrow">Buscador</p>
    <h1 class="h-display">¿Qué se te antoja?</h1>

    <div class="search-bar">
      <input
        v-model="q"
        type="search"
        placeholder="encebollado, seco, fritada..."
        aria-label="Buscar"
      />
      <select v-model="ciudad" aria-label="Filtrar por ciudad">
        <option value="">Todas las ciudades</option>
        <option value="Quito">Quito</option>
        <option value="Guayaquil">Guayaquil</option>
        <option value="Cuenca">Cuenca</option>
        <option value="Manta">Manta</option>
      </select>
    </div>

    <p class="conteo mono">{{ resultados.length }} {{ resultados.length === 1 ? 'hueca' : 'huecas' }} encontrada{{ resultados.length === 1 ? '' : 's' }}</p>

    <ul v-if="resultados.length" class="resultados">
      <li v-for="h in resultados" :key="h.slug" class="card card--hover">
        <RouterLink :to="`/huecas/${h.slug}`" class="resultado-link">
          <p class="eyebrow">{{ h.ciudad }} · {{ h.barrio }}</p>
          <h2 class="h-titulo">{{ h.nombre }}</h2>
          <p class="meta">
            <Estrellas :value="h.rating" :size="14" />
            <span class="mono">{{ h.rating.toFixed(1) }}</span>
            <PrecioDots :value="h.precio" />
            <span class="chip">{{ h.plato_estrella }}</span>
          </p>
        </RouterLink>
      </li>
    </ul>
    <p v-else class="empty cuerpo-editorial">Ni una hueca encontrada. Prueba con otro plato.</p>
  </section>
</template>

<style scoped>
.search-bar { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
.search-bar input,
.search-bar select {
  font-family: var(--texto);
  font-size: 1.1rem;
  padding: 14px 18px;
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  color: var(--tinta);
}
.search-bar input { flex: 1; min-width: 240px; }
.search-bar input:focus,
.search-bar select:focus { outline: none; box-shadow: var(--sombra-bloque-sm); }
.conteo { margin-top: 16px; opacity: 0.7; }
.mono { font-family: var(--mono); font-size: 12px; }
.resultados { list-style: none; padding: 0; display: grid; gap: 16px; margin-top: 24px; }
.resultado-link { text-decoration: none; color: inherit; display: block; }
.resultado-link > * + * { margin-top: 8px; }
.meta { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.empty { margin-top: 40px; }
</style>
