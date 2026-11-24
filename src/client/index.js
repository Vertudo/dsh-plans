/**
 * Client half of dsh-plans: the plan list in three places.
 *
 * - the built-in right Sidebar (`ctx.sidebarRightTabs` + its pane slot);
 * - `dsh-better-sidebar` (`ctx.betterSidebar.registerTab`), which draws its own
 *   column and calls the tab component with a Session `scope`;
 * - a center-column view beside Chat and Trajectory (`conversation.view`).
 *
 * Cordis reads a service only where that service is declared, and a mounted
 * remote namespace counts as a service under its dotted name, and the parent
 * service must be declared with it: the shipped plan package declares both
 * `remote` and `remote.session`. The namespace itself is mounted at runtime by
 * the session controller. With both declared, `apply` can capture it the way the
 * shipped plan package does (`planResourceProvider(ctx.remote.session)`); every
 * other service is declared by the `ctx.inject` block that needs it.
 *
 * One service is read outside its own block: the built-in right Sidebar's
 * navigation face (`ctx.sidebarRight`). It is captured once, in the block that
 * declares it, and every surface opens a plan through that capture — or reports
 * that it cannot. A surface never gets a function that silently does nothing, so
 * a click that cannot hand the plan to the viewer says so instead of freezing.
 *
 * The tab type registers with its `guide` as an ARRAY of entries, which is the
 * shape `ctx.sidebarRightTabs` validates: a single object there throws inside the
 * registration and would take the whole block — the type, the body and the
 * opener — down with it.
 */
import { createElement as h } from 'react'
import { planAddress } from '../plans/log.js'
import { renderPlan } from './markdown.js'
import { readSessionPlans } from './read.js'
import { PlansPanel } from './PlansPanel.js'
import { PlansPage } from './PlansPage.js'
import { en, ru } from './presentation.js'
import { injectStyles } from './styles.js'

export const TAB_ID = 'dsh-plans'
const TAB_KIND = 'plans'
/** The center-column view's id; it shares the word, not the registry. */
const VIEW_ID = 'plans'
const BETTER_TAB_ID = 'dsh-plans:plans'
const NS = 'dsh-plans'
/** A view id of its own, so the view never collides with a shipped one. */
const VIEW_ORDER = 40
/** The guide capsule's identity inside this type. */
const GUIDE_ID = 'plans'
const GUIDE_ORDER = 40

export const inject = ['locale', 'remote', 'remote.session']

/** Reads a value, returning `undefined` when cordis refuses the access. */
function attempt(fn) {
  try {
    return fn()
  } catch {
    return undefined
  }
}

/** The tab glyph: the plugin's own mark, drawn in `currentColor`. */
function iconFor(size = 16) {
  return h('svg', {
    viewBox: '0 0 64 64',
    width: size,
    height: size,
    fill: 'none',
    role: 'img',
    'aria-hidden': 'true',
    focusable: 'false',
  },
  h('rect', { x: 6, y: 6, width: 52, height: 52, rx: 12, stroke: 'currentColor', strokeWidth: 4 }),
  h('path', { d: 'M18 22h20M18 32h28M18 42h14', stroke: 'currentColor', strokeWidth: 4, strokeLinecap: 'round' }),
  h('circle', { cx: 46, cy: 42, r: 5, fill: 'currentColor' }))
}

function sessionIdOf(owner) {
  return typeof owner === 'string' ? owner : owner?.sessionId
}

/**
 * Hands one plan to the built-in viewer, or reports why it cannot.
 *
 * `openResource` throws for an address no tab type claims and for a Sidebar that
 * is not there; both are wiring, and both must reach the reader as a line under
 * the card rather than as a click that does nothing.
 */
function openInViewer(rightbar, sessionId, callId, onFailed) {
  const open = rightbar?.openResource
  if (typeof open !== 'function') {
    if (typeof onFailed === 'function') onFailed(callId, 'no-viewer')
    return
  }
  try {
    open.call(rightbar, planAddress(sessionId, callId))
  } catch (error) {
    if (typeof onFailed === 'function') onFailed(callId, String(error?.message ?? error))
  }
}

/** Opens one page type in the built-in right Sidebar; nothing to report when absent. */
function openSidebarTab(rightbar, kind) {
  const open = rightbar?.openTab
  if (typeof open !== 'function') return
  try {
    open.call(rightbar, kind)
  } catch {
    // A kind nothing registered is a wiring mistake in this plugin, not a reader's problem.
  }
}

export function apply(ctx) {
  // `remote` is declared for this module, so this read is allowed here — and only
  // here: a component rendering later must receive the value, not the service.
  const sessionRemote = attempt(() => ctx.remote.session)

  // The one capture of the built-in right Sidebar. Whatever block finishes first
  // sets it, and every opener below reads it when it runs: a surface registered
  // before the Sidebar came up is not left with a dead callback.
  let rightbar
  ctx.inject(['sidebarRight'], (scoped) => {
    rightbar = scoped.sidebarRight
  })

  const canViewer = () => typeof rightbar?.openResource === 'function'
  const canPage = () => typeof rightbar?.openTab === 'function'

  const readPlansWith = (sessionId) => (signal) => (sessionRemote === undefined
    ? Promise.reject(new Error('the session remote is unavailable'))
    : readSessionPlans(sessionRemote, sessionId, signal))

  const openPlanWith = (sessionId) => (callId, onFailed) => {
    if (typeof sessionId !== 'string' || sessionId === '') {
      if (typeof onFailed === 'function') onFailed(callId, 'no-session')
      return
    }
    openInViewer(rightbar, sessionId, callId, onFailed)
  }

  const openPage = () => openSidebarTab(rightbar, TAB_KIND)

  injectStyles()

  ctx.effect(() => ctx.locale.register(NS, { en, ru }), 'dsh-plans: dictionaries')
  const t = ctx.locale.bind(NS)

  // Stage one: the tab type. Its own block, so a rejected type cannot take the
  // body down with it — and so the body keeps working under a Sidebar that
  // dispatches without a registered type.
  ctx.inject(['sidebarRightTabs'], (scoped) => {
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: TAB_ID,
      kind: TAB_KIND,
      priority: 'extension',
      title: () => t('tab.title'),
      guide: [{
        id: GUIDE_ID,
        order: GUIDE_ORDER,
        title: () => t('guide.title'),
        description: () => t('guide.description'),
        icon: iconFor,
      }],
    }), 'dsh-plans: tab type')
  })

  // Stage two: the tab body, beside every other surface that needs only slots.
  ctx.inject(['slots'], (scoped) => {
    scoped.effect(() => scoped.slots.inject('sidebar.right.pane.tab', () => scoped.slots.register({
      name: 'sidebar.right.pane.tab',
      key: TAB_ID,
      locale: NS,
      inject: (owner) => {
        const sessionId = sessionIdOf(owner)
        return {
          sessionId,
          readPlans: readPlansWith(sessionId),
          openPlan: openPlanWith(sessionId),
          canOpenPlan: canViewer,
          openPage,
          canOpenPage: canPage,
        }
      },
    }, PlansPanel)), 'dsh-plans: tab body')
  })

  ctx.inject(['betterSidebar'], (scoped) => {
    scoped.effect(() => scoped.betterSidebar.registerTab({
      id: BETTER_TAB_ID,
      // A plain string: the registry stores the chip title as text.
      title: t('tab.title'),
      description: () => t('guide.description'),
      icon: iconFor,
      component: (props) => {
        const sessionId = props?.scope?.sessionId
        return h(PlansPanel, {
          t,
          sessionId,
          readPlans: readPlansWith(sessionId),
          openPlan: openPlanWith(sessionId),
          canOpenPlan: canViewer,
          openPage,
          canOpenPage: canPage,
        })
      },
    }), 'dsh-plans: better-sidebar tab')
  })

  ctx.inject(['slots'], (scoped) => {
    scoped.effect(() => scoped.slots.inject('conversation.view', () => scoped.slots.register({
      name: 'conversation.view',
      id: VIEW_ID,
      order: VIEW_ORDER,
      locale: NS,
      label: () => t('view.title'),
      inject: (owner) => {
        const sessionId = sessionIdOf(owner)
        return {
          sessionId,
          readPlans: readPlansWith(sessionId),
          openPlan: openPlanWith(sessionId),
          canOpenPlan: canViewer,
          openPanel: openPage,
          canOpenPanel: canPage,
        }
      },
    }, PlansPage)), 'dsh-plans: page')
  })
}

export { PlansPanel, PlansPage, renderPlan }
