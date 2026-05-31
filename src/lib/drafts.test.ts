import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveDraft,
  loadDraft,
  listDrafts,
  deleteDraft,
  stripPhotoBlobs,
  DRAFT_PREFIX,
  type ResenaDraft,
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
    },
    rating: 4,
    titulo: 'Un encebollado de otro nivel',
    tagline: 'Caldo concentrado, atún fresco',
    body: '## Lo bueno\n\nEl caldo estaba humeante.',
    veredicto: 'Vale la pena el viaje.',
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
