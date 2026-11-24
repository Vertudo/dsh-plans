/**
 * The wide surface: a center-column view beside Chat and Trajectory.
 *
 * Two columns on a wide pane — the list on the left, the outcome mix and the
 * Session under it on the right — and one column when the column gets narrow.
 * A row opens its plan in the built-in viewer; the page lists plans and never
 * draws one.
 */
import { createElement as h, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  FilterChips,
  FilterEmpty,
  PlanCard,
  RefreshIcon,
  SkeletonList,
  SummaryBar,
  localeName,
  opens,
} from './components.js'
import { STATUS_ORDER, clockTime, countByStatus, dayLabel, timeLabel } from './summary.js'
import { usePlanFilter, usePlans } from './usePlans.js'

/** One line per refusal in the console; the reader gets the visible line instead. */
function warnOpenFailed(callId, reason) {
  if (typeof console === 'object' && console !== null && typeof console.warn === 'function') {
    console.warn(`dsh-plans: the plan ${callId} did not reach the viewer — ${reason}`)
  }
}

function Tile({ status, count, t }) {
  const tone = status === 'approved' ? ' plans-tile--ok' : status === 'revise' ? ' plans-tile--warn' : ''
  return h('div', { className: `plans-tile${tone}` },
    h('b', null, String(count)),
    h('span', null, t(`summary.${status}`)))
}

function SummaryCard({ counts, t }) {
  return h('section', { className: 'plans-card' },
    h('div', { className: 'plans-card-head' },
      h('span', { className: 'plans-card-title' }, t('summary.title')),
      h('span', { className: 'plans-card-note' }, t('summary.total', { count: counts.total }))),
    h('div', { className: 'plans-tiles' }, STATUS_ORDER.map((status) => h(Tile, { key: status, status, count: counts[status] ?? 0, t }))),
    h(SummaryBar, { counts, t }),
    h('p', { className: 'plans-note' }, t('summary.note')))
}

function SessionCard({ plans, sessionId, now, locale, t }) {
  const first = plans[plans.length - 1]
  const last = plans[0]
  const imported = plans.filter((plan) => plan.source === 'claude').length
  const dayLabels = { today: t('time.today'), yesterday: t('time.yesterdayShort') }
  const range = `${dayLabel(first.time, now, locale, dayLabels)} — ${dayLabel(last.time, now, locale, dayLabels)}`
  const shortId = sessionId.length > 8 ? `${sessionId.slice(0, 8)}…` : sessionId
  const rows = [
    ['id', t('page.session.id'), h('code', null, shortId)],
    ['range', t('page.session.plans'), range],
    ['imported', t('page.session.imported'), String(imported)],
    ['first', t('page.session.first'), `#${first.n} · ${timeLabel(first.time, now, locale, t('time.yesterday'))}`],
  ]
  return h('section', { className: 'plans-card' },
    h('div', { className: 'plans-card-head' },
      h('span', { className: 'plans-card-title' }, t('page.session')),
      h('span', { className: 'plans-card-note' }, t('page.session.readonly'))),
    h('dl', { className: 'plans-rows' }, rows.map(([key, label, value]) => h('div', { key, className: 'plans-row' },
      h('dt', null, label),
      h('dd', null, value)))),
    h('p', { className: 'plans-note' }, t('page.session.note')))
}

export function PlansPage(props) {
  const { t, sessionId, readPlans, openPlan, openPanel, canOpenPanel } = props
  const { status, plans, error, loadedAt, reload } = usePlans({ sessionId, readPlans })
  const { filter, setFilter, options, visible } = usePlanFilter(plans)
  const [failed, setFailed] = useState(null)
  const counts = countByStatus(plans)
  const ready = status === 'ready'
  const now = Date.now()
  const locale = localeName()

  const failOpen = (callId, reason) => {
    setFailed(callId)
    warnOpenFailed(callId, reason)
  }

  const sub = [h('span', { key: 's' }, t('page.subtitle'))]
  if (typeof loadedAt === 'number') {
    sub.push(h('span', { key: 'sep', className: 'plans-sep', 'aria-hidden': 'true' }, '·'))
    sub.push(h('span', { key: 'u' }, t('page.updated', { time: clockTime(loadedAt) })))
  }

  let body
  if (status === 'loading' && plans.length === 0) body = h(SkeletonList, { t })
  else if (status === 'failed') body = h(ErrorState, { error, onRetry: reload, t })
  else if (ready && plans.length === 0) body = h(EmptyState, { t })
  else if (ready && visible.length === 0) body = h(FilterEmpty, { t, onReset: () => setFilter('all') })
  else {
    body = h('ol', { className: 'plans-list' }, visible.map((plan) => h(PlanCard, {
      key: plan.callId,
      plan,
      onOpen: typeof openPlan === 'function' ? (callId) => {
        setFailed(null)
        openPlan(callId, failOpen)
      } : undefined,
      openFailed: failed === plan.callId,
      t,
    })))
  }

  const aside = plans.length > 0
    ? h('aside', { className: 'plans-side' },
      h(SummaryCard, { counts, t }),
      h(SessionCard, { plans, sessionId, now, locale, t }))
    : null

  return h('div', { className: 'plans plans-page', 'data-dsh-plans-page': 'true', 'aria-busy': status === 'loading' ? 'true' : 'false' },
    h('header', { className: 'plans-head' },
      h('div', { className: 'plans-head-text' },
        h('h1', { className: 'plans-title' }, h('span', { className: 'plans-title-text' }, t('view.title'))),
        h('p', { className: 'plans-sub' }, sub)),
      h('div', { className: 'plans-head-actions' },
        h('button', { key: 'reload', type: 'button', className: 'plans-btn', onClick: reload },
          h(RefreshIcon),
          t('panel.refresh')),
        opens(openPanel, canOpenPanel)
          ? h('button', { key: 'panel', type: 'button', className: 'plans-btn plans-btn--quiet', onClick: openPanel }, t('page.openInPanel'))
          : null)),
    h('div', { className: aside === null ? 'plans-page-grid plans-page-grid--single' : 'plans-page-grid' },
      h('main', { className: 'plans-page-list' },
        options.length > 1 ? h(FilterChips, { options, value: filter, onChange: setFilter, t }) : null,
        body),
      aside))
}
