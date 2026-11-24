# dsh-plans

Russian | [Русский](README.ru.md)

Every plan a DeepSeek Harness Session submitted for review, newest first — in the right sidebar and on a page beside Chat.

Plan mode already renders one submitted plan at a time: it opens a plan tab while the plan is pending and leaves a card at the end of the Turn. What neither shows is the whole history of the Session. This plugin adds it: every submission with its outcome, drawn with the app's own theme tokens so light and dark both work.

## What you get

- **The list.** The right sidebar gets a `Plans` tab: one card per submitted plan, newest first, with the plan number, its outcome and its time.
- **The mix.** A composition bar and counters split the list by outcome; chips filter it, each with its count.
- **The plan itself.** A card is one button: press it and the plan opens in the built-in viewer tab. Nothing is drawn in the list, so a long plan never has to be scrolled through, and the text is the same one plan mode shows. If the viewer cannot take the plan, a line under the card says so — the click is never silent.
- **The page.** A center-column view beside `Chat` and `Trajectory`: filters and cards on the left, the outcome mix and a Session card on the right.
- **Imported Sessions.** Plans from Claude Code Sessions imported into DSH are read too: they call the same tool under the name `ExitPlanMode`.

The pane only reads the Session log. It never writes to the Session and never asks for an approval.

## Install

```sh
dsh plugin --profile <profile> add dsh-plans
```

From a checkout pass `./dsh-plans` instead, and the repository works directly: `dsh plugin --profile <profile> add https://github.com/Vertudo/dsh-plans`. The same bundle installs from the Plugins page, where the add dialog takes a package name, a Git address, a tarball, or a local path.

Requires DSH `>= 0.2.2 < 0.3.0`, declared as `engines.dsh`; an incompatible release is refused at installation and at profile start. To update, remove the bundle and add it again — installing over an installed package reports `already-installed`. Restart DSH (or reload the window) so the browser picks up the client half.

## Where it appears

Three surfaces, one component:

- **Built-in right Sidebar** — the tab is added from its guide: open the add control, pick `Plans`.
- **dsh-better-sidebar** — its own tab list gets a `Plans` tab, no setup needed.
- **The center column** — a `Plans` view beside `Chat` and `Trajectory`, full width.

A row of the list is one button: a click opens the plan in its own viewer tab. Reading a plan therefore needs the built-in right Sidebar; without it the card reports the refusal. The page also offers `Open in the panel`.

## Use

1. Open the right sidebar in a Session that went through plan mode, or pick the `Plans` view in the header.
2. In the sidebar, add the `Plans` tab: the add control opens the guide, where `Plans` is one of the entries.
3. Click a plan's row and it opens in the built-in viewer tab. The list itself never expands a plan.

The list is read when the pane opens. Press `Refresh` after a new plan is submitted in the same Session.

## How it works

A plan is not a Session object: it is a `tool/call` of `exit_plan_mode` whose `plan` argument is the markdown the user reviews. The outcome is the `tool/result` that cites the same call id. So every surface folds the Session log itself:

- `ctx.remote.session.events` and `ctx.remote.session.page` read the committed log page by page, including history older than the first page;
- `exit_plan_mode` and `ExitPlanMode` calls become cards; the outcomes behind them become the dots, labels and the composition bar;
- a plan opens by address, `dsh-resource://plan/<session>/<callId>`: the built-in `plan` tab type claims it and renders it, so the plugin needs neither a markdown renderer nor a parser of its own;
- a refusal — no right Sidebar, no tab type, a plan without a heading — prints under the card instead of being swallowed.

The visual layer is one stylesheet, `src/client/panel.css`, built from the host's `--dsw-alias-*` tokens. It ships inside the client bundle and is injected as a single `<style>` element, so light and dark follow the app without a second file. The three surfaces register in `sidebar.right.pane.tab`, `betterSidebar.registerTab` and the `conversation.view` slot.

The plugin therefore ships one client module and an empty host half: the row in the profile keeps the bundle addressable, and configuration can be added later without renaming it.

## Limitations

- **Current Session only.** The list covers the Session whose pane or view it is; there is no cross-Session view.
- **Manual refresh.** A plan submitted while the pane is open appears after `Refresh`; nothing polls the log.
- **Plans are read in the viewer only.** The list shows the title, the outcome and the time; the text lives in the built-in tab. Without that tab or the built-in right Sidebar, the card reports the refusal and the plan cannot be opened.
- **Review feedback is not shown.** A card carries the outcome, not the feedback text; the text stays in the Session log.
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
