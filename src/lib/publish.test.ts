import { describe, it, expect } from 'vitest'
import { buildPublishPhotos, type PublishPhotoInput } from './publish'

// A fake "in-memory draft photo" carrying base64 already resolved by the caller
// (the blob→base64 IO is tested elsewhere / mocked). buildPublishPhotos is the
// PURE mapper: photo metadata + heroId → the publishResena `photos[]` payload.
function fakePhoto(over: Partial<PublishPhotoInput> = {}): PublishPhotoInput {
  return {
    id: 'p1',
    dataBase64: 'AAAA',
    mime: 'image/webp',
    filename: 'foto1.webp',
    alt: 'Un plato',
    caption: 'En la mesa',
    credit: 'Foto: redacción',
    ...over,
  }
}

describe('buildPublishPhotos', () => {
  it('passes through metadata fields for each photo', () => {
    const out = buildPublishPhotos([fakePhoto()], 'p1')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      id: 'p1',
      dataBase64: 'AAAA',
      mime: 'image/webp',
      filename: 'foto1.webp',
      alt: 'Un plato',
      caption: 'En la mesa',
      credit: 'Foto: redacción',
    })
  })

  it('marks the heroId photo as hero and others as not hero', () => {
    const out = buildPublishPhotos(
      [fakePhoto({ id: 'a' }), fakePhoto({ id: 'b' }), fakePhoto({ id: 'c' })],
      'b',
    )
    expect(out.find((p) => p.id === 'a')?.isHero).toBe(false)
    expect(out.find((p) => p.id === 'b')?.isHero).toBe(true)
    expect(out.find((p) => p.id === 'c')?.isHero).toBe(false)
  })

  it('falls back to the first photo as hero when heroId is missing/unknown', () => {
    const out = buildPublishPhotos([fakePhoto({ id: 'x' }), fakePhoto({ id: 'y' })], null)
    expect(out[0].isHero).toBe(true)
    expect(out[1].isHero).toBe(false)

    const out2 = buildPublishPhotos([fakePhoto({ id: 'x' }), fakePhoto({ id: 'y' })], 'nope')
    expect(out2[0].isHero).toBe(true)
    expect(out2[1].isHero).toBe(false)
  })

  it('returns an empty array when given no photos', () => {
    expect(buildPublishPhotos([], 'p1')).toEqual([])
  })

  it('preserves input order', () => {
    const out = buildPublishPhotos(
      [fakePhoto({ id: '1' }), fakePhoto({ id: '2' }), fakePhoto({ id: '3' })],
      '3',
    )
    expect(out.map((p) => p.id)).toEqual(['1', '2', '3'])
  })
})
