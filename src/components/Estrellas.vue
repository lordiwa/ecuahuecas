<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    size?: number
    onChange?: (n: number) => void
  }>(),
  { size: 18 },
)

const emit = defineEmits<{ (e: 'update:value', n: number): void }>()

const isInteractive = computed(() => typeof props.onChange === 'function')

const stars = computed(() =>
  [1, 2, 3, 4, 5].map((i) => {
    const fillFraction = Math.max(0, Math.min(1, props.value - (i - 1)))
    return { i, fillFraction }
  }),
)

function handleClick(n: number) {
  if (props.onChange) props.onChange(n)
  emit('update:value', n)
}
</script>

<template>
  <div class="estrellas" :data-interactive="isInteractive">
    <button
      v-for="s in stars"
      :key="s.i"
      type="button"
      class="estrella"
      :tabindex="isInteractive ? 0 : -1"
      :aria-label="`${s.i} estrellas`"
      :disabled="!isInteractive"
      @click="handleClick(s.i)"
    >
      <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient :id="`grad-${s.i}-${s.fillFraction}`" x1="0" x2="1" y1="0" y2="0">
            <stop :offset="s.fillFraction" stop-color="var(--rojo)" />
            <stop :offset="s.fillFraction" stop-color="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.5l2.9 6.4 7.1.7-5.4 4.7 1.7 7-6.3-3.7-6.3 3.7 1.7-7L1.9 9.6l7.1-.7z"
          :fill="`url(#grad-${s.i}-${s.fillFraction})`"
          stroke="var(--linea)"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.estrellas {
  display: inline-flex;
  gap: 2px;
}
.estrella {
  background: none;
  border: none;
  padding: 0;
  cursor: default;
  line-height: 0;
}
.estrellas[data-interactive="true"] .estrella {
  cursor: pointer;
}
.estrella:disabled { cursor: default; }
</style>
