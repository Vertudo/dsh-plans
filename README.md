# dsh-plans

Russian | [Русский](README.ru.md)

Every plan a DeepSeek Harness Session submitted for review, newest first, in the right sidebar.

Plan mode already renders one submitted plan at a time: it opens a plan tab while the plan is pending and leaves a card at the end of the Turn. What neither shows is the whole history of the Session. This plugin adds it: one pane, every submission, with the outcome of each.

## What you get

- **The list.** The right sidebar gets a `Plans` tab: one row per submitted plan, newest first, with the plan number, its outcome and its time.
- **The plan itself.** Clicking a row opens the plan in the built-in plan tab — the same document viewer plan mode uses, with the same markdown rendering and history restore.
- **The outcome.** Each row says whether the plan was approved, sent back for revision (with the review feedback) or dismissed before approval.
- **Imported Sessions.** Plans from Claude Code Sessions imported into DSH are read too: they call the same tool under the name `ExitPlanMode`.

The pane only reads the Session log. It never writes to the Session and never asks for an approval.

## Install

```sh
dsh plugin --profile <profile> add ./dsh-plans
```

or add the bundle from the Plugins page. Restart DSH (or reload the window) so the browser picks up the client half.

## Use

1. Open the right sidebar in a Session that went through plan mode.
2. Add the `Plans` tab: the sidebar's add control opens the guide, where `Plans` is one of the entries.
3. Click a row to read that plan. Clicking the same row again focuses the open tab instead of opening a second copy.

The list is read when the tab opens. Press `Refresh` after a new plan is submitted in the same Session.

## How it works

A plan is not a Session object: it is a `tool/call` of `exit_plan_mode` whose `plan` argument is the markdown the user reviews. The outcome is the `tool/result` that cites the same call id. So the pane folds the Session log itself:

- `ctx.remote.session.events` and `ctx.remote.session.page` read the committed log page by page, including history older than the first page;
- `exit_plan_mode` and `ExitPlanMode` calls become list rows;
- each row opens `dsh-resource://plan/<session>/<callId>` — an address the built-in `plan` tab type claims and renders.

The plugin therefore ships one client module and an empty host half: the row in the profile keeps the bundle addressable, and configuration can be added later without renaming it.

## Limitations

- **Current Session only.** The pane lists the Session whose sidebar it sits in; there is no cross-Session view.
- **Manual refresh.** A plan submitted while the tab is open appears after `Refresh`; the pane does not poll.
- **Built-in rendering.** How a plan looks is the built-in plan tab's business. If that tab is ever removed from a deployment, rows still list plans but cannot open them.
- **Imported sessions.** A plan from an imported Claude Code Session lists with the `Claude Code` mark; the built-in viewer resolves it from the same Session history.

## Development

```sh
npm install
npm run build        # lib/index.js + lib/client.js
npm test             # unit tests
npm run verify       # hygiene + tests + build drift check
```

`lib/` is committed: `npm run verify` fails when the committed build differs from the sources. Sources are plain ES modules; the client bundle is wrapped for the Web module loader by `scripts/build.mjs`, with `react` supplied by the browser module table.

The test fixture under `tests/fixtures/` is a trimmed excerpt of a real Session: the four `exit_plan_mode` calls of a backend_docs Session and their results.

## License

MIT — see [LICENSE](LICENSE).
