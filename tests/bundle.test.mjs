/**
 * Smoke test for the shipped client bundle: it must register the tab type, the
 * tab body and both dictionaries against a Host-like plugin context.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(here, '..', 'lib/client.js'), 'utf8')

const react = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useCallback: (fn) => fn,
  useEffect: () => undefined,
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
}

function loadBundle() {
  const calls = []
  let registered
  globalThis.window = {
    __ModuleLoader__: {
      load: ({ id, factory }) => {
        registered = { id, exports: factory((name) => (name === 'react' ? react : undefined)) }
      },
    },
  }
  new Function('window', code)(globalThis.window)
  return { calls, registered }
}

function fakeContext(calls) {
  return {
    effect(fn, label) {
      calls.push(['effect', label])
      return fn()
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
        calls.push(['slot', entry.name, entry.key, typeof entry.inject, typeof component])
        return () => {}
      },
    },
    sidebarRightTabs: {
      register(definition) {
        calls.push(['tabtype', definition.id, definition.kind, definition.priority, typeof definition.title, definition.guide?.order])
        return () => {}
      },
    },
    sidebarRight: { openResource: (address) => calls.push(['open', address]) },
    remote: { session: { events: async () => ({ ok: true, value: { cursor: 1, hasMore: false, records: [] } }) } },
  }
}

test('the shipped bundle mounts and registers the tab type, body and dictionaries', () => {
  const { registered } = loadBundle()
  assert.equal(registered.id, 'dsh-plans')
  assert.deepEqual(Object.keys(registered.exports).sort(), ['PlansPanel', 'TAB_ID', 'apply', 'inject'])
  assert.deepEqual(registered.exports.inject, ['slots', 'locale', 'remote', 'sidebarRight', 'sidebarRightTabs'])

  const calls = []
  registered.exports.apply(fakeContext(calls))

  const locale = calls.find((call) => call[0] === 'locale')
  assert.deepEqual(locale, ['locale', 'dsh-plans', 'en,ru', 19, 19])

  const tabType = calls.find((call) => call[0] === 'tabtype')
  assert.deepEqual(tabType, ['tabtype', 'dsh-plans', 'plans', 'extension', 'function', 40])

  const slot = calls.find((call) => call[0] === 'slot')
  assert.deepEqual(slot, ['slot', 'sidebar.right.pane.tab', 'dsh-plans', 'function', 'function'])

  assert.deepEqual(calls.filter((call) => call[0] === 'inject').map((call) => call[1]), ['sidebar.right.pane.tab'])
})

test('every dictionary has the same keys in both languages', async () => {
  const { en, ru } = await import('../src/client/presentation.js')
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort())
})
