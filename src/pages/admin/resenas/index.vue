<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listDrafts, deleteDraft, type ResenaDraftSummary } from '@/lib/drafts'
import { getHueca } from '@/lib/content'
import Estrellas from '@/components/Estrellas.vue'

const router = useRouter()
const drafts = ref<ResenaDraftSummary[]>([])

function refresh() {
  drafts.value = listDrafts()
}

onMounted(refresh)

function huecaLabel(d: ResenaDraftSummary): string {
  if (!d.huecaNombre) return 'Sin hueca'
  // For existing huecas huecaNombre holds the slug; resolve to a display name.
  const h = d.huecaId ? getHueca(d.huecaId) : undefined
  return h ? h.nombre : d.huecaNombre
}

function fecha(iso: string): string {
  const dt = new Date(iso)
  return Number.isNaN(dt.getTime()) ? iso : dt.toLocaleString()
}

function continuar(id: string) {
  router.push({ name: 'admin-resena-editar', params: { id } })
}

function descartar(d: ResenaDraftSummary) {
  const titulo = d.titulo || 'este borrador'
  if (!window.confirm(`¿Descartar "${titulo}"? Esta acción no se puede deshacer.`)) return
  deleteDraft(d.id)
  refresh()
}
</script>

<template>
  <div class="container section">
    <div class="head-row">
      <div>
        <p class="eyebrow">Admin · Reseñas</p>
        <h1 class="h-display">Borradores</h1>
      </div>
      <RouterLink class="btn btn--rojo" :to="{ name: 'admin-resena-nueva' }">+ Nueva reseña</RouterLink>
    </div>

    <p v-if="drafts.length === 0" class="empty">
      No hay borradores guardados todavía. Empieza una reseña y pulsa
      <strong>“Guardar borrador”</strong>.
    </p>

    <ul v-else class="draft-list">
      <li v-for="d in drafts" :key="d.id" class="draft card">
        <div class="draft-main">
          <h2 class="draft-title">{{ d.titulo || 'Borrador sin título' }}</h2>
          <p class="draft-meta">
            <span class="chip chip--azul">{{ huecaLabel(d) }}</span>
            <Estrellas :value="d.rating" :size="16" />
            <span class="meta-text">{{ d.photoCount }} foto(s) · {{ fecha(d.updatedAt) }}</span>
          </p>
        </div>
        <div class="draft-actions">
          <button type="button" class="btn btn--blanco" @click="continuar(d.id)">Continuar editando</button>
          <button type="button" class="btn btn--ghost" @click="descartar(d)">Descartar</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.empty {
  font-family: var(--texto);
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  padding: 24px;
}
.draft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}
.draft {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 18px;
}
.draft-title {
  font-family: var(--titulo);
  font-size: 1.25rem;
  margin: 0 0 8px;
}
.draft-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0;
}
.meta-text {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.7;
}
.draft-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .draft { flex-direction: column; align-items: stretch; }
  .draft-actions { justify-content: space-between; }
}
</style>
