<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ResenaWizard from '@/components/ResenaWizard.vue'
import { loadDraft, type ResenaDraft } from '@/lib/drafts'

const route = useRoute()
const draft = ref<ResenaDraft | null>(null)
const notFound = ref(false)

onMounted(() => {
  const id = String(route.params.id ?? '')
  const found = loadDraft(id)
  if (found) draft.value = found
  else notFound.value = true
})
</script>

<template>
  <div class="container section">
    <p class="eyebrow">Admin · Reseñas</p>
    <h1 class="h-display">Editar reseña</h1>

    <p v-if="notFound" class="empty">
      No se encontró ese borrador.
      <RouterLink :to="{ name: 'admin-resenas' }">Volver a borradores</RouterLink>.
    </p>

    <ResenaWizard v-if="draft" :key="draft.id" :initial="draft" />
  </div>
</template>

<style scoped>
.empty {
  font-family: var(--texto);
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  padding: 24px;
}
</style>
