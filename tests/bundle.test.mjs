/**
 * Smoke test for the shipped client bundle: against a Host-like plugin context
 * it must register the dictionaries, the built-in right-Sidebar tab type and its
 * body, and a tab in `dsh-better-sidebar` when that service is present.
 *
 * The fake follows the Host contracts the live app enforces, not the ones this
 * plugin would like: `ctx.sidebarRightTabs.register` maps the `guide` array
 * (a single object throws there), and a service that was not declared to a
 * block cannot be reached from it. A block that throws is caught where cordis
 * catches it — per injection — so one rejected registration must not take the
 * other surfaces down.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')

const react = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useCallback: (fn) => fn,
  useEffect: () => undefined,
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
}

function loadBundle() {
  let registered
  globalThis.window = {
    __ModuleLoader__: {
      load: ({ id, factory }) => {
        registered = { id, exports: factory((name) => (name === 'react' ? react : undefined)) }
      },
    },
  }
  new Function('window', code)(globalThis.window)
  return registered
}

/**
 * A plugin context that answers like the live one.
 *
 * @param calls - ordered record of everything the bundle asked the Host to do.
 * @param options - which services exist and how they misbehave.
 * @returns the context and the slot registrations, so a test can read the props
 * a surface would receive.
 */
function fakeContext(calls, options = {}) {
  const available = new Set(['locale', 'slots'])
  if (options.tabTypes !== false) available.add('sidebarRightTabs')
  if (options.rightbar !== false) available.add('sidebarRight')
  if (options.betterSidebar === true) available.add('betterSidebar')
  const registered = new Map()
  const ctx = {
    effect(fn, label) {
      calls.push(['effect', label])
      return fn()
    },
    inject(services, callback) {
      calls.push(['inject-service', services.join(',')])
      if (!services.every((service) => available.has(service))) return
      // Cordis catches a throwing injection callback and keeps the rest of the
      // plugin alive; the fake records the failure instead of failing the test.
      try {
        callback(ctx)
      } catch (error) {
        calls.push(['inject-error', services.join(','), error.message])
      }
    },
    get(name) {
      calls.push(['get', name])
      return undefined
    },
    locale: {
      register(namespace, dictionaries) {
        calls.push(['locale', namespace, Object.keys(dictionaries).sort().join(','), Object.keys(dictionaries.en).length, Object.keys(dictionaries.ru).length])
        return () => {}
      },
      bind: () => (key) => key,
    },
    slots: {
      inject(name, factory) {
        calls.push(['inject', name])
        return factory()
      },
      register(entry, component) {
        calls.push(['slot', entry.name, entry.key ?? entry.id, typeof entry.inject, typeof component])
        registered.set(`${entry.name}:${entry.key ?? entry.id}`, { entry, component })
        return () => {}
      },
    },
    sidebarRightTabs: {
      register(definition) {
        // The Host's own validation: sidebar-right/tab-registry.ts maps the array.
        const guide = definition.guide ?? []
        const ids = guide.map((entry) => entry.id)
        calls.push([
          'tabtype',
          definition.id,
          definition.kind,
          definition.priority,
          typeof definition.title,
          ids.join(','),
          guide.map((entry) => entry.order).join(','),
        ])
        return () => {}
      },
    },
    betterSidebar: {
      registerTab(descriptor) {
        calls.push(['better-tab', descriptor.id, descriptor.title, typeof descriptor.description, typeof descriptor.icon, typeof descriptor.component])
        return () => {}
      },
    },
    sidebarRight: options.rightbarApi ?? {
      openResource: (address) => calls.push(['open', address]),
      openTab: (kind) => calls.push(['open-tab', kind]),
    },
  }
  if (options.tabTypeThrows === true) {
    ctx.sidebarRightTabs.register = (definition) => {
      const guide = definition.guide ?? []
      guide.map((entry) => entry.id)
      throw new TypeError('entries.map is not a function')
    }
  }
  if (options.noRemote !== true) {
    ctx.remote = { session: { events: async () => ({ ok: true, value: { cursor: 1, hasMore: false, records: [] } }) } }
  }
  return { ctx, registered }
}

/** The props one registered surface receives, as the slot runtime would build them. */
function propsOf(registered, name, key, sessionId = 'sess-1') {
  const slot = registered.get(`${name}:${key}`)
  assert.ok(slot !== undefined, `${name}:${key} is registered`)
  assert.equal(typeof slot.entry.inject, 'function')
  return slot.entry.inject(sessionId)
}

test('the shipped bundle declares its module-level services', () => {
  const registered = loadBundle()
  assert.equal(registered.id, 'dsh-plans')
  assert.deepEqual(Object.keys(registered.exports).sort(), ['PlansPage', 'PlansPanel', 'TAB_ID', 'apply', 'inject', 'renderPlan'])
  assert.deepEqual(registered.exports.inject, ['locale', 'remote', 'remote.session'])
})

test('registers the dictionaries, the tab type and its body from one guide entry', () => {
  const calls = []
  const { ctx } = fakeContext(calls)
  loadBundle().exports.apply(ctx)

  const locale = calls.find((call) => call[0] === 'locale')
  assert.deepEqual(locale.slice(0, 3), ['locale', 'dsh-plans', 'en,ru'])
  assert.equal(locale[3], locale[4], 'both dictionaries carry the same number of keys')
  assert.ok(locale[3] > 40, 'the dictionaries grew with the page')
  assert.deepEqual(calls.find((call) => call[0] === 'tabtype'), ['tabtype', 'dsh-plans', 'plans', 'extension', 'function', 'plans', '40'])
  assert.deepEqual(calls.find((call) => call[0] === 'slot' && call[1] === 'sidebar.right.pane.tab'), ['slot', 'sidebar.right.pane.tab', 'dsh-plans', 'function', 'function'])
  assert.deepEqual(calls.find((call) => call[0] === 'slot' && call[1] === 'conversation.view'), ['slot', 'conversation.view', 'plans', 'function', 'function'])
  assert.deepEqual(calls.filter((call) => call[0] === 'inject').map((call) => call[1]), ['sidebar.right.pane.tab', 'conversation.view'])
  assert.deepEqual(calls.filter((call) => call[0] === 'inject-service').map((call) => call[1]), [
    'sidebarRight',
    'sidebarRightTabs',
    'slots',
    'betterSidebar',
    'slots',
  ])
  assert.equal(calls.some((call) => call[0] === 'better-tab'), false)
  assert.equal(calls.some((call) => call[0] === 'get'), false, 'no service is reached around its declaration')
})

test('registers a tab in dsh-better-sidebar with a title, description and icon', () => {
  const calls = []
  const { ctx } = fakeContext(calls, { betterSidebar: true })
  loadBundle().exports.apply(ctx)
  assert.deepEqual(calls.find((call) => call[0] === 'better-tab'), [
    'better-tab',
    'dsh-plans:plans',
    'tab.title',
    'function',
    'function',
    'function',
  ])
})

test('the tab still registers when the session remote is missing', () => {
  const calls = []
  const { ctx } = fakeContext(calls, { betterSidebar: true, noRemote: true })
  loadBundle().exports.apply(ctx)
  assert.equal(calls.some((call) => call[0] === 'better-tab'), true)
  assert.equal(calls.some((call) => call[0] === 'tabtype'), true)
})

test('a rejected tab type does not take the tab body down with it', () => {
  const calls = []
  const { ctx } = fakeContext(calls, { tabTypeThrows: true })
  loadBundle().exports.apply(ctx)

  assert.deepEqual(calls.find((call) => call[0] === 'inject-error'), ['inject-error', 'sidebarRightTabs', 'entries.map is not a function'])
  assert.deepEqual(calls.find((call) => call[0] === 'slot' && call[1] === 'sidebar.right.pane.tab'), ['slot', 'sidebar.right.pane.tab', 'dsh-plans', 'function', 'function'])
  assert.deepEqual(calls.find((call) => call[0] === 'slot' && call[1] === 'conversation.view'), ['slot', 'conversation.view', 'plans', 'function', 'function'])
})

test('a panel row hands the plan to the built-in viewer', () => {
  const calls = []
  const { ctx, registered } = fakeContext(calls)
  loadBundle().exports.apply(ctx)
  const props = propsOf(registered, 'sidebar.right.pane.tab', 'dsh-plans')

  assert.equal(props.sessionId, 'sess-1')
  assert.equal(props.canOpenPlan(), true)
  assert.equal(props.canOpenPage(), true)

  const failures = []
  props.openPlan('call-1', (...args) => failures.push(args))
  assert.deepEqual(failures, [])
  assert.deepEqual(calls.find((call) => call[0] === 'open'), ['open', 'dsh-resource://plan/sess-1/call-1'])
})

test('a viewer that refuses the plan reports it instead of swallowing the click', () => {
  const calls = []
  const { ctx, registered } = fakeContext(calls, {
    rightbarApi: {
      openResource: () => {
        throw new Error('an address no type claims')
      },
      openTab: () => {},
    },
  })
  loadBundle().exports.apply(ctx)
  const props = propsOf(registered, 'sidebar.right.pane.tab', 'dsh-plans')

  const failures = []
  props.openPlan('call-2', (...args) => failures.push(args))
  assert.deepEqual(failures, [['call-2', 'an address no type claims']])
})

test('without the built-in Sidebar the card is offered no viewer', () => {
  const calls = []
  const { ctx, registered } = fakeContext(calls, { rightbar: false })
  loadBundle().exports.apply(ctx)
  const props = propsOf(registered, 'sidebar.right.pane.tab', 'dsh-plans')

  assert.equal(props.canOpenPlan(), false)
  assert.equal(props.canOpenPage(), false)
  const failures = []
  props.openPlan('call-3', (...args) => failures.push(args))
  assert.deepEqual(failures, [['call-3', 'no-viewer']])
})

test('the page opens the panel only through the built-in Sidebar', () => {
  const calls = []
  const { ctx, registered } = fakeContext(calls)
  loadBundle().exports.apply(ctx)
  const props = propsOf(registered, 'conversation.view', 'plans')

  assert.equal(props.canOpenPanel(), true)
  props.openPanel()
  assert.deepEqual(calls.find((call) => call[0] === 'open-tab'), ['open-tab', 'plans'])
})

test('every dictionary has the same keys in both languages', async () => {
  const { en, ru } = await import('../src/client/presentation.js')
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort())
})
