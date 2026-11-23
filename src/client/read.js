/**
 * Reads a Session's committed log and folds it into plan entries.
 *
 * The Client's `remote.session` service pages backwards from the newest record,
 * so a Session with a long history is walked page by page until the log ends or
 * the page budget is spent. Keeping this free of React makes it testable in Node.
 */
import { extractPlans } from '../plans/log.js'

const MAX_PAGES = 60

export async function readSessionPlans(remote, sessionId, signal) {
  const address = { kind: 'session', sessionId }
  const first = await remote.events({ address }, signal)
  if (!first.ok) throw new Error(first.error?.message ?? 'session events are unavailable')
  const throughSeq = first.value?.cursor
  let page = { records: first.value?.records ?? [], hasMore: first.value?.hasMore === true }
  const events = []
  for (let pages = 0; pages < MAX_PAGES; pages += 1) {
    for (const entry of page.records) if (entry?.event) events.push(entry.event)
    const beforeSeq = page.records[0]?.event?.seq
    if (!page.hasMore || beforeSeq === undefined) break
    const next = await remote.page({ address, throughSeq, beforeSeq }, signal)
    if (!next.ok) throw new Error(next.error?.message ?? 'session page is unavailable')
    page = { records: next.value?.records ?? [], hasMore: next.value?.hasMore === true }
  }
  return extractPlans(events)
}
