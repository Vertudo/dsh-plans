/**
 * The host's markdown renderer, when the shared module table carries one.
 *
 * `require` here is the module loader's own lookup: the Web bundle is loaded as
 * a factory that receives it, and the browser's module table owns
 * `@deepseek-ai/dsh-client-ui-primitives`, the same module the shipped plan
 * viewer renders with. Outside that loader — the Node tests, a page with no
 * module table — the lookup is absent or throws, and the pane falls back to a
 * `<pre>` with the raw markdown. The lookup runs once and is remembered.
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
