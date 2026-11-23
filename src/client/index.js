/**
 * Client half of dsh-plans: a sidebar tab that lists every plan the current
 * Session submitted, newest first, and opens each one.
 *
 * Two target registries exist in the wild:
 *
 * - the built-in right Sidebar (`ctx.sidebarRightTabs` + its slot);
 * - `dsh-better-sidebar` (`ctx.betterSidebar.registerTab`), which draws its own
 *   column and calls the tab component with a Session `scope`.
 *
 * Registration and data access are kept apart on purpose. Registering the tab
 * needs only `locale` (plus `betterSidebar` in that registry), so the pane is
 * always there. Reading the Session needs the `remote` service, which is resolved
 * at call time through the safe `ctx.get` accessor: the cordis proxy refuses
 * service reads without an `inject` scope, and rendering happens outside one.
 * When the remote is missing the pane says so instead of vanishing.
 */
import { createElement as h, useCallback, useEffect, useState } from 'react'
import { planAddress } from '../plans/log.js'
import { readSessionPlans } from './read.js'
import { en, ru } from './presentation.js'

export const TAB_ID = 'dsh-plans'
const TAB_KIND = 'plans'
const BETTER_TAB_ID = 'dsh-plans:plans'
const NS = 'dsh-plans'
const ICON = '📋'

export const inject = []

const STYLE = {
  root: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', height: '100%', boxSizing: 'border-box', overflowY: 'auto', color: 'inherit', fontSize: '13px' },
  head: { display: 'flex', alignItems: 'baseline', gap: '8px', justifyContent: 'space-between' },
  heading: { margin: 0, fontSize: '14px', fontWeight: 600 },
  meta: { display: 'flex', gap: '8px', alignItems: 'baseline', opacity: 0.65, fontSize: '12px' },
  count: { fontVariantNumeric: 'tabular-nums' },
  button: { border: '1px solid currentColor', background: 'transparent', color: 'inherit', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', cursor: 'pointer', opacity: 0.85 },
  list: { display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, padding: 0, listStyle: 'none' },
  row: { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', textAlign: 'left', border: '1px solid currentColor', background: 'transparent', color: 'inherit', borderRadius: '8px', padding: '8px', cursor: 'pointer', opacity: 0.9 },
  rowOpen: { opacity: 1 },
  rowTitle: { fontWeight: 600, lineHeight: 1.3 },
  plan: { margin: '4px 0 0', padding: '8px', borderTop: '1px solid currentColor', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '12px', lineHeight: 1.45, maxHeight: '60vh', overflowY: 'auto' },
  link: { alignSelf: 'flex-start', marginTop: '6px', border: 'none', background: 'transparent', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', padding: 0, opacity: 0.8 },
  note: { opacity: 0.7, margin: 0 },
  error: { margin: 0, padding: '8px', border: '1px dashed currentColor', borderRadius: '8px' },
}

/** The tab glyph, shared by both registries. */
function iconFor(size = 16) {
  return h('span', { style: { fontSize: `${size}px`, lineHeight: 1 }, 'aria-hidden': 'true' }, ICON)
}

/** Resolves a service outside an inject scope, without triggering the proxy guard. */
function serviceOf(ctx, name) {
  try {
    return typeof ctx.get === 'function' ? ctx.get(name) : undefined
  } catch {
    return undefined
  }
}

function sessionRemoteOf(ctx) {
  const session = serviceOf(ctx, 'remote')?.session
  if (session === undefined || session === null) throw new Error('the session remote is unavailable')
  return session
}

function openResourceOf(ctx) {
  const sidebarRight = serviceOf(ctx, 'sidebarRight')
  const open = sidebarRight?.openResource
  return typeof open === 'function' ? open.bind(sidebarRight) : undefined
}

function statusLabel(status, t) {
  if (status === 'approved') return t('panel.approved')
  if (status === 'revise') return t('panel.revise')
  if (status === 'dismissed') return t('panel.dismissed')
  return t('panel.unknown')
}

function timeLabel(time) {
  if (typeof time !== 'number') return ''
  try {
    return new Date(time).toLocaleString()
  } catch {
    return ''
  }
}

export function PlansPanel(props) {
  const { t, sessionId, readPlans, openPlan } = props
  const [attempt, setAttempt] = useState(0)
  const [expanded, setExpanded] = useState(null)
  const [state, setState] = useState({ status: 'loading', plans: [], error: undefined })
  const refresh = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (typeof sessionId !== 'string' || sessionId === '' || typeof readPlans !== 'function') {
      setState({ status: 'failed', plans: [], error: 'no session' })
      return undefined
    }
    let alive = true
    const controller = new AbortController()
    setState((current) => ({ status: 'loading', plans: current.plans, error: undefined }))
    readPlans(controller.signal).then(
      (plans) => {
        if (alive) setState({ status: 'ready', plans, error: undefined })
      },
      (error) => {
        if (alive && !controller.signal.aborted) setState({ status: 'failed', plans: [], error: String(error?.message ?? error) })
      },
    )
    return () => {
      alive = false
      controller.abort()
    }
  }, [sessionId, readPlans, attempt])

  const rows = state.plans.map((plan) => {
    const open = expanded === plan.callId
    const meta = [
      h('span', { key: 'n' }, `#${plan.n}`),
      h('span', { key: 'status' }, statusLabel(plan.status, t)),
    ]
    if (plan.source === 'claude') meta.push(h('span', { key: 'src' }, t('panel.imported')))
    const time = timeLabel(plan.time)
    if (time !== '') meta.push(h('span', { key: 'time' }, time))

    const body = [
      h('span', { key: 'title', style: STYLE.rowTitle }, plan.title ?? t('panel.untitled', { n: plan.n })),
      h('span', { key: 'meta', style: STYLE.meta }, meta),
    ]
    if (open) {
      body.push(h('pre', { key: 'plan', style: STYLE.plan }, plan.markdown))
      if (typeof openPlan === 'function') {
        body.push(h('button', {
          key: 'native',
          type: 'button',
          style: STYLE.link,
          onClick: (event) => {
            event.stopPropagation()
            openPlan(plan.callId)
          },
        }, t('panel.open')))
      }
    }

    return h('li', { key: plan.callId },
      h('button', {
        type: 'button',
        style: open ? { ...STYLE.row, ...STYLE.rowOpen } : STYLE.row,
        'aria-expanded': open ? 'true' : 'false',
        onClick: () => setExpanded((current) => (current === plan.callId ? null : plan.callId)),
      }, body),
    )
  })

  let body
  if (state.status === 'loading' && state.plans.length === 0) body = h('p', { style: STYLE.note }, t('panel.loading'))
  else if (state.status === 'failed') {
    body = h('div', { style: STYLE.list, role: 'alert' },
      h('p', { style: STYLE.error }, t('panel.error', { message: state.error ?? '' })),
      h('button', { type: 'button', style: STYLE.button, onClick: refresh }, t('panel.retry')),
    )
  } else if (state.plans.length === 0) {
    body = h('div', { style: STYLE.list },
      h('p', { style: STYLE.note }, t('panel.empty')),
      h('p', { style: STYLE.note }, t('panel.emptyHint')),
    )
  } else body = h('ul', { style: STYLE.list }, rows)

  return h('div', { style: STYLE.root, 'data-dsh-plans-panel': 'true' },
    h('div', { style: STYLE.head },
      h('h2', { style: STYLE.heading }, t('panel.heading')),
      h('span', { style: STYLE.meta },
        h('span', { style: STYLE.count }, String(state.plans.length)),
        h('button', { type: 'button', style: STYLE.button, onClick: refresh }, t('panel.refresh')),
      ),
    ),
    body,
  )
}

export function apply(ctx) {
  ctx.inject(['locale'], (scoped) => {
    scoped.effect(() => scoped.locale.register(NS, { en, ru }), 'dsh-plans: dictionaries')
  })

  ctx.inject(['locale', 'sidebarRightTabs', 'slots'], (scoped) => {
    const t = scoped.locale.bind(NS)

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: TAB_ID,
      kind: TAB_KIND,
      priority: 'extension',
      title: () => t('tab.title'),
      guide: {
        order: 40,
        title: () => t('guide.title'),
        description: () => t('guide.description'),
        icon: iconFor,
      },
    }), 'dsh-plans: tab type')

    scoped.effect(() => scoped.slots.inject('sidebar.right.pane.tab', () => scoped.slots.register({
      name: 'sidebar.right.pane.tab',
      key: TAB_ID,
      locale: NS,
      inject: (owner) => {
        const sessionId = typeof owner === 'string' ? owner : owner?.sessionId
        return {
          sessionId,
          readPlans: (signal) => readSessionPlans(sessionRemoteOf(ctx), sessionId, signal),
          openPlan: (callId) => {
            const open = openResourceOf(ctx)
            if (open !== undefined) open(planAddress(sessionId, callId))
          },
        }
      },
    }, PlansPanel)), 'dsh-plans: tab body')
  })

  ctx.inject(['locale', 'betterSidebar'], (scoped) => {
    const t = scoped.locale.bind(NS)

    scoped.effect(() => scoped.betterSidebar.registerTab({
      id: BETTER_TAB_ID,
      // A plain string: the registry stores the chip title as text.
      title: t('tab.title'),
      description: () => t('guide.description'),
      icon: iconFor,
      component: (props) => {
        const sessionId = props?.scope?.sessionId
        return h(PlansPanel, {
          t,
          sessionId,
          readPlans: (signal) => readSessionPlans(sessionRemoteOf(ctx), sessionId, signal),
          openPlan: (callId) => {
            const open = openResourceOf(ctx)
            if (open !== undefined) open(planAddress(sessionId, callId))
          },
        })
      },
    }), 'dsh-plans: better-sidebar tab')
  })
}
