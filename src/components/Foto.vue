<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    color?: string
    aspect?: string
    seed?: string
  }>(),
  { alt: '', color: '#FFCB05', aspect: '4/3', seed: 'x' },
)

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const pattern = computed(() => {
  const h = hash(props.seed)
  const variant = h % 4
  return `pat-${variant}`
})
</script>

<template>
  <div class="foto" :style="{ aspectRatio: aspect, background: color }">
    <img v-if="src" :src="src" :alt="alt" loading="lazy" />
    <svg v-else viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g :class="pattern" stroke="var(--linea)" stroke-width="1.2" fill="none">
        <circle cx="20" cy="20" r="8" />
        <circle cx="50" cy="40" r="14" />
        <circle cx="80" cy="20" r="6" />
        <line x1="0" y1="60" x2="100" y2="60" />
        <line x1="0" y1="68" x2="100" y2="68" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.foto {
  position: relative;
  width: 100%;
  border: var(--borde);
  border-radius: var(--radio-md);
  overflow: hidden;
}
.foto img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.foto svg {
  width: 100%;
  height: 100%;
}
</style>
