/**
 * The plugin's own plan renderer, exercised through the shipped bundle.
 *
 * This is the path a reader gets when the host's `MarkdownText` is out of reach,
 * so the promise it must keep is narrow and absolute: the plan is readable and
 * raw markdown is never dumped as one block of text. The tests check the block
 * structure a plan actually uses — headings, paragraphs, lists, quotes, code —
 * and the inline spans, plus the two ways the parser must not misbehave: an
 * unfinished span and an unsafe link.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReact, expand, findAll, textOf } from './harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')

const { react } = createReact()

/** The bundle as the browser module loader would hand it over: `react` only. */
function loadBundle() {
  let exports
  globalThis.window = {
    __ModuleLoader__: {
      load: ({ factory }) => {
        exports = factory((name) => (name === 'react' ? react : undefined))
      },
    },
  }
  new Function('window', code)(globalThis.window)
  return exports
}

const { renderPlan } = loadBundle()

const render = (markdown) => expand(renderPlan(markdown))
const types = (tree) => findAll(tree, (node) => typeof node.type === 'string').map((node) => node.type)

test('headings drop one level under the card title', () => {
  const tree = render('# План\n\n## Раздел\n\nТекст.')
  assert.deepEqual(types(tree).filter((type) => /^h\d$/.test(type)), ['h2', 'h3'])
  assert.match(textOf(findAll(tree, (node) => node.type === 'h2')[0]), /План/)
  assert.equal(findAll(tree, (node) => node.type === 'p').length, 1)
})

test('paragraphs split on a blank line and keep their inline spans', () => {
  const tree = render('Первый абзац с `кодом`.\n\nВторой с **жирным** и *курсивом*.')
  const paragraphs = findAll(tree, (node) => node.type === 'p')
  assert.equal(paragraphs.length, 2)
  assert.equal(findAll(tree, (node) => node.type === 'code').length, 1)
  assert.equal(findAll(tree, (node) => node.type === 'strong').length, 1)
  assert.equal(findAll(tree, (node) => node.type === 'em').length, 1)
})

test('bullet and numbered lists keep every item', () => {
  const bullets = render('- один\n- два\n- три')
  assert.equal(findAll(bullets, (node) => node.type === 'ul').length, 1)
  assert.equal(findAll(bullets, (node) => node.type === 'li').length, 3)

  const numbered = render('1. первый\n2. второй')
  assert.equal(findAll(numbered, (node) => node.type === 'ol').length, 1)
  assert.equal(findAll(numbered, (node) => node.type === 'li').length, 2)
})

test('a fenced block stays code, with its language kept', () => {
  const tree = render('```js\nconst a = 1\n```')
  const pre = findAll(tree, (node) => node.type === 'pre')[0]
  assert.ok(pre !== undefined)
  assert.equal(pre.props['data-lang'], 'js')
  assert.match(textOf(pre), /const a = 1/)
})

test('quotes and rules render as themselves', () => {
  const tree = render('> цитата\n\n---')
  assert.equal(findAll(tree, (node) => node.type === 'blockquote').length, 1)
  assert.equal(findAll(tree, (node) => node.type === 'hr').length, 1)
})

test('a link becomes an anchor only under a scheme the browser may load', () => {
  const safe = render('Смотри [документ](https://example.com/x).')
  const anchor = findAll(safe, (node) => node.type === 'a')[0]
  assert.equal(anchor.props.href, 'https://example.com/x')

  const unsafe = render('[жми](javascript:alert(1))')
  assert.equal(findAll(unsafe, (node) => node.type === 'a').length, 0)
  assert.match(textOf(unsafe), /жми/)
})

test('raw markdown is never printed as the document', () => {
  const tree = render('## Раздел\n\n- пункт\n\n```\nкод\n```')
  assert.doesNotMatch(textOf(tree), /##/)
  assert.doesNotMatch(textOf(tree), /```/)
})

test('an unfinished span and an empty plan do not throw', () => {
  assert.match(textOf(render('**не закрыт')), /не закрыт/)
  assert.deepEqual(types(render('')), ['div'])
  assert.deepEqual(types(render(undefined)), ['div'])
})
