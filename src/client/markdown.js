/**
 * The two renderers a plan can be read with.
 *
 * `markdownRenderer` is the host's own `MarkdownText` — the same shared module
 * the shipped plan viewer draws with. A dynamic Client bundle reaches it through
 * the module loader's `require`: the Web bundle is loaded as a factory that
 * receives it, and the browser seeds a frozen module table carrying
 * `@deepseek-ai/dsh-client-ui-primitives`. The lookup runs once and is
 * remembered.
 *
 * That module decides how a plan is DRAWN, never WHETHER it is shown: when it is
 * out of reach, `renderPlan` below draws the plan instead. A card whose click
 * shows nothing is worse than a card drawn plainly, so there is always one of the
 * two — raw markdown is never printed as a block of text.
 */
import { createElement as h } from 'react'

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

const HEADING = /^(#{1,6})[ \t]+(.*)$/
const BULLET = /^[ \t]*[-*+][ \t]+(.*)$/
const ORDERED = /^[ \t]*(\d{1,9})[.)][ \t]+(.*)$/
const QUOTE = /^[ \t]*>[ \t]?(.*)$/
const RULE = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const FENCE = /^[ \t]*(```+|~~~+)[ \t]*([A-Za-z0-9+._-]*)[ \t]*$/
const LINK = /^(?:https?:\/\/|mailto:)/i

/**
 * Inline spans: code, bold, italic and links with a scheme the browser may load.
 *
 * Groups: 1–2 code, 3–4 bold, 5–6 italic, 7–8 link. Anything the pattern does
 * not match stays text, so an unfinished `**` is printed as written.
 */
const INLINE = /(`+)([\s\S]*?)\1|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|\*([^*\n]+?)\*|_([^_\n]+?)_|\[([^\]\n]*)\]\(([^)\s]+)\)/g

function inline(text, keyPrefix) {
  const nodes = []
  let last = 0
  let index = 0
  INLINE.lastIndex = 0
  let match = INLINE.exec(text)
  while (match !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const key = `${keyPrefix}-${index}`
    index += 1
    if (match[2] !== undefined) nodes.push(h('code', { key }, match[2]))
    else if (match[3] !== undefined || match[4] !== undefined) nodes.push(h('strong', { key }, match[3] ?? match[4]))
    else if (match[5] !== undefined || match[6] !== undefined) nodes.push(h('em', { key }, match[5] ?? match[6]))
    else if (match[7] !== undefined && LINK.test(match[8])) {
      nodes.push(h('a', { key, href: match[8], target: '_blank', rel: 'noreferrer noopener' }, match[7]))
    } else nodes.push(match[7] ?? '')
    last = match.index + match[0].length
    match = INLINE.exec(text)
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function startsBlock(line) {
  return FENCE.test(line) || RULE.test(line) || HEADING.test(line)
    || QUOTE.test(line) || BULLET.test(line) || ORDERED.test(line)
}

/**
 * Block structure: headings one level below the card's own title, paragraphs,
 * bullet and numbered lists, quotes, fenced code and horizontal rules.
 *
 * A nested list flattens into its parent — the reader loses the indentation, not
 * the items. Tables stay paragraphs: the fallback promises readable text, not a
 * second markdown implementation.
 */
function blocks(text) {
  const lines = text.split('\n')
  const nodes = []
  let i = 0
  let key = 0
  const nextKey = () => {
    key += 1
    return `b${key}`
  }
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      i += 1
      continue
    }
    const fence = FENCE.exec(line)
    if (fence !== null) {
      const marker = fence[1][0]
      const language = fence[2]
      const body = []
      i += 1
      while (i < lines.length) {
        const closing = FENCE.exec(lines[i])
        if (closing !== null && closing[1][0] === marker && closing[2] === '') {
          i += 1
          break
        }
        body.push(lines[i])
        i += 1
      }
      const attributes = { key: nextKey() }
      if (language !== '') attributes['data-lang'] = language
      nodes.push(h('pre', attributes, h('code', null, body.join('\n'))))
      continue
    }
    if (RULE.test(line)) {
      nodes.push(h('hr', { key: nextKey() }))
      i += 1
      continue
    }
    const heading = HEADING.exec(line)
    if (heading !== null) {
      const level = Math.min(heading[1].length + 1, 6)
      nodes.push(h(`h${level}`, { key: nextKey() }, inline(heading[2], `h${key}`)))
      i += 1
      continue
    }
    if (QUOTE.test(line)) {
      const parts = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        parts.push(QUOTE.exec(lines[i])[1])
        i += 1
      }
      nodes.push(h('blockquote', { key: nextKey() }, h('p', null, inline(parts.join(' '), `q${key}`))))
      continue
    }
    const ordered = ORDERED.test(line) && !BULLET.test(line)
    if (ordered || BULLET.test(line)) {
      const items = []
      while (i < lines.length) {
        const item = ordered ? ORDERED.exec(lines[i]) : BULLET.exec(lines[i])
        if (item === null) break
        items.push(h('li', { key: `l${key}-${items.length}` }, inline(ordered ? item[2] : item[1], `li${key}`)))
        i += 1
      }
      nodes.push(h(ordered ? 'ol' : 'ul', { key: nextKey() }, items))
      continue
    }
    const paragraph = []
    while (i < lines.length && lines[i].trim() !== '' && (paragraph.length === 0 || !startsBlock(lines[i]))) {
      paragraph.push(lines[i].trim())
      i += 1
    }
    nodes.push(h('p', { key: nextKey() }, inline(paragraph.join(' '), `p${key}`)))
  }
  return nodes
}

/** The plan drawn by the plugin itself, used whenever the host renderer is missing. */
export function renderPlan(markdown) {
  const text = typeof markdown === 'string' ? markdown.replace(/\r\n?/g, '\n') : ''
  let children
  try {
    children = blocks(text)
  } catch {
    // A parser bug must not blank the card: paragraph breaks survive, nothing else is promised.
    children = text.split(/\n{2,}/).filter((part) => part.trim() !== '').map((part, index) => h('p', { key: `p${index}` }, part.trim()))
  }
  return h('div', { className: 'plans-lite' }, children)
}
