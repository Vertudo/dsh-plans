# dsh-plans

Russian | [Русский](README.ru.md)

Every plan a DeepSeek Harness Session submitted for review, newest first — in the right sidebar and on a page beside Chat.

Plan mode already renders one submitted plan at a time: it opens a plan tab while the plan is pending and leaves a card at the end of the Turn. What neither shows is the whole history of the Session. This plugin adds it: every submission with its outcome, drawn with the app's own theme tokens so light and dark both work.

## What you get

- **The list.** The right sidebar gets a `Plans` tab: one card per submitted plan, newest first, with the plan number, its outcome and its time.
- **The mix.** A composition bar and counters split the list by outcome; chips filter it, each with its count.
- **The plan itself.** A card expands in place and reads the plan through the host's own `MarkdownText` — the same renderer the built-in plan viewer uses — plus the review feedback when the plan was sent back. `Open in the viewer` hands the plan to the built-in plan tab. Raw markdown is never printed: where the renderer is missing, a click opens the viewer instead.
- **The page.** A center-column view beside `Chat` and `Trajectory`: filters and cards on the left, the outcome mix and a Session card on the right.
- **Imported Sessions.** Plans from Claude Code Sessions imported into DSH are read too: they call the same tool under the name `ExitPlanMode`.

The pane only reads the Session log. It never writes to the Session and never asks for an approval.

## Install

```sh
dsh plugin --profile <profile> add ./dsh-plans
```

or add the bundle from the Plugins page. Restart DSH (or reload the window) so the browser picks up the client half.

## Where it appears

Three surfaces, one component:

- **Built-in right Sidebar** — the tab is added from its guide: open the add control, pick `Plans`.
- **dsh-better-sidebar** — its own tab list gets a `Plans` tab, no setup needed.
- **The center column** — a `Plans` view beside `Chat` and `Trajectory`, full width.

A card expands in place, so reading works wherever the pane is. Where the built-in Sidebar exists, the expanded plan also offers to open in the shipped plan viewer, and the page offers `Open in the panel`.

## Use

1. Open the right sidebar in a Session that went through plan mode, or pick the `Plans` view in the header.
2. In the sidebar, add the `Plans` tab: the add control opens the guide, where `Plans` is one of the entries.
3. Click a card to read that plan; click it again to close it. `Open in the viewer` hands the plan to the built-in tab.

The list is read when the pane opens. Press `Refresh` after a new plan is submitted in the same Session.

## How it works

A plan is not a Session object: it is a `tool/call` of `exit_plan_mode` whose `plan` argument is the markdown the user reviews. The outcome is the `tool/result` that cites the same call id. So every surface folds the Session log itself:

- `ctx.remote.session.events` and `ctx.remote.session.page` read the committed log page by page, including history older than the first page;
- `exit_plan_mode` and `ExitPlanMode` calls become cards; the outcomes behind them become the dots, labels and the composition bar;
- a card renders the plan with `MarkdownText` from the host's shared `@deepseek-ai/dsh-client-ui-primitives`, and falls back to preformatted text when that module is not reachable;
- the viewer button opens `dsh-resource://plan/<session>/<callId>` — an address the built-in `plan` tab type claims and renders.

The visual layer is one stylesheet, `src/client/panel.css`, built from the host's `--dsw-alias-*` tokens. It ships inside the client bundle and is injected as a single `<style>` element, so light and dark follow the app without a second file. The three surfaces register in `sidebar.right.pane.tab`, `betterSidebar.registerTab` and the `conversation.view` slot.

The plugin therefore ships one client module and an empty host half: the row in the profile keeps the bundle addressable, and configuration can be added later without renaming it.

## Limitations

- **Current Session only.** The list covers the Session whose pane or view it is; there is no cross-Session view.
- **Manual refresh.** A plan submitted while the pane is open appears after `Refresh`; nothing polls the log.
- **Built-in rendering.** How a plan looks is the host markdown renderer's business; without `MarkdownText` a click opens the plan in the viewer and no raw text is printed. If the built-in `plan` tab is ever removed from a deployment, cards still list plans but cannot open them in the viewer.
- **Expanded state is not saved.** Which cards are open lives in the pane's own state and is lost on reload.
- **Imported sessions.** A plan from an imported Claude Code Session lists with the `Claude Code` mark; the built-in viewer resolves it from the same Session history.

## Development

```sh
npm install
npm run build        # lib/index.js + lib/client.js
npm test             # unit tests
npm run verify       # hygiene + tests + build drift check
```

`lib/` is committed: `npm run verify` fails when the committed build differs from the sources. Sources are plain ES modules; the client bundle is wrapped for the Web module loader by `scripts/build.mjs`, with `react` and `@deepseek-ai/dsh-client-ui-primitives` supplied by the browser module table. The stylesheet travels through the `text` loader, so the bundle stays a single JavaScript resource.

`design/` holds the approved mock (`mock.html` — both surfaces, both themes), the preview renderer (`render-preview.mjs`) that draws the built code against the real stylesheet, and the screenshots in `design/screens/`. Nothing there ships: `files` in `package.json` leaves the directory out.

The test fixture under `tests/fixtures/` is a trimmed excerpt of a real Session: the four `exit_plan_mode` calls of a backend_docs Session and their results.

## License

MIT — see [LICENSE](LICENSE).
