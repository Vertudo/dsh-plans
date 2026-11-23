/**
 * A minimal renderer for the shipped client bundle.
 *
 * The package has no React dependency on purpose, so the tests cannot mount the
 * real library. This harness stands in for it: hooks keep their cells between
 * renders, effects run when their dependencies change, and the tree is expanded
 * into plain objects a test can search. Enough to click a row and see the plan
 * body appear — not a React implementation, and it never pretends to be.
 */

/** `react` as the bundle's module loader would hand it over. */
export function createReact() {
  const state = { cells: [], effects: [], deps: [], pending: [], cursor: 0 }

  const react = {
    createElement(type, props, ...children) {
      const own = { ...(props ?? {}) }
      if (children.length === 1) own.children = children[0]
      else if (children.length > 1) own.children = children
      return { type, props: own }
    },
    useState(initial) {
      const index = state.cursor++
      if (!(index in state.cells)) state.cells[index] = typeof initial === 'function' ? initial() : initial
      return [state.cells[index], (value) => {
        state.cells[index] = typeof value === 'function' ? value(state.cells[index]) : value
      }]
    },
    useEffect(effect, deps) {
      const index = state.cursor++
      state.effects[index] = effect
      if (sameDeps(state.deps[index], deps)) return
      state.deps[index] = deps
      state.pending.push(effect)
    },
    useCallback(callback) {
      state.cursor++
      return callback
    },
  }

  /** Renders one component and runs the effects whose dependencies moved. */
  function render(component, props) {
    state.cursor = 0
    state.pending = []
    const tree = component(props)
    const cleanups = []
    for (const effect of state.pending) {
      const cleanup = effect()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    }
    state.pending = []
    return { tree, cleanups }
  }

  return { react, render }
}

function sameDeps(previous, next) {
  if (previous === undefined || next === undefined) return false
  if (previous.length !== next.length) return false
  return previous.every((value, index) => Object.is(value, next[index]))
}

/** Lets the state a promise writes settle, so the next render sees it. */
export async function flush() {
  for (let round = 0; round < 4; round += 1) await Promise.resolve()
}

/** Expands function components into the tree a test can search. */
export function expand(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (Array.isArray(node)) return node.map(expand).filter((child) => child !== null)
  if (typeof node !== 'object') return node
  const { type, props } = node
  if (typeof type === 'function') return expand(type(props))
  return { ...node, props: { ...props, children: expand(props?.children ?? null) } }
}

export function walk(node, visit) {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node !== 'object') return
  visit(node)
  walk(node.props?.children ?? null, visit)
}

export function hasClass(node, name) {
  const value = node?.props?.className
  return typeof value === 'string' && value.split(/\s+/).includes(name)
}

export function findAll(tree, predicate) {
  const found = []
  walk(tree, (node) => {
    if (predicate(node)) found.push(node)
  })
  return found
}

/** Every string below a node, joined — for assertions on rendered copy. */
export function textOf(node) {
  const parts = []
  const visit = (value) => {
    if (value === null || value === undefined || typeof value === 'boolean') return
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(String(value))
      return
    }
    if (Array.isArray(value)) {
      for (const child of value) visit(child)
      return
    }
    if (typeof value !== 'object') return
    visit(value.props?.children)
  }
  visit(node)
  return parts.join(' ')
}
