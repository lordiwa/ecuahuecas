import { describe, it, expect } from 'vitest'
// Import the PURE ESM module directly. It must NOT pull in firebase-functions,
// @anthropic-ai/sdk, or @sanity/client — only `marked` (a markdown lexer).
import { slugify, markdownToPortableText } from './portableText.js'

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Encebollados Don Pepe')).toBe('encebollados-don-pepe')
  })

  it('strips accents', () => {
    expect(slugify('Caldería del Niño Atún')).toBe('calderia-del-nino-atun')
  })

  it('collapses runs of symbols and trims dashes', () => {
    expect(slugify('  ¡Hola!!  Qué—rico  ')).toBe('hola-que-rico')
  })

  it('drops leading/trailing separators', () => {
    expect(slugify('--$$ Café & Té $$--')).toBe('cafe-te')
  })
})

// Helpers to assert on PortableText without coupling to incidental field order.
type Block = {
  _type: string
  _key: string
  style?: string
  listItem?: string
  level?: number
  children?: Span[]
  markDefs?: MarkDef[]
}
type Span = { _type: string; _key: string; text: string; marks?: string[] }
type MarkDef = { _type: string; _key: string; href?: string; blank?: boolean }

describe('markdownToPortableText', () => {
  it('maps an h1/h2 heading to style h2 and h3+ to h3', () => {
    const blocks = markdownToPortableText('# Título\n\n### Subtítulo') as Block[]
    expect(blocks[0]._type).toBe('block')
    expect(blocks[0].style).toBe('h2')
    expect(blocks[0].children?.[0].text).toBe('Título')
    const h2depth = markdownToPortableText('## Dos') as Block[]
    expect(h2depth[0].style).toBe('h2')
    const sub = blocks.find((b) => b.children?.[0]?.text === 'Subtítulo')
    expect(sub?.style).toBe('h3')
  })

  it('maps a paragraph to a normal block with markDefs array', () => {
    const blocks = markdownToPortableText('Un caldo humeante.') as Block[]
    expect(blocks).toHaveLength(1)
    expect(blocks[0]._type).toBe('block')
    expect(blocks[0].style).toBe('normal')
    expect(Array.isArray(blocks[0].markDefs)).toBe(true)
    expect(blocks[0].children?.[0].text).toContain('Un caldo humeante.')
  })

  it('applies inline marks strong/em/code', () => {
    const blocks = markdownToPortableText(
      'Esto es **fuerte**, esto *suave* y esto `codigo`.',
    ) as Block[]
    const spans = blocks[0].children ?? []
    const strong = spans.find((s) => s.text === 'fuerte')
    const em = spans.find((s) => s.text === 'suave')
    const code = spans.find((s) => s.text === 'codigo')
    expect(strong?.marks).toContain('strong')
    expect(em?.marks).toContain('em')
    expect(code?.marks).toContain('code')
  })

  it('maps a blockquote to style blockquote', () => {
    const blocks = markdownToPortableText('> Vale la pena el viaje.') as Block[]
    const bq = blocks.find((b) => b.style === 'blockquote')
    expect(bq).toBeTruthy()
    expect(bq?.children?.map((s) => s.text).join('')).toContain('Vale la pena el viaje.')
  })

  it('maps bullet lists to listItem bullet blocks', () => {
    const blocks = markdownToPortableText('- uno\n- dos') as Block[]
    const items = blocks.filter((b) => b.listItem === 'bullet')
    expect(items).toHaveLength(2)
    expect(items[0].level).toBe(1)
    expect(items.map((b) => b.children?.[0].text)).toEqual(['uno', 'dos'])
  })

  it('maps numbered lists to listItem number blocks', () => {
    const blocks = markdownToPortableText('1. primero\n2. segundo') as Block[]
    const items = blocks.filter((b) => b.listItem === 'number')
    expect(items).toHaveLength(2)
    expect(items.map((b) => b.children?.[0].text)).toEqual(['primero', 'segundo'])
  })

  it('emits a link markDef referenced by the span marks', () => {
    const blocks = markdownToPortableText(
      'Mira [esta hueca](https://ejemplo.ec/hueca).',
    ) as Block[]
    const block = blocks[0]
    expect(block.markDefs?.length).toBeGreaterThan(0)
    const def = block.markDefs![0]
    expect(def._type).toBe('link')
    expect(def.href).toBe('https://ejemplo.ec/hueca')
    expect(def.blank).toBe(true)
    const linkSpan = block.children?.find((s) => s.text === 'esta hueca')
    expect(linkSpan?.marks).toContain(def._key)
  })

  it('generates stable, unique _key values across blocks and spans', () => {
    const md = '# H\n\nUn **parrafo** con *enfasis*.\n\n- a\n- b'
    const blocks = markdownToPortableText(md) as Block[]
    const blockKeys = blocks.map((b) => b._key)
    expect(new Set(blockKeys).size).toBe(blockKeys.length)
    for (const b of blocks) {
      expect(typeof b._key).toBe('string')
      expect(b._key.length).toBeGreaterThan(0)
      for (const s of b.children ?? []) {
        expect(typeof s._key).toBe('string')
        expect(s._key.length).toBeGreaterThan(0)
      }
    }
    // Deterministic: same input → same keys.
    const again = markdownToPortableText(md) as Block[]
    expect(again.map((b) => b._key)).toEqual(blockKeys)
  })

  it('degrades unsupported tokens to a normal paragraph of their text', () => {
    const blocks = markdownToPortableText('```\ncode block\n```') as Block[]
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks[0]._type).toBe('block')
    expect(blocks[0].style).toBe('normal')
    expect(blocks[0].children?.[0].text).toContain('code block')
  })
})
