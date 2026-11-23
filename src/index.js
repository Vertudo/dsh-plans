/**
 * Host half of dsh-plans.
 *
 * The panel is a client-only surface: the plan document itself is rendered by
 * the built-in plan tab, and the Session log is read through the Client's
 * `remote.session` service. The row exists so the bundle has a plugin entry and
 * the Loader keeps a stable id for configuration.
 */
export const inject = []

export function apply() {}
