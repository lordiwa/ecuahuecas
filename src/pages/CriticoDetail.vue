<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { getCritico, resenas } from '@/lib/content'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const critico = computed(() => getCritico(slug.value))
const susResenas = computed(() =>
  critico.value ? resenas.filter((r) => r.critico_id === critico.value!.slug) : [],
)

useHead(() => ({
  title: critico.value ? `${critico.value.nombre} — EcuaHuecas` : 'Crítico no encontrado',
}))
</script>

<template>
  <article v-if="critico" class="container section">
    <p class="eyebrow">{{ critico.ciudad }} · desde {{ critico.desde }}</p>
    <h1 class="h-display">{{ critico.nombre }}</h1>
    <p class="cuerpo-editorial">{{ critico.especialidad }}</p>

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
.critico-resenas { margin-top: 56px; }
.critico-list { list-style: none; padding: 0; display: grid; gap: 20px; margin-top: 24px; }
.critico-link { text-decoration: none; color: inherit; display: block; }
.critico-link > * + * { margin-top: 6px; }
</style>
