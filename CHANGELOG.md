# Changelog

## 0.2.5

- Reads `remote.session` and `sidebarRight.openResource` inside `apply` and captures the values, which is the one context cordis allows a service read in — the same way the shipped `@deepseek-ai/dsh-client-ui-plan` package wires `planResourceProvider(ctx.remote.session)`. Reads from a `ctx.inject` callback or from the rendering path are refused, which is what earlier versions hit.
- A failed capture no longer breaks anything: the tab still registers, and the pane reports that the session remote is unavailable.

## 0.2.4

- Registration and data access are separated. Registering the tab needs only `locale` (plus `betterSidebar` in that registry), so the pane is always created. A missing remote shows a readable message inside the pane instead of removing the tab.

## 0.2.3

- The tab icon is the 📋 emoji, used by both registries (the better-sidebar chip and the built-in guide tile).
- Tried reading the nested service through the `inject` scope, which the guard refuses.

## 0.2.2

- The tab carries an icon and a description, so it no longer shows as an empty tile in the better-sidebar guide and chip.
- The better-sidebar title is a plain string, because that registry stores the chip text rather than calling a getter.

## 0.2.1

- The client module declares no hard service dependencies: each registration waits for its own services through `ctx.inject`, so a missing service no longer keeps the plugin entry in the `loading` phase.
- The panel row expands the plan inline, so the pane is readable without the built-in plan viewer.

## 0.2.0

- Registers the tab in `dsh-better-sidebar` too (`ctx.betterSidebar.registerTab`), so the pane appears in its column when that plugin draws the sidebar.
- A row now expands the plan inline; the built-in plan viewer is offered as an extra action where the built-in Sidebar exists.

## 0.1.0

- First version: a `Plans` tab listing every plan the current Session submitted, newest first.
- Each row shows the plan number, its outcome (approved, sent back for revision, dismissed) and its time.
- Clicking a row opens the plan in the built-in plan tab through `dsh-resource://plan/<session>/<callId>`.
- Reads plans from `exit_plan_mode` calls and from `ExitPlanMode` calls of imported Claude Code Sessions.
- Interface in English and Russian; the plugin card is localised in both.
