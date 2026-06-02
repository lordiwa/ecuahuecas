<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { getHueca, resenasDeHueca } from '@/lib/content'
import { ogImageUrl, absoluteUrl } from '@/lib/og'
import Estrellas from '@/components/Estrellas.vue'
import PrecioDots from '@/components/PrecioDots.vue'
import Foto from '@/components/Foto.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const hueca = computed(() => getHueca(slug.value))
const resenas = computed(() => (hueca.value ? resenasDeHueca(hueca.value.slug) : []))

// Per-page Open Graph. og:image is the hueca's first photo (hueca.fotos[0])
// as a 1200x630 card, with the branded static fallback when it has none.
// Overrides App.vue's defaults via unhead dedupe; every `content` is a string.
useHead(() => {
  const h = hueca.value
  if (!h) {
    return { title: 'Hueca no encontrada — EcuaHuecas', meta: [] }
  }
  const desc = h.descripcion ?? `${h.plato_estrella} en ${h.ciudad}.`
  const url = absoluteUrl(`/huecas/${h.slug}`)
  const image = ogImageUrl(h.fotos[0] || undefined)
  return {
    title: `${h.nombre} — EcuaHuecas`,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: h.nombre },
      { property: 'og:description', content: desc },
      { property: 'og:image', content: image },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: h.nombre },
      { name: 'twitter:description', content: desc },
      { name: 'twitter:image', content: image },
    ],
  }
})
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
      <div v-if="hueca.fotos.length" class="hueca-galeria">
        <img
          v-for="(foto, i) in hueca.fotos"
          :key="foto"
          :src="foto"
          alt=""
          loading="lazy"
          class="hueca-galeria__foto hueca-galeria__foto--natural"
          :class="{ 'hueca-galeria__foto--principal': i === 0 }"
        />
      </div>
      <Foto v-else :seed="hueca.slug" :color="'#FFCB05'" aspect="4/3" />
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
      <RouterLink
        v-for="r in resenas"
        :key="r.slug"
        :to="`/resenas/${r.slug}`"
        class="card card--hover resena-card"
      >
        <p class="eyebrow">{{ r.fecha }}</p>
        <h3 class="h-titulo">{{ r.titulo }}</h3>
        <p>{{ r.extracto }}</p>
        <Estrellas :value="r.rating" :size="14" />
      </RouterLink>
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

.hueca-galeria {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
/*
 * TASK-028: real uploaded photos render at their NATURAL proportions — full
 * width, auto height, no fixed aspect-ratio box and no object-fit:cover. This
 * shows the WHOLE photo (no zoom/crop) instead of the cover fit added in
 * TASK-026. Border/radius/gap are preserved.
 */
.hueca-galeria__foto--natural {
  width: 100%;
  height: auto;
  display: block;
  border: var(--borde);
  border-radius: var(--radio-md);
}
/* The first photo is prominent: it spans the full width of the gallery. */
.hueca-galeria__foto--principal {
  grid-column: 1 / -1;
}
/* A single photo shouldn't leave a phantom second column. */
.hueca-galeria:has(.hueca-galeria__foto:only-child) { grid-template-columns: 1fr; }

.hueca-resenas { margin-top: 56px; display: grid; gap: 20px; }
.resena-card { text-decoration: none; color: inherit; display: block; }
.resena-card > * + * { margin-top: 8px; }
</style>
