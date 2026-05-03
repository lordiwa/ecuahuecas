<script setup lang="ts">
import { ref } from 'vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'

const SEED = `## Una noche en el mercado

El **encebollado** estaba *humeante*, con cebolla bien colocha y limón fresco. La señora me sirvió con cariño y el [chifle crocante](https://ejemplo.ec/chifle) hacía la diferencia.

> Pilas con la cantidad: una tarrina alcanza para dos manes con hambre normal.

### Lo que me gustó
- El caldo bien concentrado
- Atún fresco, no enlatado
- La salsa de ají de la casa

### Lo que no
1. La silla cojeaba un poco
2. Faltaba canguil tostado

---

Veredicto: **vale la pena el viaje**. 4 estrellas seguras.`

const body = ref(SEED)
const showPreview = ref(true)

function reset() {
  body.value = SEED
}
function clear() {
  body.value = ''
}
</script>

<template>
  <div class="container section">
    <p class="eyebrow">Sub-fase A.1 · TipTap WYSIWYG</p>
    <h1 class="h-display">Editor playground</h1>
    <p class="lead">
      Página de prueba aislada para validar el editor antes de integrarlo en el wizard.
      No es ruta pública del sitio. El output es markdown crudo (lo que se guardará en Firestore en A.7).
    </p>

    <div class="dev-toolbar">
      <button class="btn btn--blanco" @click="reset">Restaurar seed</button>
      <button class="btn btn--ghost" @click="clear">Vaciar</button>
      <label class="toggle">
        <input v-model="showPreview" type="checkbox" />
        <span>Mostrar preview lado a lado</span>
      </label>
    </div>

    <div class="dev-grid" :data-split="showPreview">
      <section class="dev-panel">
        <header class="dev-panel-header">
          <span class="chip chip--rojo">Editor</span>
          <span class="meta">{{ body.length }} caracteres · markdown crudo</span>
        </header>
        <RichTextEditor v-model="body" :min-height="380" />
      </section>

      <section v-if="showPreview" class="dev-panel">
        <header class="dev-panel-header">
          <span class="chip chip--azul">Preview</span>
          <span class="meta">renderizado con markdown-it</span>
        </header>
        <article class="dev-preview-card">
          <MarkdownPreview :source="body" />
        </article>
      </section>
    </div>

    <details class="dev-raw">
      <summary>Ver markdown crudo</summary>
      <pre>{{ body }}</pre>
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

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  margin-left: auto;
}
.toggle input { accent-color: var(--rojo); width: 16px; height: 16px; }

.dev-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}
.dev-grid[data-split="true"] {
  grid-template-columns: 1fr;
}
@media (min-width: 1000px) {
  .dev-grid[data-split="true"] {
    grid-template-columns: 1fr 1fr;
  }
}

.dev-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.dev-panel-header .meta {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.7;
}

.dev-preview-card {
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  box-shadow: var(--sombra-bloque-sm);
  padding: 18px 20px;
  min-height: 380px;
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
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
