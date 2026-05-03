<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{ source: string }>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: true,
})

const rendered = computed(() => md.render(props.source ?? ''))
</script>

<template>
  <div class="md-preview" v-html="rendered" />
</template>

<style scoped>
.md-preview {
  font-family: var(--titulo);
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--tinta);
}

.md-preview :deep(h1),
.md-preview :deep(h2) {
  font-family: var(--display);
  font-size: 1.6rem;
  margin: 1rem 0 0.5rem;
}
.md-preview :deep(h3) {
  font-family: var(--titulo);
  font-weight: 800;
  font-size: 1.25rem;
  margin: 0.9rem 0 0.4rem;
}
.md-preview :deep(p) { margin: 0.5rem 0; }
.md-preview :deep(ul),
.md-preview :deep(ol) {
  padding-left: 1.4rem;
  margin: 0.5rem 0;
}
.md-preview :deep(li) { margin: 0.2rem 0; }
.md-preview :deep(blockquote) {
  border-left: 4px solid var(--rojo);
  padding: 0.2rem 0 0.2rem 1rem;
  margin: 0.8rem 0;
  font-style: italic;
  opacity: 0.85;
}
.md-preview :deep(a) {
  color: var(--rojo);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.md-preview :deep(hr) {
  border: none;
  border-top: 2.5px solid var(--linea);
  margin: 1.2rem 0;
}
.md-preview :deep(strong) { font-weight: 800; }
.md-preview :deep(em) { font-style: italic; }
.md-preview :deep(code) {
  font-family: var(--mono);
  font-size: 0.9em;
  background: var(--amarillo-suave);
  padding: 1px 5px;
  border-radius: 3px;
}
</style>
