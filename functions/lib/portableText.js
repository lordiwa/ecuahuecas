// Pure, dependency-light helpers for turning Claude's markdown into Sanity
// PortableText and for slugging document names.
//
// IMPORTANT: this module imports ONLY `marked` (a markdown lexer). It must stay
// free of firebase-functions / @anthropic-ai/sdk / @sanity/client so the unit
// suite can import it directly without dragging in heavy SDKs.
import { marked } from 'marked'

/**
 * URL/Sanity-slug-friendly string: lowercase, accents stripped, every run of
 * non-alphanumerics collapsed to a single dash, leading/trailing dashes trimmed.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return String(str ?? '')
    .normalize('NFD')
    // Strip combining diacritical marks (the accents NFD split off).
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Convert markdown to an array of Sanity PortableText blocks.
 *
 * Supported: paragraphs, headings (depth 1-2 → h2, 3+ → h3), blockquotes,
 * bullet/numbered lists, and the inline marks strong/em/code plus links (each
 * link becomes a `markDef` of `_type:'link'` referenced by the span's marks).
 * Anything unsupported degrades to a normal paragraph of its plain text.
 *
 * Keys are deterministic (`b{i}`, `b{i}s{j}`, `md{i}{j}`) so the same input
 * yields the same document — handy for diffing and for the tests.
 *
 * @param {string} md
 * @returns {Array<object>}
 */
export function markdownToPortableText(md) {
  const tokens = marked.lexer(String(md ?? ''))
  const blocks = []
  // Single monotonically increasing counter so every emitted block gets a
  // unique, stable key regardless of nesting (lists fan out to many blocks).
  const ctx = { i: 0 }
  for (const token of tokens) {
    emitToken(token, blocks, ctx, 'normal', null)
  }
  return blocks
}

/** Map a single top-level lexer token to zero or more PortableText blocks. */
function emitToken(token, blocks, ctx, defaultStyle, listItem) {
  switch (token.type) {
    case 'space':
      return
    case 'heading': {
      const style = token.depth <= 2 ? 'h2' : 'h3'
      blocks.push(makeBlock(ctx, style, token.tokens, listItem, null))
      return
    }
    case 'paragraph':
      blocks.push(makeBlock(ctx, defaultStyle, token.tokens, listItem, null))
      return
    case 'text':
      // A bare text token (e.g. inside a tight list item) — render as a block.
      blocks.push(
        makeBlock(ctx, defaultStyle, token.tokens ?? [{ type: 'text', text: token.text }], listItem, null),
      )
      return
    case 'blockquote': {
      // Flatten the quote's inner blocks into blockquote-styled blocks.
      const inner = token.tokens ?? []
      if (inner.length === 0) {
        blocks.push(makeBlock(ctx, 'blockquote', [{ type: 'text', text: token.text ?? '' }], null, null))
        return
      }
      for (const child of inner) {
        if (child.type === 'space') continue
        emitToken(child, blocks, ctx, 'blockquote', null)
      }
      return
    }
    case 'list': {
      const kind = token.ordered ? 'number' : 'bullet'
      for (const item of token.items ?? []) {
        // Each list item becomes one block; use its inline tokens for spans.
        const itemTokens = inlineTokensForListItem(item)
        blocks.push(makeBlock(ctx, 'normal', itemTokens, kind, 1))
      }
      return
    }
    default:
      // Unsupported (code blocks, tables, hr, html…) → degrade to a paragraph
      // of plain text so nothing is silently dropped.
      blocks.push(
        makeBlock(ctx, 'normal', [{ type: 'text', text: token.text ?? token.raw ?? '' }], listItem, null),
      )
  }
}

/** Pull the inline tokens out of a list item (lexer double-wraps tight items). */
function inlineTokensForListItem(item) {
  const t = item.tokens ?? []
  // Tight list items wrap their inline content in a `text` token that itself
  // carries `.tokens`. Unwrap one level when present.
  if (t.length === 1 && (t[0].type === 'text' || t[0].type === 'paragraph') && t[0].tokens) {
    return t[0].tokens
  }
  // Otherwise collect inline tokens from any paragraph/text children.
  const out = []
  for (const child of t) {
    if ((child.type === 'paragraph' || child.type === 'text') && child.tokens) {
      out.push(...child.tokens)
    } else {
      out.push(child)
    }
  }
  return out.length ? out : [{ type: 'text', text: item.text ?? '' }]
}

/**
 * Build one block, walking inline tokens into spans and collecting link
 * markDefs. `listItem`/`level` are set only for list blocks.
 */
function makeBlock(ctx, style, inlineTokens, listItem, level) {
  const i = ctx.i++
  const key = `b${i}`
  const children = []
  const markDefs = []
  walkInline(inlineTokens ?? [], [], children, markDefs, key, i)
  if (children.length === 0) {
    children.push({ _type: 'span', _key: `${key}s0`, text: '', marks: [] })
  }
  const block = { _type: 'block', _key: key, style, markDefs, children }
  if (listItem) {
    block.listItem = listItem
    block.level = level ?? 1
  }
  return block
}

/**
 * Recursively flatten inline tokens into spans. `activeMarks` carries the
 * decoration/markDef keys applied by enclosing strong/em/link tokens.
 */
function walkInline(tokens, activeMarks, children, markDefs, blockKey, blockIndex) {
  for (const tok of tokens) {
    switch (tok.type) {
      case 'text':
      case 'escape':
        pushSpan(children, blockKey, tok.text ?? '', activeMarks)
        break
      case 'strong':
        walkInline(tok.tokens ?? [{ type: 'text', text: tok.text }], [...activeMarks, 'strong'], children, markDefs, blockKey, blockIndex)
        break
      case 'em':
        walkInline(tok.tokens ?? [{ type: 'text', text: tok.text }], [...activeMarks, 'em'], children, markDefs, blockKey, blockIndex)
        break
      case 'codespan':
        pushSpan(children, blockKey, tok.text ?? '', [...activeMarks, 'code'])
        break
      case 'del':
        walkInline(tok.tokens ?? [{ type: 'text', text: tok.text }], [...activeMarks, 'strike-through'], children, markDefs, blockKey, blockIndex)
        break
      case 'link': {
        const defKey = `md${blockIndex}${markDefs.length}`
        markDefs.push({ _type: 'link', _key: defKey, href: tok.href, blank: true })
        walkInline(tok.tokens ?? [{ type: 'text', text: tok.text }], [...activeMarks, defKey], children, markDefs, blockKey, blockIndex)
        break
      }
      case 'br':
        pushSpan(children, blockKey, '\n', activeMarks)
        break
      default:
        // Unknown inline → its plain text with the current marks.
        if (tok.tokens) {
          walkInline(tok.tokens, activeMarks, children, markDefs, blockKey, blockIndex)
        } else {
          pushSpan(children, blockKey, tok.text ?? tok.raw ?? '', activeMarks)
        }
    }
  }
}

/** Append a span with a stable per-block key. */
function pushSpan(children, blockKey, text, marks) {
  children.push({
    _type: 'span',
    _key: `${blockKey}s${children.length}`,
    text,
    marks: [...marks],
  })
}
