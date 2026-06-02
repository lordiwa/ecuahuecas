<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listDrafts, deleteDraft, type ResenaDraftSummary } from '@/lib/drafts'
import { getHueca } from '@/lib/content'
import Estrellas from '@/components/Estrellas.vue'
import { useRole } from '@/composables/useRole'
import { requestCriticoRole, bootstrapAdmin } from '@/lib/adminUsers'
import { authErrorMessage } from '@/composables/authErrors'

const router = useRouter()
const drafts = ref<ResenaDraftSummary[]>([])

// Role-gating UI (TASK-024): a signed-in user WITHOUT the crítico role still
// reaches this page (the guard only requires auth, not crítico). Show a clear
// activation card so the very first admin and new críticos never need the
// browser console. This must work in PRODUCTION — no import.meta.env.DEV gate.
const { isCritico, refreshClaims } = useRole()

const adminBusy = ref(false)
const adminError = ref<string | null>(null)

const criticoBusy = ref(false)
const criticoError = ref<string | null>(null)
// 'idle' | 'sent' (request stored) | 'already' (was already crítico/admin)
const criticoState = ref<'idle' | 'sent' | 'already'>('idle')

function refresh() {
  drafts.value = listDrafts()
}

async function activarAdmin() {
  adminBusy.value = true
  adminError.value = null
  try {
    await bootstrapAdmin()
    // Refresh claims so isCritico flips and the publish UI appears immediately.
    await refreshClaims()
  } catch (err) {
    adminError.value = authErrorMessage(err)
  } finally {
    adminBusy.value = false
  }
}

async function solicitarCritico() {
  criticoBusy.value = true
  criticoError.value = null
  try {
    const res = await requestCriticoRole()
    criticoState.value = res.already ? 'already' : 'sent'
  } catch (err) {
    criticoError.value = authErrorMessage(err)
  } finally {
    criticoBusy.value = false
  }
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

    <!-- Role-gating card: shown to signed-in users who can't publish yet. -->
    <section v-if="!isCritico" class="card gate">
      <h2 class="gate-title">Aún no puedes publicar</h2>
      <p class="cuerpo-editorial gate-sub">
        Solo los críticos pueden publicar reseñas. Si eres el dueño del sitio,
        activa tu cuenta de administrador. Si quieres colaborar, solicita el
        acceso de crítico y un administrador lo revisará.
      </p>

      <div class="gate-actions">
        <div class="gate-block">
          <button
            type="button"
            class="btn btn--rojo"
            :disabled="adminBusy"
            @click="activarAdmin"
          >
            {{ adminBusy ? 'Activando…' : 'Soy el administrador — activar mi cuenta' }}
          </button>
          <p v-if="adminError" class="msg msg--error" role="alert">{{ adminError }}</p>
        </div>

        <div class="gate-block">
          <button
            type="button"
            class="btn btn--azul"
            :disabled="criticoBusy || criticoState !== 'idle'"
            @click="solicitarCritico"
          >
            {{ criticoBusy ? 'Enviando…' : 'Solicitar acceso de crítico' }}
          </button>
          <p v-if="criticoState === 'sent'" class="msg gate-ok" role="status">
            Solicitud enviada, un administrador la revisará.
          </p>
          <p v-else-if="criticoState === 'already'" class="msg gate-ok" role="status">
            Ya tienes acceso de crítico. Refresca la página si no ves el botón de publicar.
          </p>
          <p v-if="criticoError" class="msg msg--error" role="alert">{{ criticoError }}</p>
        </div>
      </div>
    </section>

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
.gate {
  padding: 24px;
  margin-bottom: 24px;
}
.gate-title {
  font-family: var(--titulo);
  font-size: 1.4rem;
  margin: 0 0 8px;
}
.gate-sub {
  margin: 0 0 18px;
  max-width: 60ch;
  opacity: 0.85;
}
.gate-actions {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
.gate-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 240px;
}
.msg {
  font-family: var(--texto);
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  padding: 12px 14px;
  margin: 0;
}
.msg--error {
  color: var(--crema);
  background: var(--rojo);
  font-weight: 700;
  box-shadow: var(--sombra-bloque-sm);
}
.gate-ok {
  background: var(--amarillo);
  font-weight: 700;
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
