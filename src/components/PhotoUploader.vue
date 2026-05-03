<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { compressImage, formatBytes, type CompressedImage } from '@/lib/image'

export interface Photo {
  id: string
  name: string
  url: string
  sha256: string
  width: number
  height: number
  originalSize: number
  compressedSize: number
  mime: string
  blob: Blob
}

const props = withDefaults(
  defineProps<{
    modelValue: Photo[]
    heroId?: string | null
    maxPhotos?: number
    maxBytes?: number
    maxDimension?: number
  }>(),
  {
    heroId: null,
    maxPhotos: 8,
    maxBytes: 2 * 1024 * 1024,
    maxDimension: 1920,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', photos: Photo[]): void
  (e: 'update:heroId', id: string | null): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const error = ref<string | null>(null)
const dragOriginIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const remaining = computed(() => Math.max(0, props.maxPhotos - props.modelValue.length))

const totalBytes = computed(() =>
  props.modelValue.reduce((acc, p) => acc + p.compressedSize, 0),
)

function pick() {
  fileInput.value?.click()
}

async function onFiles(input: FileList | File[] | null) {
  if (!input || input.length === 0) return
  const files = Array.from(input).filter((f) => f.type.startsWith('image/'))
  if (files.length === 0) {
    error.value = 'Solo se aceptan imágenes (JPEG, PNG, WebP, HEIC)'
    return
  }
  const slots = remaining.value
  const accepted = files.slice(0, slots)
  if (files.length > slots) {
    error.value = `Solo cabían ${slots} foto(s) más. Las extras se descartaron.`
  } else {
    error.value = null
  }

  isProcessing.value = true
  try {
    const next: Photo[] = [...props.modelValue]
    for (const file of accepted) {
      try {
        const compressed = await compressImage(file, {
          maxDimension: props.maxDimension,
          targetMaxBytes: props.maxBytes,
        })
        if (next.some((p) => p.sha256 === compressed.sha256)) {
          URL.revokeObjectURL(compressed.url)
          continue
        }
        next.push(toPhoto(file, compressed))
      } catch (err) {
        console.error('[PhotoUploader] compresión falló:', err)
        error.value = `No se pudo procesar ${file.name}`
      }
    }
    emit('update:modelValue', next)
    if (!props.heroId && next.length > 0) {
      emit('update:heroId', next[0].id)
    }
  } finally {
    isProcessing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function toPhoto(file: File, c: CompressedImage): Photo {
  return {
    id: c.sha256.slice(0, 12),
    name: file.name,
    url: c.url,
    sha256: c.sha256,
    width: c.width,
    height: c.height,
    originalSize: c.originalSize,
    compressedSize: c.compressedSize,
    mime: c.mime,
    blob: c.blob,
  }
}

function removeAt(index: number) {
  const photo = props.modelValue[index]
  if (!photo) return
  URL.revokeObjectURL(photo.url)
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
  if (props.heroId === photo.id) {
    emit('update:heroId', next[0]?.id ?? null)
  }
}

function setHero(id: string) {
  emit('update:heroId', id)
}

function onDragEnter(event: DragEvent) {
  if (event.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
  }
}
function onDragLeave(event: DragEvent) {
  if ((event.relatedTarget as Node | null) && (event.currentTarget as Node).contains(event.relatedTarget as Node)) return
  isDragging.value = false
}
function onDrop(event: DragEvent) {
  isDragging.value = false
  const dt = event.dataTransfer
  if (!dt || !dt.files || dt.files.length === 0) return
  void onFiles(dt.files)
}

function onItemDragStart(index: number, event: DragEvent) {
  dragOriginIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}
function onItemDragOver(index: number, event: DragEvent) {
  if (dragOriginIndex.value === null) return
  event.preventDefault()
  dragOverIndex.value = index
}
function onItemDrop(index: number) {
  const from = dragOriginIndex.value
  dragOriginIndex.value = null
  dragOverIndex.value = null
  if (from === null || from === index) return
  const next = [...props.modelValue]
  const [moved] = next.splice(from, 1)
  next.splice(index, 0, moved)
  emit('update:modelValue', next)
}
function onItemDragEnd() {
  dragOriginIndex.value = null
  dragOverIndex.value = null
}

onBeforeUnmount(() => {
  for (const photo of props.modelValue) {
    URL.revokeObjectURL(photo.url)
  }
})
</script>

<template>
  <div class="uploader">
    <div
      class="drop"
      :class="{ 'is-dragging': isDragging, 'is-busy': isProcessing }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      @click="pick"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="onFiles(($event.target as HTMLInputElement).files)"
      />
      <div class="drop-content">
        <div class="drop-icon">📷</div>
        <p class="drop-title">
          {{ isProcessing ? 'Procesando…' : 'Arrastra fotos aquí o haz clic' }}
        </p>
        <p class="drop-meta">
          Hasta {{ maxPhotos }} fotos · max {{ formatBytes(maxBytes) }} cada una · resize a {{ maxDimension }}px
        </p>
        <p class="drop-meta">
          {{ modelValue.length }}/{{ maxPhotos }} fotos · {{ formatBytes(totalBytes) }} totales
        </p>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <ul v-if="modelValue.length > 0" class="thumbs">
      <li
        v-for="(photo, idx) in modelValue"
        :key="photo.id"
        class="thumb"
        :class="{
          'is-hero': photo.id === heroId,
          'is-drag-target': dragOverIndex === idx,
        }"
        draggable="true"
        @dragstart="onItemDragStart(idx, $event)"
        @dragover="onItemDragOver(idx, $event)"
        @drop.prevent="onItemDrop(idx)"
        @dragend="onItemDragEnd"
      >
        <img :src="photo.url" :alt="photo.name" :width="photo.width" :height="photo.height" loading="lazy" />
        <div class="thumb-actions">
          <button
            type="button"
            class="thumb-btn hero-btn"
            :aria-pressed="photo.id === heroId"
            :title="photo.id === heroId ? 'Foto principal' : 'Marcar como principal'"
            @click="setHero(photo.id)"
          >
            ★
          </button>
          <button
            type="button"
            class="thumb-btn delete-btn"
            title="Borrar"
            @click="removeAt(idx)"
          >
            ×
          </button>
        </div>
        <div class="thumb-meta">
          <span class="thumb-size">{{ photo.width }}×{{ photo.height }}</span>
          <span class="thumb-bytes">{{ formatBytes(photo.compressedSize) }}</span>
        </div>
        <span v-if="photo.id === heroId" class="hero-badge">Hero</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drop {
  border: 3px dashed var(--linea);
  border-radius: var(--radio-md);
  background: var(--crema);
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: background 80ms ease, transform 80ms ease;
  user-select: none;
}
.drop:hover { background: var(--amarillo-suave); }
.drop.is-dragging {
  background: var(--amarillo);
  transform: scale(1.01);
  border-style: solid;
  box-shadow: var(--sombra-bloque);
}
.drop.is-busy { cursor: progress; opacity: 0.7; }

.drop-icon { font-size: 32px; line-height: 1; }
.drop-title {
  font-family: var(--display);
  font-size: 18px;
  letter-spacing: 0.5px;
  margin-top: 8px;
}
.drop-meta {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.7;
  margin-top: 4px;
}

.error {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: var(--rojo);
  color: var(--crema);
  padding: 8px 12px;
  border: 2px solid var(--linea);
  border-radius: var(--radio-sm);
}

.thumbs {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding: 0;
  margin: 0;
}

.thumb {
  position: relative;
  border: var(--borde);
  border-radius: var(--radio-sm);
  overflow: hidden;
  background: var(--crema);
  aspect-ratio: 1 / 1;
  box-shadow: var(--sombra-bloque-sm);
  cursor: grab;
}
.thumb:active { cursor: grabbing; }
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb.is-hero {
  outline: 3px solid var(--amarillo);
  outline-offset: -3px;
}
.thumb.is-drag-target {
  border-color: var(--rojo);
  transform: translate(-2px, -2px);
  box-shadow: var(--sombra-bloque);
}

.thumb-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
}
.thumb-btn {
  width: 28px;
  height: 28px;
  border: 2px solid var(--linea);
  border-radius: var(--radio-sm);
  background: var(--crema);
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.thumb-btn:hover { background: var(--amarillo); }
.hero-btn[aria-pressed="true"] {
  background: var(--amarillo);
  color: var(--tinta);
}
.delete-btn:hover { background: var(--rojo); color: var(--crema); }

.thumb-meta {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 10px;
  background: rgba(26, 26, 26, 0.78);
  color: var(--crema);
  letter-spacing: 0.5px;
}

.hero-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: var(--amarillo);
  color: var(--tinta);
  padding: 3px 6px;
  border: 2px solid var(--linea);
  border-radius: 999px;
}
</style>
