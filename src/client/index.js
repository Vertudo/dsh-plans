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
 * other service is declared by the `ctx.inject` block that registers a surface.
 * Values are captured, never reached through `ctx` from a component.
 */
import { createElement as h } from 'react'
import { planAddress } from '../plans/log.js'
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

export function apply(ctx) {
  // `remote` is declared for this module, so this read is allowed here — and only
  // here: a component rendering later must receive the value, not the service.
  const sessionRemote = attempt(() => ctx.remote.session)

  const readPlansWith = (sessionId) => (signal) => (sessionRemote === undefined
    ? Promise.reject(new Error('the session remote is unavailable'))
    : readSessionPlans(sessionRemote, sessionId, signal))

  const openPlanWith = (openResource, sessionId) => (callId) => {
    if (openResource !== undefined) openResource(planAddress(sessionId, callId))
  }

  const openPageWith = (sidebarRight) => (typeof sidebarRight?.openTab === 'function'
    ? () => sidebarRight.openTab(TAB_KIND)
    : undefined)

  injectStyles()

  ctx.effect(() => ctx.locale.register(NS, { en, ru }), 'dsh-plans: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.inject(['sidebarRightTabs', 'slots', 'sidebarRight'], (scoped) => {
    const openResource = attempt(() => scoped.sidebarRight.openResource.bind(scoped.sidebarRight))
    const openPage = openPageWith(scoped.sidebarRight)

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: TAB_ID,
      kind: TAB_KIND,
      priority: 'extension',
      title: () => t('tab.title'),
      guide: {
        order: 40,
        title: () => t('guide.title'),
        description: () => t('guide.description'),
        icon: iconFor,
      },
    }), 'dsh-plans: tab type')

    scoped.effect(() => scoped.slots.inject('sidebar.right.pane.tab', () => scoped.slots.register({
      name: 'sidebar.right.pane.tab',
      key: TAB_ID,
      locale: NS,
      inject: (owner) => {
        const sessionId = sessionIdOf(owner)
        return {
          sessionId,
          readPlans: readPlansWith(sessionId),
          openPlan: openPlanWith(openResource, sessionId),
          openPage,
        }
      },
    }, PlansPanel)), 'dsh-plans: tab body')
  })

  ctx.inject(['betterSidebar'], (scoped) => {
    const sidebarRight = attempt(() => scoped.get('sidebarRight'))
    const openResource = typeof sidebarRight?.openResource === 'function'
      ? sidebarRight.openResource.bind(sidebarRight)
      : undefined
    const openPage = openPageWith(sidebarRight)

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
          openPlan: openPlanWith(openResource, sessionId),
          openPage,
        })
      },
    }), 'dsh-plans: better-sidebar tab')
  })

  ctx.inject(['slots'], (scoped) => {
    const sidebarRight = attempt(() => scoped.get('sidebarRight'))
    const openResource = typeof sidebarRight?.openResource === 'function'
      ? sidebarRight.openResource.bind(sidebarRight)
      : undefined
    const openPanel = openPageWith(sidebarRight)

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
          openPlan: openPlanWith(openResource, sessionId),
          openPanel,
        }
      },
    }, PlansPage)), 'dsh-plans: page')
  })
}

export { PlansPanel, PlansPage }
