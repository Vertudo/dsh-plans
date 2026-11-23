/**
 * Folding plan entries into the numbers and lists the pane and the page show.
 *
 * Pure and React-free: the tests in `tests/summary.test.mjs` exercise these
 * directly, and every caller gets the same answer for the same log.
 */

/** Fixed order: composition segments, counters and filter chips all follow it. */
export const STATUS_ORDER = ['approved', 'revise', 'dismissed', 'unknown']

const DAY_MS = 86_400_000

/** The outcome a row takes: an unfamiliar status reads as `unknown`. */
export function statusOf(plan) {
  return STATUS_ORDER.includes(plan?.status) ? plan.status : 'unknown'
}

/** Counts one plan list by outcome; `total` counts every row. */
export function countByStatus(plans) {
  const counts = { total: 0, approved: 0, revise: 0, dismissed: 0, unknown: 0 }
  for (const plan of Array.isArray(plans) ? plans : []) {
    counts.total += 1
    counts[statusOf(plan)] += 1
  }
  return counts
}

/** The segments of the composition bar: only outcomes that occur, in order. */
export function segments(counts) {
  return STATUS_ORDER
    .filter((status) => (counts?.[status] ?? 0) > 0)
    .map((status) => ({ status, count: counts[status] }))
}

/** Chips offered by the list: "All", then every outcome present, in order. */
export function filterOptions(plans) {
  const counts = countByStatus(plans)
  const options = [{ id: 'all', count: counts.total }]
  for (const status of STATUS_ORDER) {
    if (counts[status] > 0) options.push({ id: status, count: counts[status] })
  }
  return options
}

/** Rows under one filter; an unknown filter behaves as "All". */
export function filterPlans(plans, filter) {
  if (filter === 'all' || filter === undefined || filter === null) return Array.isArray(plans) ? plans : []
  return (Array.isArray(plans) ? plans : []).filter((plan) => statusOf(plan) === filter)
}

/** Keeps a filter the reader picked valid after the list changed under it. */
export function normaliseFilter(filter, options) {
  return (options ?? []).some((option) => option.id === filter) ? filter : 'all'
}

function startOfDay(value) {
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * Which clock the row's time needs:
 * `today` and `yesterday` read as a time of day, `year` as a day and month,
 * `older` as a full date. A missing or future time reads as `today`.
 */
export function relativeKind(time, now = Date.now()) {
  if (typeof time !== 'number' || !Number.isFinite(time)) return 'unknown'
  const days = (startOfDay(now) - startOfDay(time)) / DAY_MS
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return new Date(time).getFullYear() === new Date(now).getFullYear() ? 'year' : 'older'
}

/** `12:34`, in the reader's own clock. */
export function clockTime(time) {
  const date = new Date(time)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** The day label used by the Session card: `сегодня`, `вчера` or a short date. */
export function dayLabel(time, now, locale, labels = {}) {
  const kind = relativeKind(time, now)
  if (kind === 'unknown') return ''
  if (kind === 'today') return labels.today ?? ''
  if (kind === 'yesterday') return labels.yesterday ?? ''
  try {
    return new Date(time).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

/**
 * The row's short time: a clock today, a prefixed clock yesterday, a date
 * beyond. `yesterdayTemplate` carries the `{time}` placeholder.
 */
export function timeLabel(time, now, locale, yesterdayTemplate = '{time}') {
  const kind = relativeKind(time, now)
  if (kind === 'unknown') return ''
  if (kind === 'today') return clockTime(time)
  if (kind === 'yesterday') return String(yesterdayTemplate).replace('{time}', clockTime(time))
  try {
    const options = kind === 'year'
      ? { day: 'numeric', month: 'short' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' }
    return new Date(time).toLocaleDateString(locale, options)
  } catch {
    return clockTime(time)
  }
}

/** The full timestamp for a `title` attribute; empty when the time is absent. */
export function fullTime(time, locale) {
  if (typeof time !== 'number' || !Number.isFinite(time)) return ''
  try {
    return new Date(time).toLocaleString(locale)
  } catch {
    return ''
  }
}
