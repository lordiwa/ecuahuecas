<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { huecasTop } from '@/lib/content'
import Estrellas from '@/components/Estrellas.vue'
import PrecioDots from '@/components/PrecioDots.vue'

useHead({ title: 'Top 10 huecas — EcuaHuecas' })

const top = huecasTop(10)
</script>

<template>
  <section class="container section">
    <p class="eyebrow">Ranking</p>
    <h1 class="h-display">Top 10 huecas</h1>
    <p class="cuerpo-editorial">Las mejor calificadas. Sin sorteos, sin auspicios.</p>

    <ol v-if="top.length" class="top-list">
      <li v-for="(h, idx) in top" :key="h.slug" class="card card--hover" :class="{ destacado: idx < 3 }">
        <RouterLink :to="`/huecas/${h.slug}`" class="top-link">
          <span class="num">{{ String(idx + 1).padStart(2, '0') }}</span>
          <div>
            <p class="eyebrow">{{ h.ciudad }} · {{ h.barrio }}</p>
            <h2 class="h-titulo">{{ h.nombre }}</h2>
            <p class="meta">
              <Estrellas :value="h.rating" :size="14" />
              <span class="mono">{{ h.rating.toFixed(1) }} · {{ h.reviews }} reseñas</span>
              <PrecioDots :value="h.precio" />
            </p>
          </div>
        </RouterLink>
      </li>
    </ol>
    <p v-else class="cuerpo-editorial">Aún no hay huecas suficientes.</p>
  </section>
</template>

<style scoped>
.top-list { list-style: none; padding: 0; display: grid; gap: 16px; margin-top: 32px; }
.destacado { background: var(--amarillo); }
.top-link { display: flex; align-items: center; gap: 18px; text-decoration: none; color: inherit; }
.num { font-family: var(--display); font-size: 3.5rem; color: var(--rojo); min-width: 80px; line-height: 1; }
.meta { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
.mono { font-family: var(--mono); font-size: 12px; }
</style>
