# Changelog

## 0.1.0

First working version.

- A `Plans` tab in the sidebar listing every plan the current Session submitted for review, newest first, with the plan number, its outcome (approved, sent back for revision, dismissed) and its time.
- A row expands the plan inline, so reading does not depend on which sidebar is on screen; where the built-in right Sidebar exists, the expanded plan also offers to open in the shipped plan viewer through `dsh-resource://plan/<session>/<callId>`.
- Reads the Session log through `ctx.remote.session` (`events` then `page`), so it covers Sessions that are not loaded, and reads imported Claude Code Sessions whose tool is named `ExitPlanMode`.
- Registers in both sidebar registries: `ctx.sidebarRightTabs` for the built-in right Sidebar, and `ctx.betterSidebar.registerTab` for `dsh-better-sidebar` when that service is present.
- Tab icon is the 📋 emoji; interface and plugin card are in English and Russian.
- Read-only: the plugin never writes to the Session and requests no approvals.
