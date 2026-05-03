<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import PhotoUploader, { type Photo } from '@/components/PhotoUploader.vue'
import { formatBytes } from '@/lib/image'

const photos = ref<Photo[]>([])
const heroId = ref<string | null>(null)

const totalOriginal = computed(() => photos.value.reduce((a, p) => a + p.originalSize, 0))
const totalCompressed = computed(() => photos.value.reduce((a, p) => a + p.compressedSize, 0))
const ratio = computed(() => {
  if (totalOriginal.value === 0) return 0
  return Math.round((1 - totalCompressed.value / totalOriginal.value) * 100)
})

function clear() {
  for (const p of photos.value) URL.revokeObjectURL(p.url)
  photos.value = []
  heroId.value = null
}

onBeforeUnmount(clear)
</script>

<template>
  <div class="container section">
    <p class="eyebrow">Sub-fase A.2 · PhotoUploader</p>
    <h1 class="h-display">Uploader playground</h1>
    <p class="lead">
      Arrastra varias fotos (o tóca para abrir el selector). Se comprimen client-side a WebP,
      max 1920px lado largo, target ≤2MB. Reordena arrastrándolas, marca el hero con la estrella,
      borra con la ×. Las URLs son blob URLs en memoria — refresh las pierde (esperado en draft mode hasta A.7).
    </p>

    <div class="dev-toolbar">
      <button class="btn btn--blanco" :disabled="photos.length === 0" @click="clear">Vaciar</button>
      <span class="meta">
        {{ photos.length }} fotos ·
        <strong>{{ formatBytes(totalCompressed) }}</strong> comprimidas
        <template v-if="totalOriginal > 0">
          (de {{ formatBytes(totalOriginal) }} originales · {{ ratio }}% ahorro)
        </template>
      </span>
    </div>

    <PhotoUploader v-model="photos" v-model:heroId="heroId" />

    <details v-if="photos.length > 0" class="dev-raw">
      <summary>Ver metadata por foto</summary>
      <pre>{{ photos.map(({ blob: _b, url: _u, ...rest }) => ({ ...rest, isHero: rest.id === heroId })) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.lead {
  max-width: 720px;
  font-family: var(--texto);
  font-size: 1rem;
  margin: 8px 0 24px;
  opacity: 0.85;
}

.dev-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--amarillo-suave);
  margin-bottom: 20px;
}
.dev-toolbar .meta {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.85;
}
.dev-toolbar .meta strong {
  color: var(--rojo);
  font-weight: 700;
}

.dev-raw {
  margin-top: 32px;
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  padding: 12px 16px;
}
.dev-raw summary {
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
}
.dev-raw pre {
  margin-top: 12px;
  padding: 12px;
  background: var(--amarillo-suave);
  border-radius: var(--radio-sm);
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
