/**
 * The compact surface: the right sidebar pane and the better-sidebar tab.
 *
 * Header, outcome mix, filter chips and the list — in that order, at any width.
 * A row is a button that hands its plan to the built-in viewer; the pane does
 * not read plans itself.
 *
 * The viewer may be missing: when the pane cannot reach the built-in Sidebar,
 * the row still answers and prints one line under itself instead of swallowing
 * the click. The link to the page beside Chat moves into the header, because a
 * row no longer has a body to carry it.
 */
import { createElement as h, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  FilterChips,
  FilterEmpty,
  IconButton,
  KpiRow,
  OpenIcon,
  PlanCard,
  RefreshIcon,
  SkeletonList,
  SummaryBar,
  opens,
} from './components.js'
import { countByStatus } from './summary.js'
import { usePlanFilter, usePlans } from './usePlans.js'

/** One line per refusal in the console; the reader gets the visible line instead. */
function warnOpenFailed(callId, reason) {
  if (typeof console === 'object' && console !== null && typeof console.warn === 'function') {
    console.warn(`dsh-plans: the plan ${callId} did not reach the viewer — ${reason}`)
  }
}

export function PlansPanel(props) {
  const { t, sessionId, readPlans, openPlan, openPage, canOpenPage } = props
  const { status, plans, error, reload } = usePlans({ sessionId, readPlans })
  const { filter, setFilter, options, visible } = usePlanFilter(plans)
  const [failed, setFailed] = useState(null)
  const counts = countByStatus(plans)
  const ready = status === 'ready'

  const failOpen = (callId, reason) => {
    setFailed(callId)
    warnOpenFailed(callId, reason)
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

  return h('div', {
    className: 'plans plans--panel',
    'data-dsh-plans-panel': 'true',
    'aria-busy': status === 'loading' ? 'true' : 'false',
  },
  h('div', { className: 'plans-head' },
    h('h2', { className: 'plans-title' },
      h('span', { className: 'plans-title-text' }, t('tab.title')),
      plans.length > 0 ? h('span', { className: 'plans-count' }, String(plans.length)) : null),
    h('div', { className: 'plans-head-actions' },
      opens(openPage, canOpenPage) ? h(IconButton, {
        label: t('panel.openPage'),
        onClick: openPage,
      }, h(OpenIcon)) : null,
      h(IconButton, { label: t('panel.refresh'), onClick: reload }, h(RefreshIcon)))),
  plans.length > 0 ? h('div', { className: 'plans-summary' }, h(SummaryBar, { counts, t }), h(KpiRow, { counts, t })) : null,
  options.length > 1 ? h(FilterChips, { options, value: filter, onChange: setFilter, t }) : null,
  body)
}
