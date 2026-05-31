<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { BlogPostPreview } from 'blog-component'
import { getCritico, resenas } from '@/lib/content'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const critico = computed(() => getCritico(slug.value))
const susResenas = computed(() =>
  critico.value ? resenas.filter((r) => r.critico_id === critico.value!.slug) : [],
)
const tieneBio = computed(() => (critico.value?.bio?.length ?? 0) > 0)

// `internalLink`s inside a bio point at reseñas → /resenas/:slug.
const resolveInternalHref = (s: string) => `/resenas/${s}`

useHead(() => ({
  title: critico.value ? `${critico.value.nombre} — EcuaHuecas` : 'Crítico no encontrado',
}))
</script>

<template>
  <article v-if="critico" class="container section">
    <p class="eyebrow">{{ critico.ciudad }} · desde {{ critico.desde }}</p>
    <h1 class="h-display">{{ critico.nombre }}</h1>
    <p class="cuerpo-editorial">{{ critico.especialidad }}</p>

    <div v-if="tieneBio" class="critico-bio cuerpo-editorial">
      <BlogPostPreview
        :body="critico.bio"
        project-id="gvc4yjqj"
        dataset="production"
        :link-component="RouterLink"
        :resolve-internal-href="resolveInternalHref"
      />
    </div>

    <section v-if="susResenas.length" class="critico-resenas">
      <h2 class="h-titulo">Sus reseñas</h2>
      <ul class="critico-list">
        <li v-for="r in susResenas" :key="r.slug" class="card card--hover">
          <RouterLink :to="`/resenas/${r.slug}`" class="critico-link">
            <p class="eyebrow">{{ r.fecha }}</p>
            <h3 class="h-titulo">{{ r.titulo }}</h3>
            <p>{{ r.extracto }}</p>
          </RouterLink>
        </li>
      </ul>
    </section>
  </article>

  <section v-else class="container section">
    <h1 class="h-display">Crítico no encontrado</h1>
  </section>
</template>

<style scoped>
.critico-bio { margin-top: 24px; max-width: 70ch; }
/* List-style gotcha: re-assert markers nulled by the global reset, scoped to the bio. */
.critico-bio :deep(ul) { list-style: disc outside; padding-left: 1.5em; margin-block: 1em; }
.critico-bio :deep(ol) { list-style: decimal outside; padding-left: 1.5em; margin-block: 1em; }
.critico-bio :deep(a) {
  color: var(--rojo);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.critico-resenas { margin-top: 56px; }
.critico-list { list-style: none; padding: 0; display: grid; gap: 20px; margin-top: 24px; }
.critico-link { text-decoration: none; color: inherit; display: block; }
.critico-link > * + * { margin-top: 6px; }
</style>
