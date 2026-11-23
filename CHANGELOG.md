# Changelog

## 0.2.0

The list gets a design of its own, and a second surface.

- The pane is drawn with the host's theme tokens (`--dsw-alias-*`) from one stylesheet instead of inline styles: cards, muted labels, status dots, hover and focus states, and light and dark follow the app.
- A composition bar and counters split the plans by outcome; chips filter the list, each with its count.
- A card opens the plan in place: the text comes from the host's `MarkdownText`, the same renderer the built-in plan viewer uses, and the review feedback is shown when the plan was sent back. Raw markdown is never printed — where that renderer is missing, a click opens the plan in the viewer instead.
- A `Plans` view in the center column beside `Chat` and `Trajectory`: filters and cards on the left, the outcome mix and a Session card on the right. The newest plan starts open.
- Times read as a clock today, a prefixed clock yesterday, a short date beyond; the full timestamp lives in the row's `title`.
- The tab icon is the plugin's own SVG rather than the 📋 emoji.
- The panel and the page link to each other where the built-in right Sidebar is present.

## 0.1.0

First working version.

- A `Plans` tab in the sidebar listing every plan the current Session submitted for review, newest first, with the plan number, its outcome (approved, sent back for revision, dismissed) and its time.
- A row expands the plan inline, so reading does not depend on which sidebar is on screen; where the built-in right Sidebar exists, the expanded plan also offers to open in the shipped plan viewer through `dsh-resource://plan/<session>/<callId>`.
- Reads the Session log through `ctx.remote.session` (`events` then `page`), so it covers Sessions that are not loaded, and reads imported Claude Code Sessions whose tool is named `ExitPlanMode`.
- Registers in both sidebar registries: `ctx.sidebarRightTabs` for the built-in right Sidebar, and `ctx.betterSidebar.registerTab` for `dsh-better-sidebar` when that service is present.
- Tab icon is the 📋 emoji; interface and plugin card are in English and Russian.
- Read-only: the plugin never writes to the Session and requests no approvals.
