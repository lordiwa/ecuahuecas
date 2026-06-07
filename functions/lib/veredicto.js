// Pure, dependency-free helper that normalizes a loosely-typed veredicto input
// (as sent by the wizard or produced by the AI) into the structured shape stored
// on a reseña doc: { aFavor: string[], enContra: string[], ticket?: string }.
//
// IMPORTANT: like portableText.js / resolveHueca.js this module imports NOTHING
// (no firebase-functions / @anthropic-ai/sdk / @sanity/client) so it stays
// unit-testable in the client+functions vitest suite.

/** Keep only non-empty, trimmed string entries of an array (ignores non-strings). */
function cleanStrings(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed.length > 0) out.push(trimmed)
  }
  return out
}

/**
 * Normalize an arbitrary veredicto-like input.
 *
 * @param {unknown} input
 * @returns {{ aFavor: string[], enContra: string[], ticket?: string } | undefined}
 *   `undefined` when everything is empty (no aFavor, no enContra, no ticket) or
 *   the input is not an object. `ticket` is omitted when empty/whitespace.
 */
export function normalizeVeredicto(input) {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return undefined
  }
  const aFavor = cleanStrings(input.aFavor)
  const enContra = cleanStrings(input.enContra)
  const ticket = typeof input.ticket === 'string' ? input.ticket.trim() : ''

  if (aFavor.length === 0 && enContra.length === 0 && ticket.length === 0) {
    return undefined
  }

  const result = { aFavor, enContra }
  if (ticket.length > 0) result.ticket = ticket
  return result
}
