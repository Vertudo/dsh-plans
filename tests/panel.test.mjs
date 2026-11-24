/**
 * The shipped client bundle, rendered.
 *
 * The package carries no React, so these tests mount the bundle through the
 * harness in `harness.mjs`: loading state, ready state, a click that hands the
 * plan to the built-in viewer, the refusal of a viewer that cannot take the
 * plan, the outcome filter, and both failures. What they protect is the structure
 * a reader sees — the classes `panel.css` paints — and the rule that the list
 * never draws a plan: the viewer is the only place a plan is read.
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

/** The bundle as the browser module table hands it to the loader. */
function loadBundle() {
  const { react, render } = createReact()
  let exports
  const lookup = (name) => (name === 'react' ? react : undefined)
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

test('a click on a row hands its own plan to the viewer', async () => {
  const { exports, render } = loadBundle()
  const opened = []
  const props = propsOf({ openPlan: (callId) => opened.push(callId) })
  const ready = await mount(render, exports.PlansPanel, props)

  const rows = findAll(ready, (node) => hasClass(node, 'plans-plan-head'))
  assert.equal(rows.length, 4, 'every row is a control')
  assert.equal(rows.every((row) => row.type === 'button'), true, 'the whole row is the button')

  rows[1].props.onClick()
  assert.deepEqual(opened, ['c3'], 'the second row hands over its own plan')
})

test('the list never draws the plan itself', async () => {
  const { exports, render } = loadBundle()
  const props = propsOf()
  const ready = await mount(render, exports.PlansPanel, props)

  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-doc')).length, 0)
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-lite')).length, 0)
  assert.equal(findAll(ready, (node) => node.type === 'pre').length, 0, 'no raw markdown either')
  assert.equal(textOf(ready).includes('Текст плана'), false, 'the plan body stays in the viewer')
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-open-failed')).length, 0, 'nothing failed yet')
})

test('a viewer that refuses the plan says so under the row', async () => {
  const { exports, render } = loadBundle()
  const warned = []
  const original = console.warn
  console.warn = (message) => warned.push(String(message))
  try {
    const props = propsOf({ openPlan: (callId, onFailed) => onFailed(callId, 'an address no type claims') })
    const ready = await mount(render, exports.PlansPanel, props)

    findAll(ready, (node) => hasClass(node, 'plans-plan-head'))[0].props.onClick()
    const after = expand(render(exports.PlansPanel, props).tree)
    assert.equal(findAll(after, (node) => hasClass(node, 'plans-open-failed')).length, 1)
    assert.match(textOf(after), /panel\.openFailed/)
    assert.equal(warned.length, 1, 'the console names the refusal once')
  } finally {
    console.warn = original
  }
})

test('the row is one button with no control inside it', async () => {
  const { exports, render } = loadBundle()
  const props = propsOf()
  const ready = await mount(render, exports.PlansPanel, props)

  const row = findAll(ready, (node) => hasClass(node, 'plans-plan-head'))[0]
  assert.equal(row.type, 'button')
  assert.equal(findAll(row.props?.children, (node) => node.type === 'button').length, 0, 'no button inside a button')
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-plan-toggle')).length, 0, 'no expander left')
  assert.equal(findAll(ready, (node) => hasClass(node, 'plans-plan-open')).length, 0, 'no second control left')
})

test('a plan without a heading keeps its row and its click', async () => {
  const { exports, render } = loadBundle()
  const opened = []
  const props = propsOf({
    openPlan: (callId) => opened.push(callId),
    readPlans: async () => [
      { callId: 'c1', n: 1, title: undefined, status: 'approved', source: 'dsh', time: Date.now(), markdown: 'Без заголовка, но с текстом.' },
    ],
  })
  const ready = await mount(render, exports.PlansPanel, props)

  const rows = findAll(ready, (node) => hasClass(node, 'plans-plan-head'))
  assert.equal(rows.length, 1)
  assert.match(textOf(rows[0]), /panel\.untitled/)
  rows[0].props.onClick()
  assert.deepEqual(opened, ['c1'])
})

test('a chip filters the list without touching the order', async () => {
  const { exports, render } = loadBundle()
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

test('the page keeps the summary and the Session beside the list', async () => {
  const { exports, render } = loadBundle()
  const props = propsOf()
  const page = await mount(render, exports.PlansPage, props)

  assert.equal(findAll(page, (node) => hasClass(node, 'plans-card')).length, 2)
  assert.equal(findAll(page, (node) => hasClass(node, 'plans-tile')).length, 4)
  assert.equal(findAll(page, (node) => hasClass(node, 'plans-plan')).length, 4)
  assert.equal(findAll(page, (node) => hasClass(node, 'plans-plan-head')).length, 4, 'every row is a control')
  assert.equal(findAll(page, (node) => hasClass(node, 'plans-doc')).length, 0, 'the page does not read plans either')
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
