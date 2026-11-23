/**
 * Client half of dsh-plans: a right-sidebar tab that lists every plan the
 * current Session submitted, newest first, and opens each one in the built-in
 * plan tab.
 *
 * The panel is a reader of the Session log, not a viewer of its own: clicking a
 * row opens `dsh-resource://plan/<session>/<callId>`, an address the shipped
 * `@deepseek-ai/dsh-client-ui-plan` type claims and renders.
 */
import { createElement as h, useCallback, useEffect, useState } from 'react'
import { planAddress } from '../plans/log.js'
import { readSessionPlans } from './read.js'
import { en, ru } from './presentation.js'

export const TAB_ID = 'dsh-plans'
const TAB_KIND = 'plans'
const NS = 'dsh-plans'

export const inject = ['slots', 'locale', 'remote', 'sidebarRight', 'sidebarRightTabs']

const STYLE = {
  root: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', height: '100%', boxSizing: 'border-box', overflowY: 'auto', color: 'inherit', fontSize: '13px' },
  head: { display: 'flex', alignItems: 'baseline', gap: '8px', justifyContent: 'space-between' },
  heading: { margin: 0, fontSize: '14px', fontWeight: 600 },
  count: { opacity: 0.6, fontVariantNumeric: 'tabular-nums' },
  button: { border: '1px solid currentColor', background: 'transparent', color: 'inherit', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', cursor: 'pointer', opacity: 0.85 },
  list: { display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, padding: 0, listStyle: 'none' },
  row: { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', textAlign: 'left', border: '1px solid currentColor', background: 'transparent', color: 'inherit', borderRadius: '8px', padding: '8px', cursor: 'pointer', opacity: 0.9 },
  rowTitle: { fontWeight: 600, lineHeight: 1.3 },
  meta: { display: 'flex', gap: '8px', alignItems: 'baseline', opacity: 0.65, fontSize: '12px' },
  note: { opacity: 0.7, margin: 0 },
  error: { color: 'inherit', opacity: 0.9, margin: 0, padding: '8px', border: '1px dashed currentColor', borderRadius: '8px' },
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
  const { t, sessionId, readPlans: read, openPlan } = props
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', plans: [], error: undefined })
  const refresh = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (typeof sessionId !== 'string' || sessionId === '' || typeof read !== 'function') {
      setState({ status: 'failed', plans: [], error: 'no session' })
      return undefined
    }
    let alive = true
    const controller = new AbortController()
    setState((current) => ({ status: 'loading', plans: current.plans, error: undefined }))
    read(controller.signal).then(
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
  }, [sessionId, read, attempt])

  const rows = state.plans.map((plan) => h(
    'li',
    { key: plan.callId },
    h('button', {
      type: 'button',
      style: STYLE.row,
      title: t('panel.open'),
      onClick: () => openPlan(plan.callId),
    },
      h('span', { style: STYLE.rowTitle }, plan.title ?? t('panel.untitled', { n: plan.n })),
      h('span', { style: STYLE.meta },
        h('span', null, `#${plan.n}`),
        h('span', null, statusLabel(plan.status, t)),
        plan.source === 'claude' ? h('span', null, t('panel.imported')) : null,
        timeLabel(plan.time) === '' ? null : h('span', null, timeLabel(plan.time)),
      ),
    ),
  ))

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
  ctx.effect(() => ctx.locale.register(NS, { en, ru }), 'dsh-plans: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: 'extension',
    title: () => t('tab.title'),
    guide: {
      order: 40,
      title: () => t('guide.title'),
      description: () => t('guide.description'),
    },
  }), 'dsh-plans: tab type')

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: TAB_ID,
    locale: NS,
    inject: (owner) => {
      const sessionId = typeof owner === 'string' ? owner : owner?.sessionId
      return {
        sessionId,
        readPlans: (signal) => readSessionPlans(ctx.remote.session, sessionId, signal),
        openPlan: (callId) => ctx.sidebarRight.openResource(planAddress(sessionId, callId)),
      }
    },
  }, PlansPanel)), 'dsh-plans: tab body')
}
