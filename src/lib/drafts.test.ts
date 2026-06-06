import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveDraft,
  loadDraft,
  listDrafts,
  deleteDraft,
  stripPhotoBlobs,
  isNuevaHuecaValid,
  createEmptyDraft,
  DRAFT_PREFIX,
  type ResenaDraft,
  type NuevaHuecaDraft,
} from './drafts'

function makeDraft(overrides: Partial<ResenaDraft> = {}): ResenaDraft {
  return {
    id: 'temp-abc',
    updatedAt: '2026-05-30T12:00:00.000Z',
    step: 2,
    huecaMode: 'existente',
    huecaId: 'el-rincon',
    nuevaHueca: {
      nombre: '',
      ciudad: 'Quito',
      descripcion: '',
      coords: null,
      barrio: '',
      direccion: '',
      plato_estrella: '',
      precio: '$',
      horario: '',
      desde: null,
      tags: [],
    },
    rating: 4,
    titulo: 'Un encebollado de otro nivel',
    tagline: 'Caldo concentrado, atún fresco',
    body: '## Lo bueno\n\nEl caldo estaba humeante.',
    veredicto: 'Vale la pena el viaje.',
    instruccionesIA: 'Destaca el caldo y el ambiente familiar.',
    photos: [
      {
        id: 'p1',
        name: 'foto1.webp',
        url: 'blob:http://localhost/abc',
        sha256: 'deadbeef',
        width: 1200,
        height: 800,
        originalSize: 500000,
        compressedSize: 120000,
        mime: 'image/webp',
        // blob intentionally present here to prove it is stripped on save
        blob: new Blob(['x'], { type: 'image/webp' }),
      },
    ],
    heroId: 'p1',
    ...overrides,
  }
}

describe('drafts persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips wizard state through save/load (criterion #2/#4)', () => {
    const draft = makeDraft()
    saveDraft(draft)
    const loaded = loadDraft(draft.id)
    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe('temp-abc')
    expect(loaded?.step).toBe(2)
    expect(loaded?.rating).toBe(4)
    expect(loaded?.titulo).toBe('Un encebollado de otro nivel')
    expect(loaded?.tagline).toBe('Caldo concentrado, atún fresco')
    expect(loaded?.body).toContain('El caldo estaba humeante.')
    expect(loaded?.veredicto).toBe('Vale la pena el viaje.')
    expect(loaded?.huecaId).toBe('el-rincon')
    expect(loaded?.heroId).toBe('p1')
  })

  it('round-trips the AI-only instruccionesIA guide through save/load (TASK-029)', () => {
    const draft = makeDraft({ instruccionesIA: 'Menciona que abre temprano.' })
    saveDraft(draft)
    const loaded = loadDraft(draft.id)
    expect(loaded?.instruccionesIA).toBe('Menciona que abre temprano.')
  })

  it('loads a legacy draft missing instruccionesIA without crashing (TASK-029 compat)', () => {
    // Simulate a draft persisted before the field existed: no `instruccionesIA`.
    const draft = makeDraft()
    const { instruccionesIA: _omit, ...legacy } = draft
    void _omit
    localStorage.setItem(`${DRAFT_PREFIX}${draft.id}`, JSON.stringify(legacy))
    const loaded = loadDraft(draft.id)
    expect(loaded).not.toBeNull()
    // The field is simply absent (undefined); the wizard seeds it to '' on load.
    expect(loaded?.instruccionesIA ?? '').toBe('')
  })

  it('strips photo blobs on save but keeps sha256 + url metadata (criterion #2)', () => {
    const draft = makeDraft()
    saveDraft(draft)

    // Read the raw localStorage payload to be sure no blob leaked in.
    // (The url legitimately contains the substring "blob:", so assert on the
    // serialized field key instead.)
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${draft.id}`)
    expect(raw).toBeTruthy()
    expect(raw).not.toContain('"blob"')
    const reparsed = JSON.parse(raw!)
    expect('blob' in reparsed.photos[0]).toBe(false)

    const loaded = loadDraft(draft.id)
    expect(loaded?.photos).toHaveLength(1)
    const photo = loaded!.photos[0]
    expect(photo.sha256).toBe('deadbeef')
    expect(photo.url).toBe('blob:http://localhost/abc')
    expect('blob' in photo).toBe(false)
  })

  it('stripPhotoBlobs removes the blob field, leaving metadata intact', () => {
    const draft = makeDraft()
    const stripped = stripPhotoBlobs(draft)
    expect('blob' in stripped.photos[0]).toBe(false)
    expect(stripped.photos[0].sha256).toBe('deadbeef')
    expect(stripped.photos[0].url).toBe('blob:http://localhost/abc')
    // original draft is not mutated
    expect('blob' in draft.photos[0]).toBe(true)
  })

  it('listDrafts returns only draft:resena:* keys, newest first', () => {
    localStorage.setItem('unrelated', 'nope')
    localStorage.setItem('draft:otracosa:1', 'nope')
    saveDraft(makeDraft({ id: 'a', updatedAt: '2026-05-01T00:00:00.000Z', titulo: 'A' }))
    saveDraft(makeDraft({ id: 'b', updatedAt: '2026-05-20T00:00:00.000Z', titulo: 'B' }))

    const list = listDrafts()
    expect(list).toHaveLength(2)
    const ids = list.map((d) => d.id)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
    // newest first
    expect(list[0].id).toBe('b')
    // summary carries enough to render the list
    expect(list[0].titulo).toBe('B')
    expect(list[0].updatedAt).toBe('2026-05-20T00:00:00.000Z')
  })

  it('deleteDraft removes exactly one draft', () => {
    saveDraft(makeDraft({ id: 'a' }))
    saveDraft(makeDraft({ id: 'b' }))
    deleteDraft('a')
    expect(loadDraft('a')).toBeNull()
    expect(loadDraft('b')).not.toBeNull()
    expect(listDrafts()).toHaveLength(1)
  })

  it('loadDraft returns null for a missing id', () => {
    expect(loadDraft('does-not-exist')).toBeNull()
  })

  it('loadDraft returns null for a corrupt payload instead of throwing', () => {
    localStorage.setItem(`${DRAFT_PREFIX}broken`, '{not json')
    expect(loadDraft('broken')).toBeNull()
  })
})

describe('createEmptyDraft (TASK-029)', () => {
  it('seeds instruccionesIA as an empty string', () => {
    const draft = createEmptyDraft()
    expect(draft.instruccionesIA).toBe('')
  })

  it('round-trips a fresh empty draft through save/load including instruccionesIA', () => {
    localStorage.clear()
    const draft = createEmptyDraft('temp-empty')
    saveDraft(draft)
    const loaded = loadDraft('temp-empty')
    expect(loaded?.instruccionesIA).toBe('')
  })
})

describe('isNuevaHuecaValid (TASK-022)', () => {
  function fullNueva(over: Partial<NuevaHuecaDraft> = {}): NuevaHuecaDraft {
    return {
      nombre: 'Encebollados Don Pepe',
      ciudad: 'Manta',
      barrio: 'Tarqui',
      direccion: 'Av. 4 de Noviembre',
      plato_estrella: 'Encebollado',
      precio: '$$',
      descripcion: 'rico',
      coords: { lat: -1, lng: -80 },
      horario: '8:00 - 14:00',
      desde: 1990,
      tags: ['mariscos'],
      ...over,
    }
  }

  it('returns true for a fully populated valid object', () => {
    expect(isNuevaHuecaValid(fullNueva())).toBe(true)
  })

  it('returns true when only the optional fields are empty', () => {
    expect(
      isNuevaHuecaValid(fullNueva({ descripcion: '', horario: '', desde: null, tags: [], coords: null })),
    ).toBe(true)
  })

  it('returns false when nombre is missing or whitespace', () => {
    expect(isNuevaHuecaValid(fullNueva({ nombre: '' }))).toBe(false)
    expect(isNuevaHuecaValid(fullNueva({ nombre: '   ' }))).toBe(false)
  })

  it('returns false when barrio is missing', () => {
    expect(isNuevaHuecaValid(fullNueva({ barrio: '' }))).toBe(false)
  })

  it('returns false when direccion is missing', () => {
    expect(isNuevaHuecaValid(fullNueva({ direccion: '  ' }))).toBe(false)
  })

  it('returns false when plato_estrella is missing', () => {
    expect(isNuevaHuecaValid(fullNueva({ plato_estrella: '' }))).toBe(false)
  })

  it('returns false when ciudad is not a valid Ciudad', () => {
    expect(isNuevaHuecaValid(fullNueva({ ciudad: 'Loja' as never }))).toBe(false)
  })

  it('returns false when precio is not a valid Precio', () => {
    expect(isNuevaHuecaValid(fullNueva({ precio: '$$$$' as never }))).toBe(false)
    expect(isNuevaHuecaValid(fullNueva({ precio: '' as never }))).toBe(false)
  })
})
