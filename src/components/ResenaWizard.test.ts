import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '../../test/flushPromises'
import { createEmptyDraft, type ResenaDraft } from '@/lib/drafts'

/**
 * Interaction contract for the reseña wizard step 3 (TASK-029).
 *
 * The wizard gained a dedicated, AI-only "Indicaciones / referencias para la IA"
 * field (`instruccionesIA`). When the user clicks "Generar con IA" the AI must
 * read THIS field as `notas` — NOT the published `veredicto`. And the new field
 * must never reach the `publishResena` payload.
 *
 * @vue/test-utils is not a dependency. We mount the real SFC with Vue's own
 * createApp into a jsdom container so click handlers actually fire, mocking the
 * Cloud Function wrappers (@/lib/publish), content, auth/role composables,
 * vue-router, and the heavy async editor/uploader/map child components.
 */

const h = vi.hoisted(() => ({
  generateResenaDraft: vi.fn(),
  publishResena: vi.fn(),
  photosToPublishInputs: vi.fn(),
  buildPublishPhotos: vi.fn(),
}))

vi.mock('@/lib/publish', () => ({
  generateResenaDraft: (...args: unknown[]) => h.generateResenaDraft(...args),
  publishResena: (...args: unknown[]) => h.publishResena(...args),
  photosToPublishInputs: (...args: unknown[]) => h.photosToPublishInputs(...args),
  buildPublishPhotos: (...args: unknown[]) => h.buildPublishPhotos(...args),
}))

vi.mock('@/lib/content', () => ({
  huecas: ref([]),
  criticos: ref([]),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: ref(true) }),
}))

vi.mock('@/composables/useRole', () => ({
  useRole: () => ({ isAdmin: ref(true) }),
}))

vi.mock('vue-router', async () => {
  const { defineComponent, h: createEl } = await import('vue')
  return {
    useRouter: () => ({ push: vi.fn() }),
    RouterLink: defineComponent({
      name: 'RouterLink',
      props: { to: { type: [String, Object], required: true } },
      setup: (_p, { slots }) => () => createEl('a', {}, slots.default?.()),
    }),
  }
})

// Heavy children that pull in TipTap / MapLibre / file IO — stub to no-ops.
// `__esModule: true` is required so Vue's defineAsyncComponent (used for
// RichTextEditor) unwraps `.default` instead of treating the whole module
// namespace as the component.
async function stubModule(name: string) {
  const { defineComponent } = await import('vue')
  return { __esModule: true, default: defineComponent({ name, render: () => null }) }
}
vi.mock('@/components/RichTextEditor.vue', () => stubModule('RichTextEditor'))
vi.mock('@/components/UbicacionPicker.vue', () => stubModule('UbicacionPicker'))
vi.mock('@/components/PhotoUploader.vue', () => stubModule('PhotoUploader'))
vi.mock('@/components/Stepper.vue', () => stubModule('Stepper'))
vi.mock('@/components/Estrellas.vue', () => stubModule('Estrellas'))

import { createApp } from 'vue'
import ResenaWizard from './ResenaWizard.vue'

let container: HTMLElement
let app: ReturnType<typeof createApp> | null = null

function mount(initial: ResenaDraft) {
  container = document.createElement('div')
  document.body.appendChild(container)
  app = createApp(ResenaWizard, { initial })
  app.mount(container)
}

function seed(overrides: Partial<ResenaDraft> = {}): ResenaDraft {
  return {
    ...createEmptyDraft('temp-test'),
    // Step 3 so the AI button is rendered; existing hueca so a nombre resolves.
    step: 3,
    huecaMode: 'nueva',
    nuevaHueca: {
      ...createEmptyDraft('x').nuevaHueca,
      nombre: 'Don Pepe',
      ciudad: 'Manta',
      // Fully valid new hueca so onPublicar's validation guard does not block.
      barrio: 'Tarqui',
      direccion: 'Av. 4 de Noviembre',
      plato_estrella: 'Encebollado',
      precio: '$$',
    },
    rating: 4,
    veredictoAFavor: 'Caldo concentrado\nAtún fresco',
    veredictoEnContra: 'Local pequeño',
    veredictoTicket: '$3.50',
    instruccionesIA: 'GUIA IA: destaca el caldo humeante y el ambiente familiar.',
    ...overrides,
  }
}

function generarButton(): HTMLButtonElement {
  const btn = Array.from(container.querySelectorAll('button')).find((b) =>
    /Generar con IA/i.test(b.textContent ?? ''),
  )
  if (!btn) throw new Error('Generar con IA button not found')
  return btn as HTMLButtonElement
}

beforeEach(() => {
  h.generateResenaDraft.mockReset()
  h.publishResena.mockReset()
  h.photosToPublishInputs.mockReset()
  h.buildPublishPhotos.mockReset()
  h.generateResenaDraft.mockResolvedValue({ titulo: 'T', extracto: 'E', bodyMarkdown: 'B' })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  h.publishResena.mockResolvedValue({ ok: true, resenaId: 'r', slug: 's', huecaId: 'hue', criticoSlug: null })
  h.photosToPublishInputs.mockResolvedValue([])
  h.buildPublishPhotos.mockReturnValue([])
})

afterEach(() => {
  app?.unmount()
  app = null
  container?.remove()
})

describe('ResenaWizard step 3 — Generar con IA (TASK-029)', () => {
  it('renders the AI-only "Indicaciones / referencias para la IA" field on step 3', () => {
    mount(seed())
    expect(container.textContent).toMatch(/Indicaciones \/ referencias para la IA/i)
  })

  it('calls generateResenaDraft with notas = the instruccionesIA field (NOT veredicto)', async () => {
    mount(seed())
    generarButton().click()
    await flushPromises()

    expect(h.generateResenaDraft).toHaveBeenCalledTimes(1)
    const arg = h.generateResenaDraft.mock.calls[0][0] as { notas: string; huecaNombre: string }
    expect(arg.notas).toBe('GUIA IA: destaca el caldo humeante y el ambiente familiar.')
    expect(arg.notas).not.toBe('VEREDICTO PUBLICADO: vale la pena el viaje.')
    expect(arg.huecaNombre).toBe('Don Pepe')
  })

  it('does not include the instruccionesIA text in the publishResena payload', async () => {
    mount(seed())
    // Trigger publish via the "Publicar" button.
    const publicar = Array.from(container.querySelectorAll('button')).find((b) =>
      /Publicar/i.test(b.textContent ?? ''),
    ) as HTMLButtonElement
    expect(publicar).toBeTruthy()
    publicar.click()
    await flushPromises()

    expect(h.publishResena).toHaveBeenCalledTimes(1)
    const payload = h.publishResena.mock.calls[0][0] as Record<string, unknown>
    // The published veredicto still flows through, now as a structured object…
    expect(payload.veredicto).toEqual({
      aFavor: ['Caldo concentrado', 'Atún fresco'],
      enContra: ['Local pequeño'],
      ticket: '$3.50',
    })
    // …but the private AI guide must NOT appear anywhere in the payload.
    expect('instruccionesIA' in payload).toBe(false)
    expect(JSON.stringify(payload)).not.toContain('GUIA IA:')
  })
})

describe('ResenaWizard step 3 — structured veredicto (TASK-032)', () => {
  function findTextarea(labelRe: RegExp): HTMLTextAreaElement | null {
    const labels = Array.from(container.querySelectorAll('label'))
    const label = labels.find((l) => labelRe.test(l.textContent ?? ''))
    if (!label) return null
    const forId = label.getAttribute('for')
    if (forId) {
      const el = container.querySelector(`#${forId}`)
      if (el instanceof HTMLTextAreaElement) return el
    }
    return null
  }
  function findInput(labelRe: RegExp): HTMLInputElement | null {
    const labels = Array.from(container.querySelectorAll('label'))
    const label = labels.find((l) => labelRe.test(l.textContent ?? ''))
    if (!label) return null
    const forId = label.getAttribute('for')
    if (forId) {
      const el = container.querySelector(`#${forId}`)
      if (el instanceof HTMLInputElement) return el
    }
    return null
  }

  it('renders the 3 structured veredicto inputs and drops the old free-text textarea', () => {
    mount(seed())
    expect(container.textContent).toMatch(/A favor/i)
    expect(container.textContent).toMatch(/En contra/i)
    expect(container.textContent).toMatch(/Ticket/i)
    // The legacy single "Veredicto" textarea (#veredicto) must be gone.
    expect(container.querySelector('#veredicto')).toBeNull()
    // Three editable controls, seeded from the draft.
    expect(findTextarea(/A favor/i)?.value).toContain('Caldo concentrado')
    expect(findTextarea(/En contra/i)?.value).toContain('Local pequeño')
    expect(findInput(/Ticket/i)?.value).toBe('$3.50')
  })

  it('onGenerar maps the AI aFavor/enContra/ticket into the three fields', async () => {
    h.generateResenaDraft.mockResolvedValue({
      titulo: 'T',
      extracto: 'E',
      bodyMarkdown: 'B',
      aFavor: ['Porciones generosas', 'Caldo humeante'],
      enContra: ['Cola larga'],
      ticket: '$4.00',
    })
    mount(seed({ veredictoAFavor: '', veredictoEnContra: '', veredictoTicket: '' }))
    generarButton().click()
    await flushPromises()

    expect(findTextarea(/A favor/i)?.value).toBe('Porciones generosas\nCaldo humeante')
    expect(findTextarea(/En contra/i)?.value).toBe('Cola larga')
    expect(findInput(/Ticket/i)?.value).toBe('$4.00')
  })

  it('onPublicar sends a structured veredicto object with empties dropped (not a string)', async () => {
    mount(
      seed({
        veredictoAFavor: 'Caldo concentrado\n\n  Atún fresco  \n',
        veredictoEnContra: '  Local pequeño  \n',
        veredictoTicket: '  $3.50  ',
      }),
    )
    const publicar = Array.from(container.querySelectorAll('button')).find((b) =>
      /Publicar/i.test(b.textContent ?? ''),
    ) as HTMLButtonElement
    publicar.click()
    await flushPromises()

    expect(h.publishResena).toHaveBeenCalledTimes(1)
    const payload = h.publishResena.mock.calls[0][0] as Record<string, unknown>
    expect(typeof payload.veredicto).not.toBe('string')
    expect(payload.veredicto).toEqual({
      aFavor: ['Caldo concentrado', 'Atún fresco'],
      enContra: ['Local pequeño'],
      ticket: '$3.50',
    })
  })
})
