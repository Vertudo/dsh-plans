# Security

## What the plugin touches

- Reads the committed Session log through the Client's `remote.session` service, in the Session whose sidebar hosts the tab.
- Opens plan addresses in the right sidebar. It writes nothing to the Session, the workspace, or any file.
- Requests no approvals, keeps no authentication data, and makes no network requests of its own.

The plan text it lists is whatever the model submitted; the pane shows only titles, and the body is rendered by the built-in plan tab.

## Reporting

Open an issue at <https://github.com/Vertudo/dsh-plans/issues> describing the version, the DSH version, and what you observed. Do not paste Session logs containing internal addresses or secrets.
