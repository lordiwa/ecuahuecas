<script setup lang="ts">
import { computed } from 'vue'
import type { Precio } from '@/types/content'

const props = defineProps<{ value: Precio }>()

const dots = computed(() => props.value.length)
</script>

<template>
  <span class="precio-dots" :aria-label="`Precio nivel ${dots}`">
    <span
      v-for="i in 3"
      :key="i"
      class="dot"
      :class="{ 'dot--on': i <= dots }"
    />
  </span>
</template>

<style scoped>
.precio-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--linea);
  background: transparent;
}
.dot--on {
  background: var(--verde);
}
</style>
