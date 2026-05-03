<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent, type Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minHeight?: number
  }>(),
  {
    placeholder: 'Empieza a escribir tu reseña…',
    minHeight: 240,
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      codeBlock: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Placeholder.configure({ placeholder: props.placeholder }),
    Markdown.configure({
      html: false,
      tightLists: true,
      bulletListMarker: '-',
      linkify: true,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ],
  onUpdate({ editor }) {
    const md = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown()
    emit('update:modelValue', md)
  },
})

watch(
  () => props.modelValue,
  (next) => {
    const ed = editor.value
    if (!ed) return
    const current = (ed.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown()
    if (next !== current) {
      ed.commands.setContent(next, { emitUpdate: false })
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function isActive(name: string, attrs?: Record<string, unknown>): boolean {
  return editor.value?.isActive(name, attrs) ?? false
}

function run<T extends (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>>(fn: T): void {
  const ed = editor.value
  if (!ed) return
  fn(ed.chain().focus()).run()
}

function setLink(): void {
  const ed = editor.value
  if (!ed) return
  const previous = ed.getAttributes('link').href as string | undefined
  const url = window.prompt('URL del link (vacío para quitar):', previous ?? '')
  if (url === null) return
  if (url === '') {
    ed.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}
</script>

<template>
  <div class="rt-editor">
    <div class="rt-toolbar" role="toolbar" aria-label="Formato de texto">
      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('bold') }"
        :aria-pressed="isActive('bold')"
        title="Negrita (Ctrl+B)"
        @click="run((c) => c.toggleBold())"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('italic') }"
        :aria-pressed="isActive('italic')"
        title="Cursiva (Ctrl+I)"
        @click="run((c) => c.toggleItalic())"
      >
        <em>I</em>
      </button>

      <span class="rt-sep" aria-hidden="true"></span>

      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('heading', { level: 2 }) }"
        :aria-pressed="isActive('heading', { level: 2 })"
        title="Subtítulo grande"
        @click="run((c) => c.toggleHeading({ level: 2 }))"
      >
        H2
      </button>
      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('heading', { level: 3 }) }"
        :aria-pressed="isActive('heading', { level: 3 })"
        title="Subtítulo chico"
        @click="run((c) => c.toggleHeading({ level: 3 }))"
      >
        H3
      </button>

      <span class="rt-sep" aria-hidden="true"></span>

      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('bulletList') }"
        :aria-pressed="isActive('bulletList')"
        title="Lista con viñetas"
        @click="run((c) => c.toggleBulletList())"
      >
        •
      </button>
      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('orderedList') }"
        :aria-pressed="isActive('orderedList')"
        title="Lista numerada"
        @click="run((c) => c.toggleOrderedList())"
      >
        1.
      </button>

      <span class="rt-sep" aria-hidden="true"></span>

      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('blockquote') }"
        :aria-pressed="isActive('blockquote')"
        title="Cita"
        @click="run((c) => c.toggleBlockquote())"
      >
        ❝
      </button>
      <button
        type="button"
        class="rt-btn"
        :class="{ 'is-active': isActive('link') }"
        :aria-pressed="isActive('link')"
        title="Link (Ctrl+K)"
        @click="setLink"
      >
        ↗
      </button>
      <button
        type="button"
        class="rt-btn"
        title="Separador"
        @click="run((c) => c.setHorizontalRule())"
      >
        ―
      </button>
    </div>

    <EditorContent :editor="editor" class="rt-content" :style="{ minHeight: `${minHeight}px` }" />
  </div>
</template>

<style scoped>
.rt-editor {
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  box-shadow: var(--sombra-bloque-sm);
  overflow: hidden;
}

.rt-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 8px 10px;
  background: var(--amarillo-suave);
  border-bottom: 2.5px solid var(--linea);
}

.rt-btn {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 2px solid var(--linea);
  border-radius: var(--radio-sm);
  background: var(--crema);
  color: var(--tinta);
  cursor: pointer;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 60ms ease, box-shadow 60ms ease;
}
.rt-btn:hover { background: var(--amarillo); }
.rt-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--amarillo);
}
.rt-btn.is-active {
  background: var(--rojo);
  color: var(--crema);
}

.rt-sep {
  width: 2px;
  height: 22px;
  background: var(--linea);
  margin: 0 4px;
  opacity: 0.5;
}

.rt-content {
  padding: 16px 18px;
  font-family: var(--titulo);
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--tinta);
}

.rt-content :deep(.ProseMirror) {
  outline: none;
  min-height: inherit;
}
.rt-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--tinta);
  opacity: 0.4;
  pointer-events: none;
  height: 0;
}
.rt-content :deep(h2) {
  font-family: var(--display);
  font-size: 1.6rem;
  margin: 1rem 0 0.5rem;
}
.rt-content :deep(h3) {
  font-family: var(--titulo);
  font-weight: 800;
  font-size: 1.25rem;
  margin: 0.9rem 0 0.4rem;
}
.rt-content :deep(p) { margin: 0.5rem 0; }
.rt-content :deep(ul),
.rt-content :deep(ol) {
  padding-left: 1.4rem;
  margin: 0.5rem 0;
}
.rt-content :deep(li) { margin: 0.2rem 0; }
.rt-content :deep(blockquote) {
  border-left: 4px solid var(--rojo);
  padding: 0.2rem 0 0.2rem 1rem;
  margin: 0.8rem 0;
  font-style: italic;
  color: var(--tinta);
  opacity: 0.85;
}
.rt-content :deep(a) {
  color: var(--rojo);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.rt-content :deep(hr) {
  border: none;
  border-top: 2.5px solid var(--linea);
  margin: 1.2rem 0;
}
.rt-content :deep(strong) { font-weight: 800; }
</style>
