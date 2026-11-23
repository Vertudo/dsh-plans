/**
 * The host's markdown renderer.
 *
 * `require` here is the module loader's own lookup: the Web bundle is loaded as
 * a factory that receives it, and the browser seeds a frozen module table that
 * carries `@deepseek-ai/dsh-client-ui-primitives` — the same shared module the
 * shipped plan viewer renders with. The lookup runs once and is remembered.
 *
 * The answer decides how a card behaves: with the renderer a click reads the
 * plan in place; without it the plugin prints no markdown at all and the card
 * opens the built-in plan viewer instead (`PlanCard`).
 */

let resolved
let value = null

/** The host's `MarkdownText`, or `null` when this build cannot reach it. */
export function markdownRenderer() {
  if (resolved === true) return value
  resolved = true
  try {
    const lookup = typeof require === 'function' ? require : undefined
    const primitives = lookup === undefined ? undefined : lookup('@deepseek-ai/dsh-client-ui-primitives')
    if (typeof primitives?.MarkdownText === 'function') value = primitives.MarkdownText
  } catch {
    value = null
  }
  return value
}
