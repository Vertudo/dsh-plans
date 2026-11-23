# Changelog

## 0.2.7

- Declares the parent service together with the mounted namespace: `inject = ['locale', 'remote', 'remote.session']`. The shipped `@deepseek-ai/dsh-client-ui-plan` declares both names (`'remote', 'remote.commands', 'remote.session', …`); with only the dotted name the namespace never resolved, so the pane reported that the session remote was unavailable.

## 0.2.6

- Declares the mounted remote namespace as a dotted service and adds `@deepseek-ai/dsh-api-session-controller` to `dsh.client.inject` — the package that mounts the `session` namespace.

## 0.2.5

- Reads the services inside `apply` and captures the values, which is the one context cordis allows a service read in.

## 0.2.4

- Registration and data access are separated, so the tab is created even when reading later fails.

## 0.2.3

- The tab icon is the 📋 emoji, used by both registries.

## 0.2.2

- The tab carries an icon and a description; the better-sidebar title is a plain string.

## 0.2.1

- No hard service dependencies for registration; the panel row expands the plan inline.

## 0.2.0

- Registers the tab in `dsh-better-sidebar` too; a row expands the plan inline.

## 0.1.0

- First version: a `Plans` tab listing every plan the current Session submitted, newest first, with the outcome and time of each.
- Reads plans from `exit_plan_mode` calls and from `ExitPlanMode` calls of imported Claude Code Sessions.
- Interface in English and Russian; the plugin card is localised in both.
