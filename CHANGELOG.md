# Changelog

## 0.2.2

A click reads the plan again, and the built-in Sidebar tab registers on DSH 0.2.3.

- The tab type declares `guide` as the array `ctx.sidebarRightTabs` requires. On DSH 0.2.3-alpha.2 the object shape threw inside the registration, and the whole block went with it: no tab type, no pane body, no viewer opener for that surface. The plugin's own tab was missing from the right Sidebar in that release.
- The type and the pane body register in separate blocks, so one rejected registration no longer takes the other surfaces down.
- The built-in Sidebar's navigation face is captured where `ctx.inject` declares it. Surfaces no longer reach for it with `ctx.get` from a restricted context, which answered nothing and left the card with an opener that silently did nothing.
- A click always reads the plan: every card expands in every surface, and when the host's `MarkdownText` is out of reach the plugin draws the plan itself (`src/client/markdown.js`) instead of passing the click to a viewer that may not answer.
- `Open in the viewer` is offered only where the Sidebar can take the plan; a refusal prints one line under the plan and one warning in the console instead of leaving the click silent.
- The plugin's renderer covers headings, paragraphs, bullet and numbered lists, quotes, fenced code, inline code, bold, italic and links with a loadable scheme. Raw markdown is still never printed.
- Tests now follow the Host's contracts, not the plugin's hopes: the fake tab registry maps the `guide` array, and a block that throws is caught per injection the way cordis catches it.

## 0.2.1

- Declares the DSH releases it supports in `engines.dsh` (`>= 0.2.2 < 0.3.0`). Installation and profile start now refuse an incompatible DSH instead of loading the plugin into it; verified on 0.2.2-rc.5 and 0.2.3-alpha.2.
- Published to npm as `dsh-plans`, so `dsh plugin add dsh-plans` installs the prebuilt package. The GitHub install keeps working.
- No behaviour change.

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
