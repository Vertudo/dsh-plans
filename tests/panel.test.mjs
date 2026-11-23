/**
 * The shipped client bundle, rendered.
 *
 * The package carries no React, so these tests mount the bundle through the
 * harness in `harness.mjs`: loading state, ready state, reading a plan in place,
 * the viewer hand-off when the host renderer is missing, the outcome filter, and
 * both failures. What they protect is the structure a reader sees — the classes
 * `panel.css` paints, and that no raw markdown is ever printed.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReact, expand, findAll, flush, hasClass, textOf } from './harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')

const hoursAgo = (hours) => Date.now() - hours * 3_600_000

const plans = [
  { callId: 'c4', n: 4, title: 'Утверждённый план', status: 'approved', source: 'dsh', time: hoursAgo(1), markdown: '# Утверждённый план\n\nТекст плана.' },
  { callId: 'c3', n: 3, title: 'План на доработке', status: 'revise', source: 'dsh', time: hoursAgo(2), markdown: '# План на доработке', feedback: 'Переделать сводку.' },
  { callId: 'c2', n: 2, title: 'Отклонённый план', status: 'dismissed', source: 'claude', time: hoursAgo(3), markdown: '# Отклонённый план' },
  { callId: 'c1', n: 1, title: 'Старый план', status: 'dismissed', source: 'dsh', time: hoursAgo(4), markdown: '# Старый план' },
]

const t = (key) => key

/** The host's markdown module as the browser table would hand it over. */
const hostPrimitives = {
  MarkdownText: (props) => ({ type: 'div', props: { className: 'fake-markdown', children: props.text } }),
}

function loadBundle(options = {}) {
  const { react, render } = createReact()
  let exports
  const lookup = (name) => {
    if (name === 'react') return react
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return options.primitives
    return undefined
  }
  globalThis.window = {
    __ModuleLoader__: {
      load: ({ factory }) => {
        exports = factory(lookup)
      },
    },
  }
  new Function('window', code)(globalThis.window)
  return { exports, render }
}

function propsOf(overrides = {}) {
  return {
    t,
    sessionId: 'sess-1',
    readPlans: async () => plans,
    openPlan: () => {},
    openPage: () => {},
    openPanel: () => {},
    ...overrides,
  }
}

/** First render starts the read; the second one sees what it wrote. */
async function mount(render, Component, props) {
  render(Component, props)
  await flush()
  return expand(render(Component, props).tree)
}

test('the panel reads first: skeletons, then four rows with their outcomes', async () => {
  const { exports, render } = loadBundle()
  const props = propsOf()

  const loading = expand(render(exports.PlansPanel, props).tree)
  assert.equal(findAll(loading, (node) => hasClass(node, 'plans-skeleton')).length, 1)
  assert.equal(findAll(loading, (node) => hasClass(node, 'plans-plan')).length, 0)

  await flush()
  const ready = expand(render(exports.PlansPanel, props).tree)
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-plan')).length, 4)
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-count')).length, 1)
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-bar-seg')).length, 3, 'approved, revise and dismissed fill the bar')
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-chip')).length, 4, '"all" plus the three outcomes')
})

test('with the host renderer a click reads the plan in place, feedback included', async () => {
  const { exports, render } = loadBundle({ primitives: hostPrimitives })
  const props = propsOf()
  const ready = await mount(render, exports.PlansPanel, props)

  findAll(ready, (node) => hasClass(node, 'plans-plan-head'))[1].props.onClick()
  const opened = expand(render(exports.PlansPanel, props).tree)

  assert.equal(findAll(opened, (node) => hasClass(node, 'plans-plan--open')).length, 1)
  assert.equal(findAll(opened, (node) => hasClass(node, 'fake-markdown')).length, 1)
  assert.equal(findAll(opened, (node) => node.type === 'pre').length, 0, 'markdown is never printed as raw text')
  assert.match(textOf(opened), /Переделать сводку/)
  assert.equal(findAll(opened, (node) => hasClass(node, 'plans-feedback')).length, 1)
})

test('without the host renderer a click opens the viewer and prints no markdown', async () => {
  const { exports, render } = loadBundle()
  const opened = []
  const props = propsOf({ openPlan: (callId) => opened.push(callId) })
  const ready = await mount(render, exports.PlansPanel, props)

  findAll(ready, (node) => hasClass(node, 'plans-plan-head'))[1].props.onClick()
  const after = expand(render(exports.PlansPanel, props).tree)

  assert.deepEqual(opened, ['c3'])
  assert.equal(findAll(after, (node) => hasClass(node, 'plans-plan--open')).length, 0)
  assert.equal(findAll(after, (node) => hasClass(node, 'plans-doc')).length, 0)
  assert.equal(findAll(after, (node) => node.type === 'pre').length, 0)
  assert.equal(findAll(after, (node) => hasClass(node, 'plans-plan')).length, 4, 'the rows stay')
})

test('a chip filters the list without touching the order', async () => {
  const { exports, render } = loadBundle({ primitives: hostPrimitives })
  const props = propsOf()
  const ready = await mount(render, exports.PlansPanel, props)

  const chips = findAll(ready, (node) => hasClass(node, 'plans-chip'))
  const approved = chips.find((chip) => textOf(chip).includes('status.approved'))
  approved.props.onClick()
  const filtered = expand(render(exports.PlansPanel, props).tree)

  const rows = findAll(filtered, (node) => hasClass(node, 'plans-plan'))
  assert.equal(rows.length, 1, 'one plan of the four is approved')
  assert.match(textOf(rows[0]), /Утверждённый план/)
})

test('the page opens the newest plan and keeps the summary and the Session beside it', async () => {
  const { exports, render } = loadBundle({ primitives: hostPrimitives })
  const props = propsOf()
  const page = await mount(render, exports.PlansPage, props)

  assert.equal(findAll(page, (node) => hasClass(node, 'plans-card')).length, 2)
  assert.equal(findAll(page, (node) => hasClass(node, 'plans-tile')).length, 4)
  const open = findAll(page, (node) => hasClass(node, 'plans-plan--open'))
  assert.equal(open.length, 1)
  assert.match(textOf(open[0]), /Утверждённый план/)
})

test('a failed read shows the alert and a retry, not an empty list', async () => {
  const { exports, render } = loadBundle()
  const props = propsOf({ readPlans: async () => { throw new Error('boom') } })
  const failed = await mount(render, exports.PlansPanel, props)

  assert.equal(findAll(failed, (node) => hasClass(node, 'plans-error')).length, 1)
  assert.equal(findAll(failed, (node) => hasClass(node, 'plans-skeleton')).length, 0)
  assert.match(textOf(failed), /boom/)
})

test('a pane without a Session says so instead of failing silently', async () => {
  const { exports, render } = loadBundle()
  const props = propsOf({ sessionId: undefined })
  const tree = await mount(render, exports.PlansPanel, props)
  assert.match(textOf(tree), /error\.title\.session/)
})
