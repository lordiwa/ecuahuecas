<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Visible label per step, in order. */
    steps: string[]
    /** 1-based current step. */
    step: number
    /** Allow jumping to a step by clicking its marker. */
    clickable?: boolean
  }>(),
  { clickable: true },
)

const emit = defineEmits<{ (e: 'update:step', n: number): void }>()

const items = computed(() =>
  props.steps.map((label, i) => {
    const n = i + 1
    return {
      n,
      label,
      state: n < props.step ? 'done' : n === props.step ? 'current' : 'todo',
    }
  }),
)

function go(n: number) {
  if (!props.clickable) return
  emit('update:step', n)
}
</script>

<template>
  <ol class="stepper" role="list">
    <li
      v-for="item in items"
      :key="item.n"
      class="stepper-item"
      :data-state="item.state"
    >
      <button
        type="button"
        class="stepper-marker"
        :disabled="!clickable"
        :aria-current="item.state === 'current' ? 'step' : undefined"
        @click="go(item.n)"
      >
        <span class="stepper-num">{{ item.state === 'done' ? '✓' : item.n }}</span>
        <span class="stepper-label">{{ item.label }}</span>
      </button>
      <span v-if="item.n < steps.length" class="stepper-bar" aria-hidden="true"></span>
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: stretch;
  gap: 0;
  list-style: none;
  margin: 0 0 28px;
  padding: 0;
}
.stepper-item {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.stepper-marker {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--crema);
  border: var(--borde);
  border-radius: var(--radio-md);
  padding: 8px 12px;
  cursor: pointer;
  font-family: var(--texto);
  color: var(--tinta);
  text-align: left;
  min-width: 0;
}
.stepper-marker:disabled { cursor: default; }
.stepper-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border: var(--borde);
  border-radius: 50%;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 13px;
  background: var(--papel);
}
.stepper-label {
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stepper-bar {
  flex: 1;
  height: 2.5px;
  background: var(--linea);
  opacity: 0.35;
  margin: 0 6px;
}
.stepper-item[data-state="current"] .stepper-marker {
  box-shadow: var(--sombra-bloque-sm);
}
.stepper-item[data-state="current"] .stepper-num {
  background: var(--rojo);
  color: var(--crema);
}
.stepper-item[data-state="done"] .stepper-num {
  background: var(--azul);
  color: var(--crema);
}
.stepper-item[data-state="done"] + .stepper-item .stepper-bar,
.stepper-item[data-state="done"] .stepper-bar {
  opacity: 1;
}

@media (max-width: 720px) {
  .stepper {
    flex-wrap: wrap;
    gap: 8px;
  }
  .stepper-item { flex: 0 0 auto; }
  .stepper-label { display: none; }
  .stepper-bar { display: none; }
  .stepper-item[data-state="current"] .stepper-label {
    display: inline;
  }
}
</style>
