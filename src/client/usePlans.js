/**
 * Session state for the plan list: the read itself and the filter over it.
 *
 * Both surfaces — the sidebar pane and the page — start from these two hooks,
 * so a state or a filter behaves the same wherever the reader is.
 */
import { useCallback, useEffect, useState } from 'react'
import { filterOptions, filterPlans, normaliseFilter } from './summary.js'

const INITIAL = { status: 'loading', plans: [], error: undefined, loadedAt: undefined }

/** Reads the Session's plans and keeps the read's state. */
export function usePlans({ sessionId, readPlans }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(INITIAL)

  useEffect(() => {
    if (typeof sessionId !== 'string' || sessionId === '' || typeof readPlans !== 'function') {
      setState({ status: 'failed', plans: [], error: 'no-session', loadedAt: undefined })
      return undefined
    }
    let alive = true
    const controller = new AbortController()
    setState((current) => ({ status: 'loading', plans: current.plans, error: undefined, loadedAt: current.loadedAt }))
    readPlans(controller.signal).then(
      (plans) => {
        if (alive && !controller.signal.aborted) setState({ status: 'ready', plans, error: undefined, loadedAt: Date.now() })
      },
      (error) => {
        if (alive && !controller.signal.aborted) {
          setState({ status: 'failed', plans: [], error: String(error?.message ?? error), loadedAt: undefined })
        }
      },
    )
    return () => {
      alive = false
      controller.abort()
    }
  }, [sessionId, readPlans, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  return { ...state, reload }
}

/** The outcome filter: its chips, the picked one and the rows under it. */
export function usePlanFilter(plans) {
  const [picked, setPicked] = useState('all')
  const options = filterOptions(plans)
  const filter = normaliseFilter(picked, options)
  return {
    filter,
    setFilter: setPicked,
    options,
    visible: filterPlans(plans, filter),
  }
}
