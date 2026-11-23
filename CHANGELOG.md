# Changelog

## 0.2.6

- Declares the mounted remote namespace as a dotted service: `inject = ['locale', 'remote.session']`. `dsh-api-remotes` mounts its namespaces at runtime (`ctx.remote.$mount()`), so a nested path is not a plain property of the `remote` service, and cordis refuses it until that namespace is declared by its dotted name. With the declaration, `apply` captures the namespace once, the way the shipped plan package wires `planResourceProvider(ctx.remote.session)`.
- Adds `@deepseek-ai/dsh-api-session-controller` to `dsh.client.inject`: that package mounts the `session` namespace, so without it the declaration would wait forever.

## 0.2.5

- Reads `remote.session` and `sidebarRight.openResource` inside `apply` and captures the values, which is the one context cordis allows a service read in.
- A failed capture no longer breaks anything: the tab still registers, and the pane reports that the session remote is unavailable.

## 0.2.4

- Registration and data access are separated. Registering the tab needs only `locale` (plus `betterSidebar` in that registry), so the pane is always created.

## 0.2.3

- The tab icon is the 📋 emoji, used by both registries (the better-sidebar chip and the built-in guide tile).

## 0.2.2

- The tab carries an icon and a description, so it no longer shows as an empty tile in the better-sidebar guide and chip.
- The better-sidebar title is a plain string, because that registry stores the chip text rather than calling a getter.

## 0.2.1

- The client module declares no hard service dependencies for registration, so a missing service no longer keeps the plugin entry in the `loading` phase.
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
