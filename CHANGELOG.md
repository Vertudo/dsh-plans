# Changelog

## 0.2.0

- Registers the tab in  too (), so the pane appears in its column when that plugin draws the sidebar.
- A row now expands the plan inline; the built-in plan viewer is offered as an extra action where the built-in Sidebar exists.

## 0.1.0

- First version: a `Plans` tab in the right sidebar listing every plan the current Session submitted, newest first.
- Each row shows the plan number, its outcome (approved, sent back for revision, dismissed) and its time.
- Clicking a row opens the plan in the built-in plan tab through `dsh-resource://plan/<session>/<callId>`.
- Reads plans from `exit_plan_mode` calls and from `ExitPlanMode` calls of imported Claude Code Sessions.
- Interface in English and Russian; the plugin card is localised in both.
