<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ResenaWizard from '@/components/ResenaWizard.vue'
import { createEmptyDraft, type ResenaDraft } from '@/lib/drafts'

// Build the empty draft on mount so the temporary id (Date.now/Math.random) is
// generated client-side, never during SSG module evaluation.
const draft = ref<ResenaDraft | null>(null)

onMounted(() => {
  draft.value = createEmptyDraft()
})
</script>

<template>
  <div class="container section">
    <p class="eyebrow">Admin · Reseñas</p>
    <h1 class="h-display">Nueva reseña</h1>
    <ResenaWizard v-if="draft" :key="draft.id" :initial="draft" />
  </div>
</template>
