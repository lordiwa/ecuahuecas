<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import Stepper from '@/components/Stepper.vue'
import Estrellas from '@/components/Estrellas.vue'
import UbicacionPicker from '@/components/UbicacionPicker.vue'
import PhotoUploader, { type Photo } from '@/components/PhotoUploader.vue'
import { huecas, criticos } from '@/lib/content'
import { Ciudad } from '@/types/content'
import {
  saveDraft,
  deleteDraft,
  type ResenaDraft,
  type DraftPhotoInMemory,
} from '@/lib/drafts'
import {
  generateResenaDraft,
  publishResena,
  buildPublishPhotos,
  photosToPublishInputs,
} from '@/lib/publish'
import { useAuth } from '@/composables/useAuth'
import { useRole } from '@/composables/useRole'

// Role-gating: "Publicar" requires crítico/admin; "Guardar borrador" only needs
// authentication. The /admin guard normally prevents unauthenticated access, so
// the unauthenticated UI here is just a graceful fallback for transient states.
const { isAuthenticated } = useAuth()
const { isCritico } = useRole()

// Keep TipTap (and its bundle) out of the main chunk: only loaded under /admin.
const RichTextEditor = defineAsyncComponent(() => import('@/components/RichTextEditor.vue'))

const props = defineProps<{
  /** Seed wizard state. The id is the draft's localStorage id. */
  initial: ResenaDraft
}>()

const router = useRouter()

const STEPS = ['Hueca', 'Rating', 'Reseña', 'Fotos']
const CIUDADES = Ciudad.options

// Local, mutable copy of the incoming draft.
const id = props.initial.id
const step = ref(props.initial.step >= 1 && props.initial.step <= 4 ? props.initial.step : 1)
const huecaMode = ref<'existente' | 'nueva'>(props.initial.huecaMode)
const huecaId = ref<string | null>(props.initial.huecaId)
const nuevaHueca = reactive({ ...props.initial.nuevaHueca })
const rating = ref(props.initial.rating)
const titulo = ref(props.initial.titulo)
const tagline = ref(props.initial.tagline)
const body = ref(props.initial.body)
const veredicto = ref(props.initial.veredicto)
// PhotoUploader works with Photo[] (which require a blob). Seeded draft photos
// reloaded from localStorage have no live blob — their `blob:` URLs are dead and
// would render as broken thumbnails. Drop those on seed; remember whether the
// draft *originally* had photos so the "re-upload" banner still fires.
const hadPersistedPhotos = props.initial.photos.length > 0
function isLivePhoto(p: DraftPhotoInMemory): boolean {
  // Keep only photos whose blob is live (or whose URL isn't a dead blob ref).
  return p.blob != null || !p.url.startsWith('blob:')
}
const photos = ref<DraftPhotoInMemory[]>(props.initial.photos.filter(isLivePhoto))
const heroId = ref<string | null>(props.initial.heroId)

const savedAt = ref<string | null>(null)

// Optional crítico selector — only shown when the snapshot carries críticos.
// When unset the Cloud Function defaults to the first active crítico.
const criticoSlug = ref<string>('')
const hasCriticos = computed(() => criticos.length > 0)

// AI draft generation (step 3) in-flight + error state.
const generating = ref(false)
const generateError = ref<string | null>(null)

// Publish in-flight / result / error state.
const publishing = ref(false)
const publishError = ref<string | null>(null)
const publishedSlug = ref<string | null>(null)

const huecaActual = computed(() => huecas.find((h) => h.slug === huecaId.value) ?? null)

const huecaNombreActual = computed(() =>
  huecaMode.value === 'nueva' ? nuevaHueca.nombre : (huecaActual.value?.nombre ?? ''),
)
const ciudadActual = computed(() =>
  huecaMode.value === 'nueva' ? nuevaHueca.ciudad : (huecaActual.value?.ciudad ?? ''),
)

// Show the re-upload banner when a reopened draft originally carried photos but
// none of the current ones have a live blob (i.e. they were dropped on seed).
const showReuploadWarning = computed(
  () => hadPersistedPhotos && !photos.value.some((p) => p.blob),
)

function buildDraft(): ResenaDraft {
  return {
    id,
    updatedAt: new Date().toISOString(),
    step: step.value,
    huecaMode: huecaMode.value,
    huecaId: huecaMode.value === 'existente' ? huecaId.value : null,
    nuevaHueca: { ...nuevaHueca },
    rating: rating.value,
    titulo: titulo.value,
    tagline: tagline.value,
    body: body.value,
    veredicto: veredicto.value,
    photos: photos.value,
    heroId: heroId.value,
  }
}

function onGuardar() {
  const draft = buildDraft()
  saveDraft(draft)
  savedAt.value = new Date().toLocaleTimeString()
}

async function onGenerar() {
  if (generating.value) return
  if (!huecaNombreActual.value) {
    generateError.value = 'Elige o nombra la hueca antes de generar.'
    return
  }
  // Don't clobber existing prose without an explicit confirm.
  if (body.value.trim().length > 0) {
    const ok = window.confirm('Ya escribiste algo en el cuerpo. ¿Reemplazarlo con la versión de la IA?')
    if (!ok) return
  }
  generating.value = true
  generateError.value = null
  try {
    const out = await generateResenaDraft({
      huecaNombre: huecaNombreActual.value,
      ciudad: String(ciudadActual.value || ''),
      rating: rating.value,
      notas: veredicto.value,
      tagline: tagline.value,
    })
    titulo.value = out.titulo || titulo.value
    body.value = out.bodyMarkdown || body.value
    if (out.extracto) tagline.value = out.extracto
  } catch (err) {
    generateError.value = err instanceof Error ? err.message : 'No se pudo generar la reseña.'
  } finally {
    generating.value = false
  }
}

async function onPublicar() {
  if (publishing.value) return
  publishing.value = true
  publishError.value = null
  publishedSlug.value = null
  try {
    const photoInputs = await photosToPublishInputs(photos.value)
    const payloadPhotos = buildPublishPhotos(photoInputs, heroId.value)
    const result = await publishResena({
      huecaMode: huecaMode.value,
      huecaId: huecaMode.value === 'existente' ? huecaId.value : null,
      nombre: nuevaHueca.nombre,
      ciudad: nuevaHueca.ciudad,
      descripcion: nuevaHueca.descripcion,
      coords: nuevaHueca.coords,
      rating: rating.value,
      titulo: titulo.value,
      tagline: tagline.value,
      body: body.value,
      veredicto: veredicto.value,
      heroId: heroId.value,
      photos: payloadPhotos,
      criticoSlug: criticoSlug.value || undefined,
    })
    // Success: drop the local draft and surface a link to the published reseña.
    deleteDraft(id)
    publishedSlug.value = result.slug
  } catch (err) {
    publishError.value = err instanceof Error ? err.message : 'No se pudo publicar la reseña.'
  } finally {
    publishing.value = false
  }
}

function verResena() {
  if (!publishedSlug.value) return
  router.push({ name: 'resena', params: { slug: publishedSlug.value } })
}

function next() {
  if (step.value < STEPS.length) step.value += 1
}
function prev() {
  if (step.value > 1) step.value -= 1
}

function setRating(n: number) {
  rating.value = n
}

// PhotoUploader emits Photo[] (with blob); store as-is in memory.
function onPhotos(updated: Photo[]) {
  photos.value = updated
}

// Revoke any blob URLs we own when leaving, to avoid leaks.
onBeforeUnmount(() => {
  for (const p of photos.value) {
    if (p.blob && p.url.startsWith('blob:')) URL.revokeObjectURL(p.url)
  }
})

// Reset the "saved" indicator whenever the user edits something.
watch([titulo, tagline, body, veredicto, rating, huecaId, huecaMode], () => {
  savedAt.value = null
})

function backToList() {
  router.push({ name: 'admin-resenas' })
}
</script>

<template>
  <div class="wizard">
    <Stepper :steps="STEPS" v-model:step="step" />

    <!-- Step 1: Hueca -->
    <section v-show="step === 1" class="wizard-step">
      <h2 class="wizard-h">1 · ¿Qué hueca reseñas?</h2>

      <div class="mode-switch">
        <label class="radio">
          <input type="radio" value="existente" v-model="huecaMode" />
          <span>Hueca existente</span>
        </label>
        <label class="radio">
          <input type="radio" value="nueva" v-model="huecaMode" />
          <span>Crear nueva hueca</span>
        </label>
      </div>

      <div v-if="huecaMode === 'existente'" class="field">
        <label class="field-label" for="hueca-select">Hueca</label>
        <select id="hueca-select" v-model="huecaId" class="input">
          <option :value="null" disabled>Elige una hueca…</option>
          <option v-for="h in huecas" :key="h.slug" :value="h.slug">
            {{ h.nombre }} — {{ h.ciudad }}
          </option>
        </select>
        <p v-if="huecaActual" class="hint">
          {{ huecaActual.barrio }} · {{ huecaActual.plato_estrella }}
        </p>
      </div>

      <div v-else class="nueva-hueca card">
        <h3 class="sub-h">Nueva hueca</h3>
        <div class="field">
          <label class="field-label" for="nh-nombre">Nombre</label>
          <input id="nh-nombre" v-model="nuevaHueca.nombre" class="input" type="text" placeholder="Ej: Encebollados Don Pepe" />
        </div>
        <div class="field">
          <label class="field-label" for="nh-ciudad">Ciudad</label>
          <select id="nh-ciudad" v-model="nuevaHueca.ciudad" class="input">
            <option v-for="c in CIUDADES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="nh-desc">Descripción</label>
          <textarea id="nh-desc" v-model="nuevaHueca.descripcion" class="input" rows="3" placeholder="Una línea sobre el lugar…"></textarea>
        </div>
        <div class="field">
          <label class="field-label">Ubicación</label>
          <UbicacionPicker v-model="nuevaHueca.coords" height="360px" />
        </div>
      </div>
    </section>

    <!-- Step 2: Rating -->
    <section v-show="step === 2" class="wizard-step">
      <h2 class="wizard-h">2 · Tu veredicto en estrellas</h2>
      <div class="rating-row">
        <Estrellas :value="rating" :size="40" :on-change="setRating" />
        <span class="rating-num">{{ rating || '–' }} / 5</span>
      </div>
      <p class="hint">Toca una estrella para fijar la calificación.</p>
    </section>

    <!-- Step 3: Body -->
    <section v-show="step === 3" class="wizard-step">
      <h2 class="wizard-h">3 · La reseña</h2>

      <div v-if="isCritico" class="ai-row">
        <button type="button" class="btn btn--azul" :disabled="generating" @click="onGenerar">
          {{ generating ? 'Generando…' : '✨ Generar con IA' }}
        </button>
        <span class="hint">Usa tus notas del veredicto y la calificación.</span>
      </div>
      <p v-if="generateError" class="warn">{{ generateError }}</p>

      <div class="field">
        <label class="field-label" for="titulo">Título</label>
        <input id="titulo" v-model="titulo" class="input" type="text" placeholder="Ej: El encebollado que silencia la cruda" />
      </div>
      <div class="field">
        <label class="field-label" for="tagline">Tagline</label>
        <input id="tagline" v-model="tagline" class="input" type="text" placeholder="Una frase gancho" />
      </div>
      <div class="field">
        <label class="field-label">Cuerpo</label>
        <RichTextEditor v-model="body" :min-height="380" placeholder="Cuenta la experiencia…" />
      </div>
      <div class="field">
        <label class="field-label" for="veredicto">Veredicto</label>
        <textarea id="veredicto" v-model="veredicto" class="input" rows="4" placeholder="El cierre: ¿vale la pena el viaje?"></textarea>
      </div>
    </section>

    <!-- Step 4: Fotos -->
    <section v-show="step === 4" class="wizard-step">
      <h2 class="wizard-h">4 · Fotos</h2>
      <p v-if="showReuploadWarning" class="warn">
        Las fotos de un borrador no se guardan tras refrescar — vuelve a subirlas antes de publicar.
      </p>
      <PhotoUploader
        :model-value="(photos as Photo[])"
        v-model:heroId="heroId"
        @update:model-value="onPhotos"
      />

      <div v-if="hasCriticos && isCritico" class="field critico-field">
        <label class="field-label" for="critico-select">Crítico (opcional)</label>
        <select id="critico-select" v-model="criticoSlug" class="input">
          <option value="">Por defecto (primer crítico activo)</option>
          <option v-for="c in criticos" :key="c.slug" :value="c.slug">{{ c.nombre }}</option>
        </select>
      </div>
    </section>

    <!-- Publish feedback -->
    <div v-if="publishedSlug" class="publish-ok">
      <span>✓ Reseña publicada.</span>
      <button type="button" class="btn btn--blanco" @click="verResena">Ver reseña →</button>
      <button type="button" class="btn btn--ghost" @click="backToList">Volver a borradores</button>
    </div>
    <p v-if="publishError" class="warn">{{ publishError }}</p>

    <!-- Nav + actions -->
    <div class="wizard-actions">
      <div class="nav-group">
        <button type="button" class="btn btn--ghost" @click="backToList">← Borradores</button>
        <button type="button" class="btn btn--blanco" :disabled="step === 1" @click="prev">Anterior</button>
        <button v-if="step < STEPS.length" type="button" class="btn btn--azul" @click="next">Siguiente</button>
      </div>
      <div class="action-group">
        <span v-if="savedAt" class="saved-note">Guardado {{ savedAt }}</span>
        <template v-if="isAuthenticated">
          <!-- Any authenticated user may save a draft. -->
          <button type="button" class="btn btn--blanco" @click="onGuardar">Guardar borrador</button>
          <!-- Publishing is reserved for críticos and admins. -->
          <button
            v-if="isCritico"
            type="button"
            class="btn btn--rojo"
            :disabled="publishing"
            @click="onPublicar"
          >
            {{ publishing ? 'Publicando…' : 'Publicar' }}
          </button>
        </template>
        <span v-else class="auth-hint">
          <RouterLink to="/login">Inicia sesión</RouterLink> para guardar o publicar.
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-step {
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  box-shadow: var(--sombra-bloque-sm);
  padding: 20px 22px;
  margin-bottom: 22px;
}
.wizard-h {
  font-family: var(--titulo);
  font-size: 1.4rem;
  margin: 0 0 16px;
}
.sub-h {
  font-family: var(--titulo);
  font-size: 1.1rem;
  margin: 0 0 12px;
}
.mode-switch {
  display: flex;
  gap: 18px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--texto);
  font-weight: 700;
  cursor: pointer;
}
.radio input { accent-color: var(--rojo); width: 16px; height: 16px; }

.field { margin-bottom: 16px; }
.field-label {
  display: block;
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  opacity: 0.8;
}
.input {
  width: 100%;
  font-family: var(--texto);
  font-size: 15px;
  padding: 10px 12px;
  border: var(--borde);
  border-radius: var(--radio-sm);
  background: var(--papel);
  color: var(--tinta);
}
.input:focus {
  outline: none;
  box-shadow: var(--sombra-bloque-sm);
}
textarea.input { resize: vertical; }
.hint {
  font-family: var(--mono);
  font-size: 12px;
  opacity: 0.7;
  margin: 4px 0 0;
}
.warn {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--rojo);
  border: var(--borde);
  border-color: var(--rojo);
  border-radius: var(--radio-sm);
  padding: 8px 10px;
  margin: 0 0 14px;
}
.nueva-hueca {
  padding: 18px;
}
.rating-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.rating-num {
  font-family: var(--display);
  font-size: 1.4rem;
}

.wizard-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.nav-group, .action-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.saved-note {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--verde-cebolla);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.auth-hint {
  font-family: var(--texto);
  font-size: 13px;
  opacity: 0.8;
}
.auth-hint a { color: var(--rojo); font-weight: 700; }

.ai-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.critico-field { margin-top: 18px; }
.publish-ok {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-family: var(--texto);
  font-weight: 700;
  color: var(--verde-cebolla);
  border: var(--borde);
  border-color: var(--verde-cebolla);
  border-radius: var(--radio-sm);
  padding: 10px 12px;
  margin-bottom: 16px;
}

@media (max-width: 720px) {
  .wizard-actions { flex-direction: column; align-items: stretch; }
  .nav-group, .action-group { justify-content: space-between; }
}
</style>
