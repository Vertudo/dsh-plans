/**
 * The pane's and the page's building blocks.
 *
 * Plain `createElement` calls over the class names in `panel.css`: nothing here
 * reaches for a host service, so the same piece renders in a sidebar pane, in
 * the bottom workbench and in a center-column view.
 *
 * A plan is never drawn here. The list says which plans exist and the built-in
 * viewer says what a plan contains; a click hands the plan over and a refusal is
 * printed under the row.
 */
import { createElement as h } from 'react'
import { segments, timeLabel } from './summary.js'

const TONE = { approved: 'ok', revise: 'warn', dismissed: 'dismissed', unknown: 'unknown' }

/** Which colour a row's outcome takes. */
export function toneOf(status) {
  return TONE[status] ?? 'unknown'
}

/**
 * Whether an action can really run.
 *
 * A callback alone is not an answer: the surfaces hand over openers that exist
 * only when the built-in right Sidebar does, so the owner passes a getter too and
 * the component asks it. Without a getter the callback decides, which keeps
 * renderers that supply a plain stub working.
 */
export function opens(action, can) {
  if (typeof action !== 'function') return false
  return typeof can === 'function' ? can() === true : true
}

/** The interface language for dates; the host locale service is not on this path. */
export function localeName() {
  try {
    return typeof navigator === 'object' && typeof navigator.language === 'string' && navigator.language !== ''
      ? navigator.language
      : 'en'
  } catch {
    return 'en'
  }
}

function icon(children, props = {}) {
  return h('svg', {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    'aria-hidden': 'true',
    ...props,
  }, children)
}

export function RefreshIcon(props) {
  return icon([
    h('path', { key: 'arc', d: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9' }),
    h('path', { key: 'head', d: 'M13.5 2.5V5.5H10.5' }),
  ], props)
}

/** Open a plan somewhere else: a frame with an arrow out of it. */
export function OpenIcon(props) {
  return icon([
    h('path', { key: 'frame', d: 'M12.5 9v2.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 11.5v-6A1.5 1.5 0 0 1 4.5 4H7' }),
    h('path', { key: 'corner', d: 'M9.5 2.5h4v4' }),
    h('path', { key: 'diagonal', d: 'M6.5 9.5 13.4 2.6' }),
  ], props)
}

export function PlanIcon() {
  return h('svg', {
    viewBox: '0 0 24 24',
    width: 26,
    height: 26,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    'aria-hidden': 'true',
  }, [
    h('rect', { key: 'frame', x: 4, y: 3.5, width: 16, height: 17, rx: 2.5 }),
    h('path', { key: 'lines', d: 'M8 8h8M8 12h8M8 16h5' }),
  ])
}

export function IconButton({ label, onClick, children }) {
  return h('button', {
    type: 'button',
    className: 'plans-icon-btn',
    title: label,
    'aria-label': label,
    onClick,
  }, children)
}

export function StatusDot({ status }) {
  return h('i', { className: `plans-dot plans-dot--${toneOf(status)}`, 'aria-hidden': 'true' })
}

export function Outcome({ status, t }) {
  const known = TONE[status] === undefined ? 'unknown' : status
  return h('span', { className: `plans-outcome plans-outcome--${toneOf(status)}` }, t(`outcome.${known}`))
}

export function SummaryBar({ counts, t }) {
  const parts = segments(counts)
  const partsLabel = parts.map((part) => `${t(`summary.${part.status}`)} ${part.count}`).join(', ')
  return h('div', {
    className: 'plans-bar',
    role: 'img',
    'aria-label': t('summary.aria', { parts: partsLabel }),
  }, parts.map((part) => h('i', {
    key: part.status,
    className: `plans-bar-seg plans-bar-seg--${toneOf(part.status)}`,
    style: { flexGrow: part.count },
  })))
}

export function KpiRow({ counts, t }) {
  return h('ul', { className: 'plans-kpis' }, segments(counts).map((part) => h('li', {
    key: part.status,
    className: 'plans-kpi',
  },
  h('i', { className: `plans-legend-dot plans-legend-dot--${toneOf(part.status)}`, 'aria-hidden': 'true' }),
  h('b', null, String(part.count)),
  t(`summary.${part.status}`))))
}

export function FilterChips({ options, value, onChange, t }) {
  return h('nav', { className: 'plans-filters', 'aria-label': t('filters.aria') },
    options.map((option) => h('button', {
      key: option.id,
      type: 'button',
      className: 'plans-chip',
      'aria-pressed': option.id === value ? 'true' : 'false',
      onClick: () => onChange(option.id),
    }, t(`status.${option.id}`), h('span', null, String(option.count)))))
}

/**
 * One plan. The whole row is a single button: it hands the plan to the built-in
 * viewer, which is where a plan is read. Nothing is drawn in place and nothing
 * expands, so a long plan never has to be scrolled through to be reached.
 *
 * The viewer can refuse the plan — no right Sidebar, no tab type claiming the
 * address, a plan the viewer cannot resolve — and the refusal prints under the
 * row instead of leaving the click unanswered.
 */
export function PlanCard({ plan, onOpen, openFailed, t }) {
  const meta = [h('span', { key: 'n' }, `#${plan.n}`)]
  const separator = (key) => h('span', { key: `sep-${key}`, className: 'plans-sep', 'aria-hidden': 'true' }, '·')
  const time = timeLabel(plan.time, Date.now(), localeName(), t('time.yesterday'))
  if (time !== '') meta.push(separator('time'), h('span', { key: 'time' }, time))
  meta.push(separator('outcome'), h(Outcome, { key: 'outcome', status: plan.status, t }))
  if (plan.source === 'claude') meta.push(separator('source'), h('span', { key: 'source' }, t('panel.imported')))

  const title = typeof plan.title === 'string' && plan.title !== '' ? plan.title : t('panel.untitled', { n: plan.n })
  const content = [
    h(StatusDot, { status: plan.status }),
    h('span', { className: 'plans-plan-main' },
      h('span', { className: 'plans-plan-title' }, title),
      h('span', { className: 'plans-plan-meta' }, meta)),
  ]

  // One button, no controls inside it: the row does one thing. Without an opener
  // there is nothing to do, so the row is plain text rather than a dead button.
  const head = typeof onOpen === 'function'
    ? h('button', {
      type: 'button',
      className: 'plans-plan-head',
      onClick: () => onOpen(plan.callId),
    }, content)
    : h('div', { className: 'plans-plan-head plans-plan-head--static' }, content)

  return h('li', {
    className: 'plans-plan',
    'data-status': plan.status,
  },
  head,
  openFailed === true ? h('p', { key: 'failed', className: 'plans-open-failed', role: 'alert' }, t('panel.openFailed')) : null)
}

export function EmptyState({ t }) {
  return h('div', { className: 'plans-empty' },
    h(PlanIcon),
    h('b', null, t('panel.empty')),
    h('p', null, t('panel.emptyHint')))
}

export function FilterEmpty({ t, onReset }) {
  return h('div', { className: 'plans-state' },
    h('p', { className: 'plans-note' }, t('filter.empty')),
    h('button', { type: 'button', className: 'plans-btn plans-btn--quiet', onClick: onReset }, t('filter.reset')))
}

export function SkeletonList({ t }) {
  return h('div', { className: 'plans-state' },
    h('div', { className: 'plans-skeleton', role: 'status', 'aria-label': t('panel.loading') },
      [0, 1, 2].map((index) => h('div', { key: index, className: 'plans-sk' }, h('i'), h('i')))))
}

export function ErrorState({ error, onRetry, t }) {
  const noSession = error === 'no-session'
  const title = noSession ? t('error.title.session') : t('error.title')
  const body = noSession ? t('error.body.session') : String(error ?? '')
  return h('div', { className: 'plans-state' },
    h('div', { className: 'plans-error', role: 'alert' },
      h('i', { className: 'plans-dot plans-dot--error', 'aria-hidden': 'true' }),
      h('div', null, h('p', null, h('b', null, title), body))),
    h('div', { className: 'plans-actions', style: { marginTop: '10px' } },
      h('button', { type: 'button', className: 'plans-btn', onClick: onRetry }, t('error.retry'))))
}
