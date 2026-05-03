<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import MarkdownIt from 'markdown-it'
import { getResena, getHueca, getCritico } from '@/lib/content'
import Estrellas from '@/components/Estrellas.vue'
import Foto from '@/components/Foto.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const resena = computed(() => getResena(slug.value))
const hueca = computed(() => (resena.value ? getHueca(resena.value.hueca_id) : undefined))
const critico = computed(() => (resena.value ? getCritico(resena.value.critico_id) : undefined))

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
const bodyHtml = computed(() => (resena.value ? md.render(resena.value.body) : ''))

useHead(() => ({
  title: resena.value ? `${resena.value.titulo} — EcuaHuecas` : 'Reseña no encontrada',
  meta: resena.value ? [{ name: 'description', content: resena.value.extracto }] : [],
}))
</script>

<template>
  <article v-if="resena" class="container section resena">
    <p class="eyebrow">{{ resena.fecha }} · por {{ critico?.nombre ?? '—' }}</p>
    <h1 class="h-display">{{ resena.titulo }}</h1>
    <p class="resena-meta">
      <Estrellas :value="resena.rating" />
      <span class="mono-meta">{{ resena.rating.toFixed(1) }}</span>
      <span v-if="hueca">· en <RouterLink :to="`/huecas/${hueca.slug}`">{{ hueca.nombre }}</RouterLink></span>
    </p>

    <Foto :seed="resena.slug" :color="resena.imagen ?? '#E8833A'" aspect="16/9" class="resena-hero" />

    <div class="resena-body cuerpo-editorial" v-html="bodyHtml" />

    <aside v-if="resena.veredicto" class="veredicto">
      <h2 class="h-titulo">Veredicto</h2>
      <div class="veredicto-grid">
        <div v-if="resena.veredicto.aFavor.length">
          <p class="eyebrow">A favor</p>
          <ul><li v-for="(it, i) in resena.veredicto.aFavor" :key="`f-${i}`">{{ it }}</li></ul>
        </div>
        <div v-if="resena.veredicto.enContra.length">
          <p class="eyebrow">En contra</p>
          <ul><li v-for="(it, i) in resena.veredicto.enContra" :key="`c-${i}`">{{ it }}</li></ul>
        </div>
        <div v-if="resena.veredicto.ticket">
          <p class="eyebrow">Ticket</p>
          <p class="veredicto-ticket">{{ resena.veredicto.ticket }}</p>
        </div>
      </div>
    </aside>
  </article>

  <section v-else class="container section">
    <h1 class="h-display">Reseña no encontrada</h1>
    <RouterLink to="/" class="btn">Volver al inicio</RouterLink>
  </section>
</template>

<style scoped>
.resena { max-width: 760px; }
.resena-meta { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.mono-meta { font-family: var(--mono); font-size: 13px; }
.resena-meta a { color: var(--rojo); font-weight: 700; }
.resena-hero { margin: 32px 0; }
.resena-body { font-size: 1.25rem; line-height: 1.7; }
.resena-body :deep(p) { margin-block: 1em; }
.resena-body :deep(h2) { font-family: var(--display); font-size: 1.6rem; margin-top: 2em; }

.veredicto {
  margin-top: 56px;
  padding: 28px;
  background: var(--amarillo);
  border: var(--borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-bloque);
}
.veredicto-grid {
  display: grid;
  gap: 20px;
  margin-top: 16px;
}
.veredicto ul { list-style: none; padding: 0; font-family: var(--titulo); }
.veredicto li { padding: 6px 0; border-bottom: 1px dashed var(--linea); }
.veredicto-ticket { font-family: var(--mono); font-weight: 500; }
</style>
