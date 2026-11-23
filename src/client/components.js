/**
 * The pane's and the page's building blocks.
 *
 * Plain `createElement` calls over the class names in `panel.css`: nothing here
 * reaches for a host service, so the same piece renders in a sidebar pane, in
 * the bottom workbench and in a center-column view.
 */
import { createElement as h } from 'react'
import { markdownRenderer } from './markdown.js'
import { segments, timeLabel } from './summary.js'

const TONE = { approved: 'ok', revise: 'warn', dismissed: 'dismissed', unknown: 'unknown' }

/** Which colour a row's outcome takes. */
export function toneOf(status) {
  return TONE[status] ?? 'unknown'
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

export function ChevronIcon(props) {
  return icon([h('path', { key: 'v', d: 'M4 6.5 8 10.5 12 6.5' })], props)
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

export function Feedback({ text, t }) {
  return h('div', { className: 'plans-feedback' }, h('b', null, t('feedback.title')), text)
}

/**
 * The plan document: the host's markdown renderer when the module table has it,
 * the raw markdown otherwise. Both paths keep the same box, so a missing module
 * costs the styling of the document, not the ability to read it.
 */
export function PlanDoc({ plan, t, variant }) {
  const Markdown = markdownRenderer()
  const className = variant === 'panel' ? 'plans-doc plans-doc--panel' : 'plans-doc'
  if (Markdown !== null) {
    const labels = {
      code: {
        copyLabel: t('md.copy'),
        copiedLabel: t('md.copied'),
        toolbarLabels: { codeLabel: t('md.code'), wrapLabel: t('md.wrap'), unwrapLabel: t('md.unwrap') },
      },
      footnotes: t('md.footnotes'),
    }
    return h('div', { className }, h(Markdown, { text: plan.markdown, labels }))
  }
  return h('div', { className }, h('pre', { className: 'plans-doc-pre' }, plan.markdown))
}

export function PlanCard({ plan, open, onToggle, onOpen, onOpenPage, t, variant }) {
  const meta = [h('span', { key: 'n' }, `#${plan.n}`)]
  const separator = (key) => h('span', { key: `sep-${key}`, className: 'plans-sep', 'aria-hidden': 'true' }, '·')
  const time = timeLabel(plan.time, Date.now(), localeName(), t('time.yesterday'))
  if (time !== '') meta.push(separator('time'), h('span', { key: 'time' }, time))
  meta.push(separator('outcome'), h(Outcome, { key: 'outcome', status: plan.status, t }))
  if (plan.source === 'claude') meta.push(separator('source'), h('span', { key: 'source' }, t('panel.imported')))

  const title = typeof plan.title === 'string' && plan.title !== '' ? plan.title : t('panel.untitled', { n: plan.n })

  const head = h('button', {
    type: 'button',
    className: 'plans-plan-head',
    'aria-expanded': open ? 'true' : 'false',
    onClick: () => onToggle(plan.callId),
  },
  h(StatusDot, { status: plan.status }),
  h('span', { className: 'plans-plan-main' },
    h('span', { className: 'plans-plan-title' }, title),
    h('span', { className: 'plans-plan-meta' }, meta)),
  h(ChevronIcon, { className: 'plans-chevron' }))

  let body = null
  if (open) {
    const actions = []
    if (typeof onOpen === 'function') {
      actions.push(h('button', {
        key: 'open',
        type: 'button',
        className: 'plans-btn',
        onClick: (event) => {
          event.stopPropagation()
          onOpen(plan.callId)
        },
      }, t('panel.open')))
    }
    if (variant === 'panel' && typeof onOpenPage === 'function') {
      actions.push(h('button', {
        key: 'page',
        type: 'button',
        className: 'plans-btn plans-btn--quiet',
        onClick: (event) => {
          event.stopPropagation()
          onOpenPage()
        },
      }, t('panel.openPage')))
    }
    const parts = []
    if (typeof plan.feedback === 'string' && plan.feedback !== '') parts.push(h(Feedback, { key: 'feedback', text: plan.feedback, t }))
    parts.push(h(PlanDoc, { key: 'doc', plan, t, variant }))
    if (actions.length > 0) parts.push(h('div', { key: 'actions', className: 'plans-actions' }, actions))
    body = h('div', { className: 'plans-plan-body' }, parts)
  }

  return h('li', { className: open ? 'plans-plan plans-plan--open' : 'plans-plan', 'data-status': plan.status }, head, body)
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
