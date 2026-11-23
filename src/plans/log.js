/**
 * Plan extraction: turns the committed Session log into the list of plans the
 * Session submitted for review.
 *
 * A plan is a `tool/call` (or a PTC dispatch) of `exit_plan_mode` carrying a
 * markdown `plan` argument, exactly as `@deepseek-ai/dsh-plan-mode` defines it.
 * Imported Claude Code Sessions name the same tool `ExitPlanMode`, so both
 * spellings are read. The outcome of each submission lives in the `tool/result`
 * event that cites the call id.
 */

const DSH_TOOL = 'exit_plan_mode'
const CLAUDE_TOOL = 'ExitPlanMode'
const CALL_KINDS = new Set(['tool/call', 'tool/ptc-dispatch-start', 'tool/ptc-dispatch'])
const TITLE_PATTERN = /^#\s+(\S[^\r\n]*)/

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function argumentsOf(event) {
  const raw = event.data.arguments
  if (event.type !== 'tool/call') return raw
  if (typeof raw !== 'string') return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Reads one plan submission out of a log event, or `undefined`. */
export function planOf(event) {
  if (!isRecord(event) || !CALL_KINDS.has(event.type)) return undefined
  const data = event.data
  if (!isRecord(data)) return undefined
  const tool = data.name
  if (tool !== DSH_TOOL && tool !== CLAUDE_TOOL) return undefined
  const callId = event.type === 'tool/call' ? data.callId : data.subCallId
  if (typeof callId !== 'string' || callId === '') return undefined
  const args = argumentsOf(event)
  if (!isRecord(args) || typeof args.plan !== 'string') return undefined
  const markdown = args.plan
  const title = TITLE_PATTERN.exec(markdown.trim())?.[1]
  return {
    callId,
    markdown,
    title: typeof title === 'string' ? title.trim() : undefined,
    source: tool === CLAUDE_TOOL ? 'claude' : 'dsh',
    seq: typeof event.seq === 'number' ? event.seq : undefined,
    time: typeof event.time === 'number' ? event.time : undefined,
  }
}

/** Reads one plan outcome out of a `tool/result` event, or `undefined`. */
export function outcomeOf(event) {
  if (!isRecord(event) || event.type !== 'tool/result') return undefined
  const message = event.data?.message
  if (!isRecord(message)) return undefined
  const callId = message.source?.callId ?? message.toolCallId
  if (typeof callId !== 'string' || callId === '') return undefined
  const text = (Array.isArray(message.content) ? message.content : [])
    .filter((part) => isRecord(part) && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim()
  let status = 'unknown'
  if (message.isError === true) status = 'revise'
  else if (/approved/i.test(text)) status = 'approved'
  else if (/dismiss|declin/i.test(text)) status = 'dismissed'
  return { callId, status, feedback: status === 'revise' ? text : undefined, seq: event.seq }
}

/**
 * Folds log events into plan entries, newest first.
 *
 * `n` counts from the oldest plan, so a list shown top-down reads
 * "plan 4, plan 3, plan 2, plan 1" — the numbering never shifts when a new
 * plan arrives.
 */
export function extractPlans(events) {
  const byCall = new Map()
  for (const event of Array.isArray(events) ? events : []) {
    const plan = planOf(event)
    if (plan === undefined) continue
    byCall.set(plan.callId, { ...plan, status: 'unknown', feedback: undefined })
  }
  for (const event of Array.isArray(events) ? events : []) {
    const outcome = outcomeOf(event)
    if (outcome === undefined) continue
    const plan = byCall.get(outcome.callId)
    if (plan === undefined) continue
    plan.status = outcome.status
    if (outcome.feedback !== undefined) plan.feedback = outcome.feedback
  }
  const ordered = [...byCall.values()].sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0))
  ordered.forEach((plan, index) => {
    plan.n = index + 1
  })
  return ordered.reverse()
}

/** Builds the resource address the built-in plan viewer claims. */
export function planAddress(sessionId, callId) {
  return `dsh-resource://plan/${encodeURIComponent(sessionId)}/${encodeURIComponent(callId)}`
}
