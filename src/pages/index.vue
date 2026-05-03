<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { huecas, resenas, criticos, huecasTop } from '@/lib/content'
import Estrellas from '@/components/Estrellas.vue'
import PrecioDots from '@/components/PrecioDots.vue'
import Foto from '@/components/Foto.vue'

useHead({
  title: 'EcuaHuecas — Comida de calle, sin filtros',
  meta: [
    {
      name: 'description',
      content:
        'Reseñas honestas de huecas ecuatorianas: carretillas, mercados y picanterías de barrio en Quito y Guayaquil.',
    },
    { property: 'og:title', content: 'EcuaHuecas' },
    { property: 'og:description', content: 'Comida de calle, sin filtros.' },
    { property: 'og:type', content: 'website' },
  ],
})

const destacada = huecasTop(1)[0]
const recientes = resenas.slice(0, 6)
const top = huecasTop(6)
</script>

<template>
  <section class="hero container section">
    <p class="eyebrow">Edición {{ new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long' }) }}</p>
    <h1 class="h-display">
      Comida de calle,<br />
      <span class="hero-rojo">sin filtros.</span>
    </h1>
    <p class="hero-sub cuerpo-editorial">
      Reseñas honestas de huecas ecuatorianas. Carretillas, mercados, picanterías de barrio.
      Si está bueno, lo decimos. Si está malo, también.
    </p>

    <div v-if="destacada" class="hero-destacada">
      <Foto :seed="destacada.slug" :color="destacada.fotos[0] ?? '#FFCB05'" aspect="16/9" />
      <div class="hero-destacada__cuerpo">
        <p class="eyebrow">Hueca destacada · {{ destacada.ciudad }}</p>
        <h2 class="h-titulo">{{ destacada.nombre }}</h2>
        <p class="hueca-meta">
          <span class="chip chip--rojo">{{ destacada.plato_estrella }}</span>
          <PrecioDots :value="destacada.precio" />
          <Estrellas :value="destacada.rating" />
          <span class="mono-meta">{{ destacada.rating.toFixed(1) }}</span>
        </p>
        <p v-if="destacada.descripcion" class="cuerpo-editorial">{{ destacada.descripcion }}</p>
        <RouterLink :to="`/huecas/${destacada.slug}`" class="btn btn--rojo">Leer todo</RouterLink>
      </div>
    </div>
  </section>

  <section v-if="recientes.length" class="container section">
    <header class="section-header">
      <p class="eyebrow">Lo último</p>
      <h2 class="h-display">Reseñas recientes</h2>
    </header>
    <div class="grid grid--3">
      <RouterLink
        v-for="r in recientes"
        :key="r.slug"
        :to="`/resenas/${r.slug}`"
        class="card card--hover resena-card"
      >
        <Foto :seed="r.slug" :color="r.imagen ?? '#E8833A'" aspect="4/3" />
        <p class="eyebrow">{{ r.fecha }}</p>
        <h3 class="h-titulo resena-card__titulo">{{ r.titulo }}</h3>
        <p class="resena-card__extracto">{{ r.extracto }}</p>
        <Estrellas :value="r.rating" :size="14" />
      </RouterLink>
    </div>
  </section>

  <section v-if="top.length" class="container section">
    <header class="section-header">
      <p class="eyebrow">Top huecas</p>
      <h2 class="h-display">Las mejor calificadas</h2>
    </header>
    <ol class="grid grid--2 top-list">
      <li v-for="(h, idx) in top" :key="h.slug" class="card card--hover">
        <RouterLink :to="`/huecas/${h.slug}`" class="top-link">
          <span class="top-num">{{ String(idx + 1).padStart(2, '0') }}</span>
          <div>
            <p class="eyebrow">{{ h.ciudad }} · {{ h.barrio }}</p>
            <h3 class="h-titulo">{{ h.nombre }}</h3>
            <p class="hueca-meta">
              <Estrellas :value="h.rating" :size="14" />
              <span class="mono-meta">{{ h.rating.toFixed(1) }} · {{ h.reviews }} reseñas</span>
            </p>
          </div>
        </RouterLink>
      </li>
    </ol>
  </section>

  <section v-if="criticos.length" class="container section">
    <header class="section-header">
      <p class="eyebrow">El colectivo</p>
      <h2 class="h-display">Críticos</h2>
    </header>
    <div class="grid grid--3">
      <article v-for="c in criticos" :key="c.slug" class="card critico-card">
        <p class="h-titulo">{{ c.nombre }}</p>
        <p class="mono-meta">{{ c.ciudad }} · desde {{ c.desde }}</p>
        <p class="critico-card__especialidad">{{ c.especialidad }}</p>
      </article>
    </div>
  </section>

  <section v-if="!huecas.length" class="container section empty-state">
    <p class="eyebrow">Atención</p>
    <h2 class="h-titulo">Aún no hay huecas cargadas.</h2>
    <p>Agrega un .md en <code>src/content/huecas/</code>.</p>
  </section>
</template>

<style scoped>
.hero {
  text-align: left;
}
.hero-rojo { color: var(--rojo); }
.hero-sub { max-width: 60ch; margin-top: 18px; }

.hero-destacada {
  margin-top: 40px;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 32px;
  align-items: center;
}
@media (max-width: 800px) {
  .hero-destacada { grid-template-columns: 1fr; }
}
.hero-destacada__cuerpo > * + * { margin-top: 14px; }

.section-header {
  margin-bottom: 28px;
}

.hueca-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.mono-meta {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--tinta);
  opacity: 0.8;
}

.resena-card { text-decoration: none; color: inherit; display: block; }
.resena-card > * + * { margin-top: 10px; }
.resena-card__titulo { font-size: 1.3rem; }
.resena-card__extracto { font-family: var(--titulo); font-size: 1rem; line-height: 1.5; }

.top-list {
  list-style: none;
  padding: 0;
}
.top-link {
  display: flex;
  align-items: center;
  gap: 18px;
  text-decoration: none;
  color: inherit;
}
.top-num {
  font-family: var(--display);
  font-size: 3.5rem;
  color: var(--rojo);
  line-height: 1;
  min-width: 70px;
}

.critico-card > * + * { margin-top: 6px; }
.critico-card__especialidad { font-family: var(--titulo); font-style: italic; }

.empty-state code {
  font-family: var(--mono);
  background: var(--amarillo-suave);
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
