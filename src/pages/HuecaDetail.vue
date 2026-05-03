<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { getHueca, resenasDeHueca } from '@/lib/content'
import Estrellas from '@/components/Estrellas.vue'
import PrecioDots from '@/components/PrecioDots.vue'
import Foto from '@/components/Foto.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const hueca = computed(() => getHueca(slug.value))
const resenas = computed(() => (hueca.value ? resenasDeHueca(hueca.value.slug) : []))

useHead(() => ({
  title: hueca.value ? `${hueca.value.nombre} — EcuaHuecas` : 'Hueca no encontrada',
  meta: hueca.value
    ? [
        { name: 'description', content: hueca.value.descripcion ?? `${hueca.value.plato_estrella} en ${hueca.value.ciudad}.` },
        { property: 'og:title', content: hueca.value.nombre },
      ]
    : [],
}))
</script>

<template>
  <article v-if="hueca" class="container section">
    <p class="eyebrow">{{ hueca.ciudad }} · {{ hueca.barrio }}</p>
    <h1 class="h-display">{{ hueca.nombre }}</h1>
    <p class="hueca-meta">
      <Estrellas :value="hueca.rating" />
      <span class="mono-meta">{{ hueca.rating.toFixed(1) }} · {{ hueca.reviews }} reseñas</span>
      <PrecioDots :value="hueca.precio" />
    </p>

    <div class="hueca-grid">
      <Foto :seed="hueca.slug" :color="hueca.fotos[0] ?? '#FFCB05'" aspect="4/3" />
      <dl class="hueca-datos">
        <div><dt>Plato estrella</dt><dd>{{ hueca.plato_estrella }}</dd></div>
        <div><dt>Dirección</dt><dd>{{ hueca.direccion }}</dd></div>
        <div><dt>Horario</dt><dd>{{ hueca.horario }}</dd></div>
        <div><dt>Desde</dt><dd>{{ hueca.desde }}</dd></div>
      </dl>
    </div>

    <p v-if="hueca.descripcion" class="cuerpo-editorial hueca-desc">{{ hueca.descripcion }}</p>

    <ul v-if="hueca.tags.length" class="hueca-tags">
      <li v-for="t in hueca.tags" :key="t" class="chip">{{ t }}</li>
    </ul>

    <section v-if="resenas.length" class="hueca-resenas">
      <h2 class="h-titulo">Reseñas</h2>
      <article v-for="r in resenas" :key="r.slug" class="card">
        <p class="eyebrow">{{ r.fecha }}</p>
        <h3 class="h-titulo">{{ r.titulo }}</h3>
        <p>{{ r.extracto }}</p>
        <Estrellas :value="r.rating" :size="14" />
      </article>
    </section>
  </article>

  <section v-else class="container section">
    <h1 class="h-display">Hueca no encontrada</h1>
    <p>El slug <code>{{ slug }}</code> no existe.</p>
    <RouterLink to="/" class="btn">Volver al inicio</RouterLink>
  </section>
</template>

<style scoped>
.hueca-meta { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.mono-meta { font-family: var(--mono); font-size: 13px; opacity: 0.8; }
.hueca-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 32px;
  margin-top: 32px;
}
@media (max-width: 800px) { .hueca-grid { grid-template-columns: 1fr; } }
.hueca-datos { display: grid; gap: 16px; }
.hueca-datos dt { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--rojo); }
.hueca-datos dd { font-family: var(--titulo); font-size: 1.1rem; margin-top: 2px; }
.hueca-desc { margin-top: 32px; }
.hueca-tags { display: flex; gap: 8px; flex-wrap: wrap; list-style: none; padding: 0; margin-top: 24px; }
.hueca-resenas { margin-top: 56px; display: grid; gap: 20px; }
.hueca-resenas .card > * + * { margin-top: 8px; }
</style>
