/**
 * The compact surface: the right sidebar pane and the better-sidebar tab.
 *
 * Header, outcome mix, filter chips and the list — in that order, at any width.
 * A row expands in place, so reading a plan never depends on the sidebar
 * registry that hosts the pane.
 */
import { createElement as h, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  FilterChips,
  FilterEmpty,
  IconButton,
  KpiRow,
  PlanCard,
  RefreshIcon,
  SkeletonList,
  SummaryBar,
} from './components.js'
import { countByStatus } from './summary.js'
import { usePlanFilter, usePlans } from './usePlans.js'

export function PlansPanel(props) {
  const { t, sessionId, readPlans, openPlan, openPage } = props
  const { status, plans, error, reload } = usePlans({ sessionId, readPlans })
  const { filter, setFilter, options, visible } = usePlanFilter(plans)
  const [expanded, setExpanded] = useState(null)
  const counts = countByStatus(plans)
  const ready = status === 'ready'

  let body
  if (status === 'loading' && plans.length === 0) body = h(SkeletonList, { t })
  else if (status === 'failed') body = h(ErrorState, { error, onRetry: reload, t })
  else if (ready && plans.length === 0) body = h(EmptyState, { t })
  else if (ready && visible.length === 0) body = h(FilterEmpty, { t, onReset: () => setFilter('all') })
  else {
    body = h('ol', { className: 'plans-list' }, visible.map((plan) => h(PlanCard, {
      key: plan.callId,
      plan,
      open: expanded === plan.callId,
      onToggle: (callId) => setExpanded((current) => (current === callId ? null : callId)),
      onOpen: openPlan,
      onOpenPage: openPage,
      t,
      variant: 'panel',
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
      h(IconButton, { label: t('panel.refresh'), onClick: reload }, h(RefreshIcon)))),
  plans.length > 0 ? h('div', { className: 'plans-summary' }, h(SummaryBar, { counts, t }), h(KpiRow, { counts, t })) : null,
  options.length > 1 ? h(FilterChips, { options, value: filter, onChange: setFilter, t }) : null,
  body)
}
