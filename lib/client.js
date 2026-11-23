window.__ModuleLoader__.load({ id: "dsh-plans", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  PlansPage: () => PlansPage,
  PlansPanel: () => PlansPanel,
  TAB_ID: () => TAB_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react5 = require("react");

// src/plans/log.js
var DSH_TOOL = "exit_plan_mode";
var CLAUDE_TOOL = "ExitPlanMode";
var CALL_KINDS = /* @__PURE__ */ new Set(["tool/call", "tool/ptc-dispatch-start", "tool/ptc-dispatch"]);
var TITLE_PATTERN = /^#\s+(\S[^\r\n]*)/;
function isRecord(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function argumentsOf(event) {
  const raw = event.data.arguments;
  if (event.type !== "tool/call") return raw;
  if (typeof raw !== "string") return void 0;
  try {
    return JSON.parse(raw);
  } catch {
    return void 0;
  }
}
function planOf(event) {
  if (!isRecord(event) || !CALL_KINDS.has(event.type)) return void 0;
  const data = event.data;
  if (!isRecord(data)) return void 0;
  const tool = data.name;
  if (tool !== DSH_TOOL && tool !== CLAUDE_TOOL) return void 0;
  const callId = event.type === "tool/call" ? data.callId : data.subCallId;
  if (typeof callId !== "string" || callId === "") return void 0;
  const args = argumentsOf(event);
  if (!isRecord(args) || typeof args.plan !== "string") return void 0;
  const markdown = args.plan;
  const title = TITLE_PATTERN.exec(markdown.trim())?.[1];
  return {
    callId,
    markdown,
    title: typeof title === "string" ? title.trim() : void 0,
    source: tool === CLAUDE_TOOL ? "claude" : "dsh",
    seq: typeof event.seq === "number" ? event.seq : void 0,
    time: typeof event.time === "number" ? event.time : void 0
  };
}
function outcomeOf(event) {
  if (!isRecord(event) || event.type !== "tool/result") return void 0;
  const message = event.data?.message;
  if (!isRecord(message)) return void 0;
  const callId = message.source?.callId ?? message.toolCallId;
  if (typeof callId !== "string" || callId === "") return void 0;
  const text = (Array.isArray(message.content) ? message.content : []).filter((part) => isRecord(part) && part.type === "text" && typeof part.text === "string").map((part) => part.text).join("\n").trim();
  let status = "unknown";
  if (message.isError === true) status = "revise";
  else if (/approved/i.test(text)) status = "approved";
  else if (/dismiss|declin/i.test(text)) status = "dismissed";
  return { callId, status, feedback: status === "revise" ? text : void 0, seq: event.seq };
}
function extractPlans(events) {
  const byCall = /* @__PURE__ */ new Map();
  for (const event of Array.isArray(events) ? events : []) {
    const plan = planOf(event);
    if (plan === void 0) continue;
    byCall.set(plan.callId, { ...plan, status: "unknown", feedback: void 0 });
  }
  for (const event of Array.isArray(events) ? events : []) {
    const outcome = outcomeOf(event);
    if (outcome === void 0) continue;
    const plan = byCall.get(outcome.callId);
    if (plan === void 0) continue;
    plan.status = outcome.status;
    if (outcome.feedback !== void 0) plan.feedback = outcome.feedback;
  }
  const ordered = [...byCall.values()].sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0));
  ordered.forEach((plan, index) => {
    plan.n = index + 1;
  });
  return ordered.reverse();
}
function planAddress(sessionId, callId) {
  return `dsh-resource://plan/${encodeURIComponent(sessionId)}/${encodeURIComponent(callId)}`;
}

// src/client/read.js
var MAX_PAGES = 60;
async function readSessionPlans(remote, sessionId, signal) {
  const address = { kind: "session", sessionId };
  const first = await remote.events({ address }, signal);
  if (!first.ok) throw new Error(first.error?.message ?? "session events are unavailable");
  const throughSeq = first.value?.cursor;
  let page = { records: first.value?.records ?? [], hasMore: first.value?.hasMore === true };
  const events = [];
  for (let pages = 0; pages < MAX_PAGES; pages += 1) {
    for (const entry of page.records) if (entry?.event) events.push(entry.event);
    const beforeSeq = page.records[0]?.event?.seq;
    if (!page.hasMore || beforeSeq === void 0) break;
    const next = await remote.page({ address, throughSeq, beforeSeq }, signal);
    if (!next.ok) throw new Error(next.error?.message ?? "session page is unavailable");
    page = { records: next.value?.records ?? [], hasMore: next.value?.hasMore === true };
  }
  return extractPlans(events);
}

// src/client/PlansPanel.js
var import_react3 = require("react");

// src/client/components.js
var import_react = require("react");

// src/client/markdown.js
var resolved;
var value = null;
function markdownRenderer() {
  if (resolved === true) return value;
  resolved = true;
  try {
    const lookup = typeof require === "function" ? require : void 0;
    const primitives = lookup === void 0 ? void 0 : lookup("@deepseek-ai/dsh-client-ui-primitives");
    if (typeof primitives?.MarkdownText === "function") value = primitives.MarkdownText;
  } catch {
    value = null;
  }
  return value;
}

// src/client/summary.js
var STATUS_ORDER = ["approved", "revise", "dismissed", "unknown"];
var DAY_MS = 864e5;
function statusOf(plan) {
  return STATUS_ORDER.includes(plan?.status) ? plan.status : "unknown";
}
function countByStatus(plans) {
  const counts = { total: 0, approved: 0, revise: 0, dismissed: 0, unknown: 0 };
  for (const plan of Array.isArray(plans) ? plans : []) {
    counts.total += 1;
    counts[statusOf(plan)] += 1;
  }
  return counts;
}
function segments(counts) {
  return STATUS_ORDER.filter((status) => (counts?.[status] ?? 0) > 0).map((status) => ({ status, count: counts[status] }));
}
function filterOptions(plans) {
  const counts = countByStatus(plans);
  const options = [{ id: "all", count: counts.total }];
  for (const status of STATUS_ORDER) {
    if (counts[status] > 0) options.push({ id: status, count: counts[status] });
  }
  return options;
}
function filterPlans(plans, filter) {
  if (filter === "all" || filter === void 0 || filter === null) return Array.isArray(plans) ? plans : [];
  return (Array.isArray(plans) ? plans : []).filter((plan) => statusOf(plan) === filter);
}
function normaliseFilter(filter, options) {
  return (options ?? []).some((option) => option.id === filter) ? filter : "all";
}
function startOfDay(value2) {
  const date = value2 instanceof Date ? value2 : new Date(value2);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
function relativeKind(time, now = Date.now()) {
  if (typeof time !== "number" || !Number.isFinite(time)) return "unknown";
  const days = (startOfDay(now) - startOfDay(time)) / DAY_MS;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return new Date(time).getFullYear() === new Date(now).getFullYear() ? "year" : "older";
}
function clockTime(time) {
  const date = new Date(time);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function dayLabel(time, now, locale, labels = {}) {
  const kind = relativeKind(time, now);
  if (kind === "unknown") return "";
  if (kind === "today") return labels.today ?? "";
  if (kind === "yesterday") return labels.yesterday ?? "";
  try {
    return new Date(time).toLocaleDateString(locale, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}
function timeLabel(time, now, locale, yesterdayTemplate = "{time}") {
  const kind = relativeKind(time, now);
  if (kind === "unknown") return "";
  if (kind === "today") return clockTime(time);
  if (kind === "yesterday") return String(yesterdayTemplate).replace("{time}", clockTime(time));
  try {
    const options = kind === "year" ? { day: "numeric", month: "short" } : { day: "2-digit", month: "2-digit", year: "numeric" };
    return new Date(time).toLocaleDateString(locale, options);
  } catch {
    return clockTime(time);
  }
}

// src/client/components.js
var TONE = { approved: "ok", revise: "warn", dismissed: "dismissed", unknown: "unknown" };
function toneOf(status) {
  return TONE[status] ?? "unknown";
}
function localeName() {
  try {
    return typeof navigator === "object" && typeof navigator.language === "string" && navigator.language !== "" ? navigator.language : "en";
  } catch {
    return "en";
  }
}
function icon(children, props = {}) {
  return (0, import_react.createElement)("svg", {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    "aria-hidden": "true",
    ...props
  }, children);
}
function RefreshIcon(props) {
  return icon([
    (0, import_react.createElement)("path", { key: "arc", d: "M13.5 8a5.5 5.5 0 1 1-1.6-3.9" }),
    (0, import_react.createElement)("path", { key: "head", d: "M13.5 2.5V5.5H10.5" })
  ], props);
}
function ChevronIcon(props) {
  return icon([(0, import_react.createElement)("path", { key: "v", d: "M4 6.5 8 10.5 12 6.5" })], props);
}
function PlanIcon() {
  return (0, import_react.createElement)("svg", {
    viewBox: "0 0 24 24",
    width: 26,
    height: 26,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, [
    (0, import_react.createElement)("rect", { key: "frame", x: 4, y: 3.5, width: 16, height: 17, rx: 2.5 }),
    (0, import_react.createElement)("path", { key: "lines", d: "M8 8h8M8 12h8M8 16h5" })
  ]);
}
function IconButton({ label, onClick, children }) {
  return (0, import_react.createElement)("button", {
    type: "button",
    className: "plans-icon-btn",
    title: label,
    "aria-label": label,
    onClick
  }, children);
}
function StatusDot({ status }) {
  return (0, import_react.createElement)("i", { className: `plans-dot plans-dot--${toneOf(status)}`, "aria-hidden": "true" });
}
function Outcome({ status, t }) {
  const known = TONE[status] === void 0 ? "unknown" : status;
  return (0, import_react.createElement)("span", { className: `plans-outcome plans-outcome--${toneOf(status)}` }, t(`outcome.${known}`));
}
function SummaryBar({ counts, t }) {
  const parts = segments(counts);
  const partsLabel = parts.map((part) => `${t(`summary.${part.status}`)} ${part.count}`).join(", ");
  return (0, import_react.createElement)("div", {
    className: "plans-bar",
    role: "img",
    "aria-label": t("summary.aria", { parts: partsLabel })
  }, parts.map((part) => (0, import_react.createElement)("i", {
    key: part.status,
    className: `plans-bar-seg plans-bar-seg--${toneOf(part.status)}`,
    style: { flexGrow: part.count }
  })));
}
function KpiRow({ counts, t }) {
  return (0, import_react.createElement)("ul", { className: "plans-kpis" }, segments(counts).map((part) => (0, import_react.createElement)(
    "li",
    {
      key: part.status,
      className: "plans-kpi"
    },
    (0, import_react.createElement)("i", { className: `plans-legend-dot plans-legend-dot--${toneOf(part.status)}`, "aria-hidden": "true" }),
    (0, import_react.createElement)("b", null, String(part.count)),
    t(`summary.${part.status}`)
  )));
}
function FilterChips({ options, value: value2, onChange, t }) {
  return (0, import_react.createElement)(
    "nav",
    { className: "plans-filters", "aria-label": t("filters.aria") },
    options.map((option) => (0, import_react.createElement)("button", {
      key: option.id,
      type: "button",
      className: "plans-chip",
      "aria-pressed": option.id === value2 ? "true" : "false",
      onClick: () => onChange(option.id)
    }, t(`status.${option.id}`), (0, import_react.createElement)("span", null, String(option.count))))
  );
}
function Feedback({ text, t }) {
  return (0, import_react.createElement)("div", { className: "plans-feedback" }, (0, import_react.createElement)("b", null, t("feedback.title")), text);
}
function PlanDoc({ plan, t, variant }) {
  const Markdown = markdownRenderer();
  if (Markdown === null) return null;
  const className = variant === "panel" ? "plans-doc plans-doc--panel" : "plans-doc";
  const labels = {
    code: {
      copyLabel: t("md.copy"),
      copiedLabel: t("md.copied"),
      toolbarLabels: { codeLabel: t("md.code"), wrapLabel: t("md.wrap"), unwrapLabel: t("md.unwrap") }
    },
    footnotes: t("md.footnotes")
  };
  return (0, import_react.createElement)("div", { className }, (0, import_react.createElement)(Markdown, { text: plan.markdown, labels }));
}
function PlanCard({ plan, open, onToggle, onOpen, onOpenPage, t, variant }) {
  const inline = markdownRenderer() !== null;
  const canOpen = typeof onOpen === "function";
  const meta = [(0, import_react.createElement)("span", { key: "n" }, `#${plan.n}`)];
  const separator = (key) => (0, import_react.createElement)("span", { key: `sep-${key}`, className: "plans-sep", "aria-hidden": "true" }, "\xB7");
  const time = timeLabel(plan.time, Date.now(), localeName(), t("time.yesterday"));
  if (time !== "") meta.push(separator("time"), (0, import_react.createElement)("span", { key: "time" }, time));
  meta.push(separator("outcome"), (0, import_react.createElement)(Outcome, { key: "outcome", status: plan.status, t }));
  if (plan.source === "claude") meta.push(separator("source"), (0, import_react.createElement)("span", { key: "source" }, t("panel.imported")));
  const title = typeof plan.title === "string" && plan.title !== "" ? plan.title : t("panel.untitled", { n: plan.n });
  const expanded = inline && open;
  const head = (0, import_react.createElement)(
    "button",
    {
      type: "button",
      className: "plans-plan-head",
      ...inline ? { "aria-expanded": expanded ? "true" : "false" } : {},
      ...inline ? {} : { title: canOpen ? t("panel.open") : void 0 },
      onClick: () => {
        if (inline) onToggle(plan.callId);
        else if (canOpen) onOpen(plan.callId);
      }
    },
    (0, import_react.createElement)(StatusDot, { status: plan.status }),
    (0, import_react.createElement)(
      "span",
      { className: "plans-plan-main" },
      (0, import_react.createElement)("span", { className: "plans-plan-title" }, title),
      (0, import_react.createElement)("span", { className: "plans-plan-meta" }, meta)
    ),
    (0, import_react.createElement)(ChevronIcon, { className: inline ? "plans-chevron" : "plans-chevron plans-chevron--go" })
  );
  let body = null;
  if (expanded) {
    const actions = [];
    if (canOpen) {
      actions.push((0, import_react.createElement)("button", {
        key: "open",
        type: "button",
        className: "plans-btn",
        onClick: (event) => {
          event.stopPropagation();
          onOpen(plan.callId);
        }
      }, t("panel.open")));
    }
    if (variant === "panel" && typeof onOpenPage === "function") {
      actions.push((0, import_react.createElement)("button", {
        key: "page",
        type: "button",
        className: "plans-btn plans-btn--quiet",
        onClick: (event) => {
          event.stopPropagation();
          onOpenPage();
        }
      }, t("panel.openPage")));
    }
    const parts = [];
    if (typeof plan.feedback === "string" && plan.feedback !== "") parts.push((0, import_react.createElement)(Feedback, { key: "feedback", text: plan.feedback, t }));
    parts.push((0, import_react.createElement)(PlanDoc, { key: "doc", plan, t, variant }));
    if (actions.length > 0) parts.push((0, import_react.createElement)("div", { key: "actions", className: "plans-actions" }, actions));
    body = (0, import_react.createElement)("div", { className: "plans-plan-body" }, parts);
  }
  return (0, import_react.createElement)("li", {
    className: expanded ? "plans-plan plans-plan--open" : "plans-plan",
    "data-status": plan.status,
    "data-reads-inline": inline ? "true" : "false"
  }, head, body);
}
function EmptyState({ t }) {
  return (0, import_react.createElement)(
    "div",
    { className: "plans-empty" },
    (0, import_react.createElement)(PlanIcon),
    (0, import_react.createElement)("b", null, t("panel.empty")),
    (0, import_react.createElement)("p", null, t("panel.emptyHint"))
  );
}
function FilterEmpty({ t, onReset }) {
  return (0, import_react.createElement)(
    "div",
    { className: "plans-state" },
    (0, import_react.createElement)("p", { className: "plans-note" }, t("filter.empty")),
    (0, import_react.createElement)("button", { type: "button", className: "plans-btn plans-btn--quiet", onClick: onReset }, t("filter.reset"))
  );
}
function SkeletonList({ t }) {
  return (0, import_react.createElement)(
    "div",
    { className: "plans-state" },
    (0, import_react.createElement)(
      "div",
      { className: "plans-skeleton", role: "status", "aria-label": t("panel.loading") },
      [0, 1, 2].map((index) => (0, import_react.createElement)("div", { key: index, className: "plans-sk" }, (0, import_react.createElement)("i"), (0, import_react.createElement)("i")))
    )
  );
}
function ErrorState({ error, onRetry, t }) {
  const noSession = error === "no-session";
  const title = noSession ? t("error.title.session") : t("error.title");
  const body = noSession ? t("error.body.session") : String(error ?? "");
  return (0, import_react.createElement)(
    "div",
    { className: "plans-state" },
    (0, import_react.createElement)(
      "div",
      { className: "plans-error", role: "alert" },
      (0, import_react.createElement)("i", { className: "plans-dot plans-dot--error", "aria-hidden": "true" }),
      (0, import_react.createElement)("div", null, (0, import_react.createElement)("p", null, (0, import_react.createElement)("b", null, title), body))
    ),
    (0, import_react.createElement)(
      "div",
      { className: "plans-actions", style: { marginTop: "10px" } },
      (0, import_react.createElement)("button", { type: "button", className: "plans-btn", onClick: onRetry }, t("error.retry"))
    )
  );
}

// src/client/usePlans.js
var import_react2 = require("react");
var INITIAL = { status: "loading", plans: [], error: void 0, loadedAt: void 0 };
function usePlans({ sessionId, readPlans }) {
  const [attempt2, setAttempt] = (0, import_react2.useState)(0);
  const [state, setState] = (0, import_react2.useState)(INITIAL);
  (0, import_react2.useEffect)(() => {
    if (typeof sessionId !== "string" || sessionId === "" || typeof readPlans !== "function") {
      setState({ status: "failed", plans: [], error: "no-session", loadedAt: void 0 });
      return void 0;
    }
    let alive = true;
    const controller = new AbortController();
    setState((current) => ({ status: "loading", plans: current.plans, error: void 0, loadedAt: current.loadedAt }));
    readPlans(controller.signal).then(
      (plans) => {
        if (alive && !controller.signal.aborted) setState({ status: "ready", plans, error: void 0, loadedAt: Date.now() });
      },
      (error) => {
        if (alive && !controller.signal.aborted) {
          setState({ status: "failed", plans: [], error: String(error?.message ?? error), loadedAt: void 0 });
        }
      }
    );
    return () => {
      alive = false;
      controller.abort();
    };
  }, [sessionId, readPlans, attempt2]);
  const reload = (0, import_react2.useCallback)(() => setAttempt((value2) => value2 + 1), []);
  return { ...state, reload };
}
function usePlanFilter(plans) {
  const [picked, setPicked] = (0, import_react2.useState)("all");
  const options = filterOptions(plans);
  const filter = normaliseFilter(picked, options);
  return {
    filter,
    setFilter: setPicked,
    options,
    visible: filterPlans(plans, filter)
  };
}

// src/client/PlansPanel.js
function PlansPanel(props) {
  const { t, sessionId, readPlans, openPlan, openPage } = props;
  const { status, plans, error, reload } = usePlans({ sessionId, readPlans });
  const { filter, setFilter, options, visible } = usePlanFilter(plans);
  const [expanded, setExpanded] = (0, import_react3.useState)(null);
  const counts = countByStatus(plans);
  const ready = status === "ready";
  let body;
  if (status === "loading" && plans.length === 0) body = (0, import_react3.createElement)(SkeletonList, { t });
  else if (status === "failed") body = (0, import_react3.createElement)(ErrorState, { error, onRetry: reload, t });
  else if (ready && plans.length === 0) body = (0, import_react3.createElement)(EmptyState, { t });
  else if (ready && visible.length === 0) body = (0, import_react3.createElement)(FilterEmpty, { t, onReset: () => setFilter("all") });
  else {
    body = (0, import_react3.createElement)("ol", { className: "plans-list" }, visible.map((plan) => (0, import_react3.createElement)(PlanCard, {
      key: plan.callId,
      plan,
      open: expanded === plan.callId,
      onToggle: (callId) => setExpanded((current) => current === callId ? null : callId),
      onOpen: openPlan,
      onOpenPage: openPage,
      t,
      variant: "panel"
    })));
  }
  return (0, import_react3.createElement)(
    "div",
    {
      className: "plans plans--panel",
      "data-dsh-plans-panel": "true",
      "aria-busy": status === "loading" ? "true" : "false"
    },
    (0, import_react3.createElement)(
      "div",
      { className: "plans-head" },
      (0, import_react3.createElement)(
        "h2",
        { className: "plans-title" },
        (0, import_react3.createElement)("span", { className: "plans-title-text" }, t("tab.title")),
        plans.length > 0 ? (0, import_react3.createElement)("span", { className: "plans-count" }, String(plans.length)) : null
      ),
      (0, import_react3.createElement)(
        "div",
        { className: "plans-head-actions" },
        (0, import_react3.createElement)(IconButton, { label: t("panel.refresh"), onClick: reload }, (0, import_react3.createElement)(RefreshIcon))
      )
    ),
    plans.length > 0 ? (0, import_react3.createElement)("div", { className: "plans-summary" }, (0, import_react3.createElement)(SummaryBar, { counts, t }), (0, import_react3.createElement)(KpiRow, { counts, t })) : null,
    options.length > 1 ? (0, import_react3.createElement)(FilterChips, { options, value: filter, onChange: setFilter, t }) : null,
    body
  );
}

// src/client/PlansPage.js
var import_react4 = require("react");
function Tile({ status, count, t }) {
  const tone = status === "approved" ? " plans-tile--ok" : status === "revise" ? " plans-tile--warn" : "";
  return (0, import_react4.createElement)(
    "div",
    { className: `plans-tile${tone}` },
    (0, import_react4.createElement)("b", null, String(count)),
    (0, import_react4.createElement)("span", null, t(`summary.${status}`))
  );
}
function SummaryCard({ counts, t }) {
  return (0, import_react4.createElement)(
    "section",
    { className: "plans-card" },
    (0, import_react4.createElement)(
      "div",
      { className: "plans-card-head" },
      (0, import_react4.createElement)("span", { className: "plans-card-title" }, t("summary.title")),
      (0, import_react4.createElement)("span", { className: "plans-card-note" }, t("summary.total", { count: counts.total }))
    ),
    (0, import_react4.createElement)("div", { className: "plans-tiles" }, STATUS_ORDER.map((status) => (0, import_react4.createElement)(Tile, { key: status, status, count: counts[status] ?? 0, t }))),
    (0, import_react4.createElement)(SummaryBar, { counts, t }),
    (0, import_react4.createElement)("p", { className: "plans-note" }, t("summary.note"))
  );
}
function SessionCard({ plans, sessionId, now, locale, t }) {
  const first = plans[plans.length - 1];
  const last = plans[0];
  const imported = plans.filter((plan) => plan.source === "claude").length;
  const dayLabels = { today: t("time.today"), yesterday: t("time.yesterdayShort") };
  const range = `${dayLabel(first.time, now, locale, dayLabels)} \u2014 ${dayLabel(last.time, now, locale, dayLabels)}`;
  const shortId = sessionId.length > 8 ? `${sessionId.slice(0, 8)}\u2026` : sessionId;
  const rows = [
    ["id", t("page.session.id"), (0, import_react4.createElement)("code", null, shortId)],
    ["range", t("page.session.plans"), range],
    ["imported", t("page.session.imported"), String(imported)],
    ["first", t("page.session.first"), `#${first.n} \xB7 ${timeLabel(first.time, now, locale, t("time.yesterday"))}`]
  ];
  return (0, import_react4.createElement)(
    "section",
    { className: "plans-card" },
    (0, import_react4.createElement)(
      "div",
      { className: "plans-card-head" },
      (0, import_react4.createElement)("span", { className: "plans-card-title" }, t("page.session")),
      (0, import_react4.createElement)("span", { className: "plans-card-note" }, t("page.session.readonly"))
    ),
    (0, import_react4.createElement)("dl", { className: "plans-rows" }, rows.map(([key, label, value2]) => (0, import_react4.createElement)(
      "div",
      { key, className: "plans-row" },
      (0, import_react4.createElement)("dt", null, label),
      (0, import_react4.createElement)("dd", null, value2)
    ))),
    (0, import_react4.createElement)("p", { className: "plans-note" }, t("page.session.note"))
  );
}
function PlansPage(props) {
  const { t, sessionId, readPlans, openPlan, openPanel } = props;
  const { status, plans, error, loadedAt, reload } = usePlans({ sessionId, readPlans });
  const { filter, setFilter, options, visible } = usePlanFilter(plans);
  const [picked, setPicked] = (0, import_react4.useState)(void 0);
  const counts = countByStatus(plans);
  const ready = status === "ready";
  const now = Date.now();
  const locale = localeName();
  const openId = picked === void 0 ? plans[0]?.callId : picked;
  const toggle = (callId) => setPicked((current) => {
    const active = current === void 0 ? plans[0]?.callId : current;
    return active === callId ? null : callId;
  });
  const sub = [(0, import_react4.createElement)("span", { key: "s" }, t("page.subtitle"))];
  if (typeof loadedAt === "number") {
    sub.push((0, import_react4.createElement)("span", { key: "sep", className: "plans-sep", "aria-hidden": "true" }, "\xB7"));
    sub.push((0, import_react4.createElement)("span", { key: "u" }, t("page.updated", { time: clockTime(loadedAt) })));
  }
  let body;
  if (status === "loading" && plans.length === 0) body = (0, import_react4.createElement)(SkeletonList, { t });
  else if (status === "failed") body = (0, import_react4.createElement)(ErrorState, { error, onRetry: reload, t });
  else if (ready && plans.length === 0) body = (0, import_react4.createElement)(EmptyState, { t });
  else if (ready && visible.length === 0) body = (0, import_react4.createElement)(FilterEmpty, { t, onReset: () => setFilter("all") });
  else {
    body = (0, import_react4.createElement)("ol", { className: "plans-list" }, visible.map((plan) => (0, import_react4.createElement)(PlanCard, {
      key: plan.callId,
      plan,
      open: openId === plan.callId,
      onToggle: toggle,
      onOpen: openPlan,
      t,
      variant: "page"
    })));
  }
  const aside = plans.length > 0 ? (0, import_react4.createElement)(
    "aside",
    { className: "plans-side" },
    (0, import_react4.createElement)(SummaryCard, { counts, t }),
    (0, import_react4.createElement)(SessionCard, { plans, sessionId, now, locale, t })
  ) : null;
  return (0, import_react4.createElement)(
    "div",
    { className: "plans plans-page", "data-dsh-plans-page": "true", "aria-busy": status === "loading" ? "true" : "false" },
    (0, import_react4.createElement)(
      "header",
      { className: "plans-head" },
      (0, import_react4.createElement)(
        "div",
        { className: "plans-head-text" },
        (0, import_react4.createElement)("h1", { className: "plans-title" }, (0, import_react4.createElement)("span", { className: "plans-title-text" }, t("view.title"))),
        (0, import_react4.createElement)("p", { className: "plans-sub" }, sub)
      ),
      (0, import_react4.createElement)(
        "div",
        { className: "plans-head-actions" },
        (0, import_react4.createElement)(
          "button",
          { key: "reload", type: "button", className: "plans-btn", onClick: reload },
          (0, import_react4.createElement)(RefreshIcon),
          t("panel.refresh")
        ),
        typeof openPanel === "function" ? (0, import_react4.createElement)("button", { key: "panel", type: "button", className: "plans-btn plans-btn--quiet", onClick: openPanel }, t("page.openInPanel")) : null
      )
    ),
    (0, import_react4.createElement)(
      "div",
      { className: aside === null ? "plans-page-grid plans-page-grid--single" : "plans-page-grid" },
      (0, import_react4.createElement)(
        "main",
        { className: "plans-page-list" },
        options.length > 1 ? (0, import_react4.createElement)(FilterChips, { options, value: filter, onChange: setFilter, t }) : null,
        body
      ),
      aside
    )
  );
}

// src/client/presentation.js
var en = {
  "tab.title": "Plans",
  "view.title": "Plans",
  "guide.title": "Plans",
  "guide.description": "Every plan this Session submitted, newest first",
  "panel.refresh": "Refresh",
  "panel.loading": "Reading the Session\u2026",
  "panel.empty": "This Session has no submitted plans yet.",
  "panel.emptyHint": "Enter plan mode with /plan, then submit a plan for review.",
  "panel.untitled": "Plan {n}",
  "panel.imported": "Claude Code",
  "panel.open": "Open in the viewer",
  "panel.openPage": "Open the plans page",
  "filters.aria": "Filter by outcome",
  "filter.empty": "No plans with this outcome.",
  "filter.reset": "Show all",
  "status.all": "All",
  "status.approved": "Approved",
  "status.revise": "In revision",
  "status.dismissed": "Dismissed",
  "status.unknown": "No outcome",
  "outcome.approved": "Approved",
  "outcome.revise": "Sent back for revision",
  "outcome.dismissed": "Dismissed",
  "outcome.unknown": "Outcome unknown",
  "summary.title": "Summary",
  "summary.total": "{count} total",
  "summary.note": "A segment\u2019s width is its share of the outcomes.",
  "summary.aria": "Outcome mix: {parts}",
  "summary.approved": "approved",
  "summary.revise": "in revision",
  "summary.dismissed": "dismissed",
  "summary.unknown": "no outcome",
  "feedback.title": "Review feedback",
  "error.title": "Could not read the Session",
  "error.title.session": "This page has no Session",
  "error.body.session": "Open it from a Session tab; the plan list is per Session.",
  "error.retry": "Try again",
  "time.today": "today",
  "time.yesterday": "yesterday, {time}",
  "time.yesterdayShort": "yesterday",
  "page.subtitle": "Every plan of this Session, newest first",
  "page.updated": "updated {time}",
  "page.openInPanel": "Open in the panel",
  "page.session": "Session",
  "page.session.readonly": "read only",
  "page.session.id": "Identifier",
  "page.session.plans": "Plans",
  "page.session.imported": "Imported",
  "page.session.first": "First plan",
  "page.session.note": "The plugin reads the Session log and never writes to it.",
  "md.copy": "Copy",
  "md.copied": "Copied",
  "md.code": "Code block",
  "md.wrap": "Wrap lines",
  "md.unwrap": "Do not wrap",
  "md.footnotes": "Footnotes"
};
var ru = {
  "tab.title": "\u041F\u043B\u0430\u043D\u044B",
  "view.title": "\u041F\u043B\u0430\u043D\u044B",
  "guide.title": "\u041F\u043B\u0430\u043D\u044B",
  "guide.description": "\u0412\u0441\u0435 \u043F\u043B\u0430\u043D\u044B \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438, \u0441\u0432\u0435\u0436\u0438\u0435 \u0441\u0432\u0435\u0440\u0445\u0443",
  "panel.refresh": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
  "panel.loading": "\u0427\u0438\u0442\u0430\u044E \u0436\u0443\u0440\u043D\u0430\u043B \u0441\u0435\u0441\u0441\u0438\u0438\u2026",
  "panel.empty": "\u0412 \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u043F\u043B\u0430\u043D\u043E\u0432 \u0435\u0449\u0451 \u043D\u0435 \u0431\u044B\u043B\u043E.",
  "panel.emptyHint": "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u0440\u0435\u0436\u0438\u043C \u043F\u043B\u0430\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 /plan \u0438 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u043B\u0430\u043D \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443.",
  "panel.untitled": "\u041F\u043B\u0430\u043D {n}",
  "panel.imported": "Claude Code",
  "panel.open": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0449\u0438\u043A\u0435",
  "panel.openPage": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043F\u043B\u0430\u043D\u043E\u0432",
  "filters.aria": "\u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u0438\u0442\u043E\u0433\u0443",
  "filter.empty": "\u041F\u043B\u0430\u043D\u043E\u0432 \u0441 \u0442\u0430\u043A\u0438\u043C \u0438\u0442\u043E\u0433\u043E\u043C \u043D\u0435\u0442.",
  "filter.reset": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435",
  "status.all": "\u0412\u0441\u0435",
  "status.approved": "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B",
  "status.revise": "\u0414\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0430",
  "status.dismissed": "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u044B",
  "status.unknown": "\u0411\u0435\u0437 \u0438\u0442\u043E\u0433\u0430",
  "outcome.approved": "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D",
  "outcome.revise": "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0443",
  "outcome.dismissed": "\u041E\u0442\u043A\u043B\u043E\u043D\u0451\u043D",
  "outcome.unknown": "\u0418\u0442\u043E\u0433 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D",
  "summary.title": "\u0421\u0432\u043E\u0434\u043A\u0430",
  "summary.total": "\u0432\u0441\u0435\u0433\u043E {count}",
  "summary.note": "\u0428\u0438\u0440\u0438\u043D\u0430 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u0430 \u2014 \u0434\u043E\u043B\u044F \u0438\u0442\u043E\u0433\u0430.",
  "summary.aria": "\u0421\u043E\u0441\u0442\u0430\u0432 \u043F\u043E \u0438\u0442\u043E\u0433\u0430\u043C: {parts}",
  "summary.approved": "\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E",
  "summary.revise": "\u043D\u0430 \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0435",
  "summary.dismissed": "\u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E",
  "summary.unknown": "\u0431\u0435\u0437 \u0438\u0442\u043E\u0433\u0430",
  "feedback.title": "\u0417\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u044F \u0440\u0435\u0432\u044C\u044E",
  "error.title": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0436\u0443\u0440\u043D\u0430\u043B",
  "error.title.session": "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0431\u0435\u0437 \u0441\u0435\u0441\u0441\u0438\u0438",
  "error.body.session": "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0435\u0451 \u0438\u0437 \u0432\u043A\u043B\u0430\u0434\u043A\u0438 \u0441\u0435\u0441\u0441\u0438\u0438: \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u043B\u0430\u043D\u043E\u0432 \u0443 \u043A\u0430\u0436\u0434\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u0441\u0432\u043E\u0439.",
  "error.retry": "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
  "time.today": "\u0441\u0435\u0433\u043E\u0434\u043D\u044F",
  "time.yesterday": "\u0432\u0447\u0435\u0440\u0430, {time}",
  "time.yesterdayShort": "\u0432\u0447\u0435\u0440\u0430",
  "page.subtitle": "\u0412\u0441\u0435 \u043F\u043B\u0430\u043D\u044B \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438, \u0441\u0432\u0435\u0436\u0438\u0435 \u0441\u0432\u0435\u0440\u0445\u0443",
  "page.updated": "\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E {time}",
  "page.openInPanel": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043F\u0430\u043D\u0435\u043B\u0438",
  "page.session": "\u0421\u0435\u0441\u0441\u0438\u044F",
  "page.session.readonly": "\u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u0435\u043D\u0438\u0435",
  "page.session.id": "\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440",
  "page.session.plans": "\u041F\u043B\u0430\u043D\u044B",
  "page.session.imported": "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
  "page.session.first": "\u041F\u0435\u0440\u0432\u044B\u0439 \u043F\u043B\u0430\u043D",
  "page.session.note": "\u041F\u043B\u0430\u0433\u0438\u043D \u0447\u0438\u0442\u0430\u0435\u0442 \u0436\u0443\u0440\u043D\u0430\u043B \u0441\u0435\u0441\u0441\u0438\u0438 \u0438 \u043D\u0438\u0447\u0435\u0433\u043E \u0432 \u043D\u0435\u0433\u043E \u043D\u0435 \u043F\u0438\u0448\u0435\u0442.",
  "md.copy": "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
  "md.copied": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
  "md.code": "\u0411\u043B\u043E\u043A \u043A\u043E\u0434\u0430",
  "md.wrap": "\u041F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0438",
  "md.unwrap": "\u041D\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C",
  "md.footnotes": "\u0421\u043D\u043E\u0441\u043A\u0438"
};

// src/client/panel.css
var panel_default = "/*\n * The visual layer of dsh-plans.\n *\n * Every colour comes from the host theme (`--dsw-alias-*`), so light and dark\n * follow the app without a second stylesheet. The local `--plans-*` aliases\n * exist so the rules below stay short and so a missing host token degrades to a\n * light-theme value instead of an invisible one.\n *\n * Class names are prefixed and nested under `.plans`: the stylesheet is\n * injected into the document once, where a bare `.card` or `.row` would land on\n * the host's own elements.\n */\n\n.plans {\n  --plans-bg: var(--dsw-alias-bg-base, #ffffff);\n  --plans-card: var(--dsw-alias-card-fill, #fafafa);\n  --plans-card-hover: var(--dsw-alias-card-fill-hover, #f2f3f5);\n  --plans-line-1: var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.04));\n  --plans-line-2: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  --plans-line-3: var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.12));\n  --plans-label-1: var(--dsw-alias-label-primary, #0f1115);\n  --plans-label-2: var(--dsw-alias-label-secondary, #61666b);\n  --plans-label-3: var(--dsw-alias-label-tertiary, #81858c);\n  --plans-hover: var(--dsw-alias-interactive-bg-hover, rgba(38, 49, 72, 0.06));\n  --plans-ok: var(--dsw-alias-state-success-primary, #22c55e);\n  --plans-warn: var(--dsw-alias-state-warn-primary, #f59e0b);\n  --plans-error: var(--dsw-alias-state-error-primary, #ec1313);\n  --plans-idle: var(--dsw-alias-state-idle-primary, #d4d4d4);\n  --plans-skeleton: var(--dsw-alias-bg-skeleton, rgba(0, 0, 0, 0.04));\n  --plans-radius-sm: var(--dsw-radius-sm, 6px);\n  --plans-radius-md: var(--dsw-radius-md, 8px);\n  --plans-radius-lg: var(--dsw-radius-lg, 12px);\n  --plans-dur: var(--ds-transition-duration-fast, 140ms);\n  --plans-ease: var(--ds-ease-in-out, cubic-bezier(0.2, 0.7, 0.3, 1));\n  --plans-font: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Arial, sans-serif);\n  --plans-mono: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);\n\n  container-type: inline-size;\n  color: var(--plans-label-1);\n  font-family: var(--plans-font);\n  font-size: 13px;\n  line-height: 1.45;\n}\n\n.plans *,\n.plans *::before,\n.plans *::after { box-sizing: border-box; }\n\n/* \u043F\u0430\u043D\u0435\u043B\u044C: \u043E\u0434\u043D\u0430 \u043A\u043E\u043B\u043E\u043D\u043A\u0430, \u043F\u0440\u043E\u043A\u0440\u0443\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0441\u0430\u043C\u0430 */\n.plans--panel {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  overflow-y: auto;\n}\n\n/* \u2500\u2500 \u0448\u0430\u043F\u043A\u0430 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.plans-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  padding: 12px 12px 10px;\n}\n\n.plans-page .plans-head {\n  align-items: flex-start;\n  padding: 0 0 14px;\n}\n\n.plans-head-text { min-width: 0; }\n\n.plans-title {\n  margin: 0;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  min-width: 0;\n  font-size: 13px;\n  font-weight: 600;\n  letter-spacing: 0;\n}\n\n.plans-page .plans-title { font-size: 15px; }\n\n.plans-title-text {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.plans-count {\n  flex: none;\n  padding: 0 6px;\n  border: 1px solid var(--plans-line-2);\n  border-radius: 999px;\n  color: var(--plans-label-3);\n  font-size: 11px;\n  font-weight: 500;\n  font-variant-numeric: tabular-nums;\n  line-height: 16px;\n}\n\n.plans-sub {\n  margin: 2px 0 0;\n  color: var(--plans-label-3);\n  font-size: 12px;\n}\n\n.plans-head-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: none;\n}\n\n.plans-icon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 24px;\n  height: 24px;\n  padding: 0;\n  border: 0;\n  border-radius: var(--plans-radius-sm);\n  background: transparent;\n  color: var(--plans-label-3);\n  cursor: pointer;\n  transition: background var(--plans-dur) var(--plans-ease), color var(--plans-dur) var(--plans-ease);\n}\n\n.plans-icon-btn:hover { background: var(--plans-hover); color: var(--plans-label-1); }\n\n.plans :focus-visible {\n  outline: 2px solid var(--dsw-alias-border-selected, #4176e6);\n  outline-offset: 2px;\n}\n\n/* \u2500\u2500 \u0441\u0432\u043E\u0434\u043A\u0430 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.plans-summary { padding: 0 12px 10px; }\n.plans-page .plans-summary { padding: 0; }\n\n.plans-bar {\n  display: flex;\n  gap: 2px;\n  height: 6px;\n  border-radius: 999px;\n  overflow: hidden;\n  background: var(--plans-line-1);\n}\n\n.plans-bar-seg { display: block; height: 100%; }\n.plans-bar-seg--ok { background: var(--plans-ok); }\n.plans-bar-seg--warn { background: var(--plans-warn); }\n.plans-bar-seg--dismissed { background: var(--plans-idle); }\n.plans-bar-seg--unknown { background: var(--plans-line-3); }\n\n.plans-kpis {\n  list-style: none;\n  margin: 8px 0 0;\n  padding: 0;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px 14px;\n}\n\n.plans-kpi {\n  display: inline-flex;\n  align-items: baseline;\n  gap: 5px;\n  color: var(--plans-label-3);\n  font-size: 11.5px;\n}\n\n.plans-kpi b {\n  color: var(--plans-label-1);\n  font-size: 12px;\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n}\n\n.plans-legend-dot {\n  display: inline-block;\n  width: 6px;\n  height: 6px;\n  border-radius: 999px;\n}\n\n.plans-legend-dot--ok { background: var(--plans-ok); }\n.plans-legend-dot--warn { background: var(--plans-warn); }\n.plans-legend-dot--dismissed { background: var(--plans-idle); }\n.plans-legend-dot--unknown { background: var(--plans-line-3); }\n\n/* \u2500\u2500 \u0444\u0438\u043B\u044C\u0442\u0440\u044B \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.plans-filters {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding: 0 12px 10px;\n}\n\n.plans-page .plans-filters { padding: 0 0 10px; }\n\n.plans-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  height: 24px;\n  padding: 0 9px;\n  border: 1px solid var(--plans-line-2);\n  border-radius: 999px;\n  background: transparent;\n  color: var(--plans-label-2);\n  font: inherit;\n  font-size: 11.5px;\n  cursor: pointer;\n  transition: background var(--plans-dur) var(--plans-ease), color var(--plans-dur) var(--plans-ease),\n    border-color var(--plans-dur) var(--plans-ease);\n}\n\n.plans-chip span {\n  color: var(--plans-label-3);\n  font-variant-numeric: tabular-nums;\n}\n\n.plans-chip:hover { background: var(--plans-hover); }\n\n.plans-chip[aria-pressed='true'] {\n  border-color: var(--plans-label-1);\n  background: var(--plans-label-1);\n  color: var(--plans-bg);\n}\n\n.plans-chip[aria-pressed='true'] span { color: inherit; opacity: 0.7; }\n\n/* \u2500\u2500 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u043B\u0430\u043D\u043E\u0432 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.plans-list {\n  list-style: none;\n  margin: 0;\n  padding: 0 12px 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.plans-page .plans-list { padding: 0; }\n\n.plans-plan {\n  border: 1px solid var(--plans-line-2);\n  border-radius: 10px;\n  background: var(--plans-card);\n  overflow: hidden;\n  transition: border-color var(--plans-dur) var(--plans-ease), background var(--plans-dur) var(--plans-ease);\n}\n\n.plans-plan:hover { background: var(--plans-card-hover); }\n.plans-plan--open { border-color: var(--plans-line-3); }\n\n.plans-plan-head {\n  display: flex;\n  align-items: flex-start;\n  gap: 9px;\n  width: 100%;\n  padding: 10px 11px;\n  border: 0;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n\n.plans-dot {\n  flex: none;\n  width: 8px;\n  height: 8px;\n  margin-top: 5px;\n  border-radius: 999px;\n}\n\n.plans-dot--ok { background: var(--plans-ok); }\n.plans-dot--warn { background: var(--plans-warn); }\n.plans-dot--dismissed { background: var(--plans-idle); }\n.plans-dot--unknown { background: var(--plans-line-3); }\n.plans-dot--error { background: var(--plans-error); }\n\n.plans-plan-main {\n  min-width: 0;\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.plans-plan-title {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  color: var(--plans-label-1);\n  font-size: 12.8px;\n  font-weight: 600;\n  line-height: 1.35;\n}\n\n.plans-plan-meta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  gap: 0 5px;\n  color: var(--plans-label-3);\n  font-size: 11.2px;\n  font-variant-numeric: tabular-nums;\n}\n\n.plans-plan-meta .plans-sep { color: var(--plans-line-3); }\n.plans-outcome--ok { color: var(--plans-ok); }\n.plans-outcome--warn { color: var(--plans-warn); }\n\n.plans-chevron {\n  flex: none;\n  width: 14px;\n  height: 14px;\n  margin-top: 3px;\n  color: var(--plans-label-3);\n  transition: transform var(--plans-dur) var(--plans-ease);\n}\n\n/* \u0431\u0435\u0437 \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u043D\u0434\u0435\u0440\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0432\u0435\u0434\u0451\u0442 \u0432 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0449\u0438\u043A: \u0448\u0435\u0432\u0440\u043E\u043D \u0441\u043C\u043E\u0442\u0440\u0438\u0442 \u0432\u043F\u0440\u0430\u0432\u043E */\n.plans-chevron--go { transform: rotate(-90deg); }\n\n.plans-plan--open .plans-chevron { transform: rotate(180deg); }\n\n.plans-plan-body { padding: 0 11px 11px; }\n.plans-plan-body > * + * { margin-top: 9px; }\n\n.plans-feedback {\n  border-left: 2px solid var(--plans-warn);\n  border-radius: 0 var(--plans-radius-sm) var(--plans-radius-sm) 0;\n  background: var(--plans-hover);\n  background: color-mix(in srgb, var(--plans-warn) 9%, transparent);\n  padding: 7px 9px;\n  color: var(--plans-label-2);\n  font-size: 11.8px;\n}\n\n.plans-feedback b {\n  display: block;\n  margin-bottom: 2px;\n  color: var(--plans-label-2);\n  font-size: 10.8px;\n  font-weight: 600;\n  opacity: 0.8;\n}\n\n/* \u043F\u043B\u0430\u043D: markdown \u043E\u0442 \u0445\u043E\u0441\u0442\u0430 \u0438\u043B\u0438 \u0437\u0430\u043F\u0430\u0441\u043D\u043E\u0439 <pre> */\n.plans-doc {\n  padding-top: 9px;\n  border-top: 1px solid var(--plans-line-1);\n  color: var(--plans-label-2);\n  font-size: 12.4px;\n  line-height: 1.6;\n}\n\n.plans-doc--panel {\n  max-height: 300px;\n  overflow: auto;\n}\n\n/* \u0441\u0442\u0440\u043E\u043A\u0430 \u0442\u0435\u043A\u0441\u0442\u0430 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u0430 \u0440\u0430\u0441\u0442\u044F\u0433\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0432\u0441\u044E \u0448\u0438\u0440\u043E\u043A\u0443\u044E \u043A\u043E\u043B\u043E\u043D\u043A\u0443 */\n.plans-page .plans-doc { max-width: 76ch; }\n\n.plans-actions {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n}\n\n.plans-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  height: 26px;\n  padding: 0 10px;\n  border: 1px solid var(--plans-line-2);\n  border-radius: var(--plans-radius-sm);\n  background: var(--plans-card);\n  color: var(--plans-label-1);\n  font: inherit;\n  font-size: 11.8px;\n  cursor: pointer;\n  transition: background var(--plans-dur) var(--plans-ease), border-color var(--plans-dur) var(--plans-ease);\n}\n\n.plans-btn:hover { border-color: var(--plans-line-3); background: var(--plans-card-hover); }\n\n.plans-btn > svg { width: 13px; height: 13px; }\n\n.plans-btn--quiet {\n  padding: 0 4px;\n  border-color: transparent;\n  background: transparent;\n  color: var(--dsw-alias-link, #4176e6);\n}\n\n.plans-btn--quiet:hover { border-color: transparent; background: var(--plans-hover); }\n\n/* \u2500\u2500 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.plans-empty {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 6px;\n  padding: 34px 18px;\n  text-align: center;\n}\n\n.plans-empty svg { color: var(--plans-label-3); }\n\n.plans-empty b {\n  color: var(--plans-label-2);\n  font-size: 12.8px;\n  font-weight: 600;\n}\n\n.plans-empty p {\n  margin: 0;\n  max-width: 250px;\n  color: var(--plans-label-3);\n  font-size: 11.8px;\n}\n\n.plans-code {\n  padding: 1px 5px;\n  border-radius: 4px;\n  background: var(--plans-hover);\n  color: var(--plans-label-2);\n  font-family: var(--plans-mono);\n  font-size: 11.2px;\n}\n\n.plans-error {\n  display: flex;\n  align-items: flex-start;\n  gap: 9px;\n  padding: 10px 11px;\n  border: 1px solid var(--plans-line-2);\n  border-radius: 10px;\n  background: var(--plans-card);\n}\n\n.plans-error p { margin: 0; color: var(--plans-label-2); font-size: 11.8px; }\n.plans-error b { display: block; margin-bottom: 2px; color: var(--plans-label-1); font-size: 12.4px; }\n\n.plans-state { padding: 0 12px 12px; }\n\n.plans-skeleton { display: flex; flex-direction: column; gap: 8px; }\n\n.plans-sk {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  padding: 11px;\n  border: 1px solid var(--plans-line-1);\n  border-radius: 10px;\n}\n\n.plans-sk i {\n  display: block;\n  height: 9px;\n  border-radius: 999px;\n  background: var(--plans-skeleton);\n  animation: plans-pulse 1.6s var(--plans-ease) infinite;\n}\n\n.plans-sk i:nth-child(1) { width: 62%; }\n.plans-sk i:nth-child(2) { width: 38%; height: 7px; }\n\n@keyframes plans-pulse {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0.45; }\n}\n\n/* \u2500\u2500 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.plans-page {\n  padding: 18px 22px 26px;\n  background: var(--plans-bg);\n}\n\n.plans-page-grid {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) 320px;\n  gap: 16px;\n  align-items: start;\n}\n\n/* \u0431\u0435\u0437 \u043F\u0440\u0430\u0432\u043E\u0439 \u043A\u043E\u043B\u043E\u043D\u043A\u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u0432\u0441\u044E \u0448\u0438\u0440\u0438\u043D\u0443 */\n.plans-page-grid--single { grid-template-columns: minmax(0, 1fr); }\n\n.plans-page-list { min-width: 0; }\n\n.plans-side {\n  position: sticky;\n  top: 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.plans-card {\n  padding: 12px 13px;\n  border: 1px solid var(--plans-line-2);\n  border-radius: var(--plans-radius-lg);\n  background: var(--plans-card);\n}\n\n.plans-card-head {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 8px;\n  margin-bottom: 9px;\n}\n\n.plans-card-title { color: var(--plans-label-1); font-size: 12.5px; font-weight: 600; }\n.plans-card-note { color: var(--plans-label-3); font-size: 11px; font-variant-numeric: tabular-nums; }\n\n.plans-tiles {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 8px;\n  margin-bottom: 10px;\n}\n\n.plans-tile {\n  padding: 7px 9px;\n  border: 1px solid var(--plans-line-1);\n  border-radius: var(--plans-radius-md);\n}\n\n.plans-tile b {\n  display: block;\n  color: var(--plans-label-1);\n  font-size: 19px;\n  font-weight: 600;\n  line-height: 1.15;\n  font-variant-numeric: tabular-nums;\n}\n\n.plans-tile span { color: var(--plans-label-3); font-size: 10.8px; }\n.plans-tile--ok b { color: var(--plans-ok); }\n.plans-tile--warn b { color: var(--plans-warn); }\n\n.plans-rows { display: flex; flex-direction: column; margin: 0; }\n\n.plans-row {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 6px 0;\n  border-top: 1px solid var(--plans-line-1);\n  font-size: 11.6px;\n}\n\n.plans-row:first-child { padding-top: 0; border-top: 0; }\n.plans-row dt { margin: 0; color: var(--plans-label-3); }\n.plans-row dd { margin: 0; color: var(--plans-label-1); font-variant-numeric: tabular-nums; }\n\n.plans-row code {\n  color: var(--plans-label-2);\n  font-family: var(--plans-mono);\n  font-size: 11px;\n}\n\n.plans-note { margin: 9px 0 0; color: var(--plans-label-3); font-size: 11px; }\n\n/* \u0443\u0437\u043A\u0430\u044F \u043F\u043E\u0432\u0435\u0440\u0445\u043D\u043E\u0441\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B: \u043E\u0434\u043D\u0430 \u043A\u043E\u043B\u043E\u043D\u043A\u0430 */\n@container (max-width: 760px) {\n  .plans-page-grid { grid-template-columns: minmax(0, 1fr); }\n  .plans-side { position: static; flex-direction: row; flex-wrap: wrap; }\n  .plans-side .plans-card { flex: 1 1 260px; }\n}\n\n/* \u0443\u0437\u043A\u0430\u044F \u043F\u0430\u043D\u0435\u043B\u044C: \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044F\u0442\u0441\u044F, \u043E\u0442\u0441\u0442\u0443\u043F\u044B \u043C\u0435\u043D\u044C\u0448\u0435 */\n@container (max-width: 340px) {\n  .plans-head { padding: 10px 10px 8px; }\n  .plans-summary { padding: 0 10px 8px; }\n  .plans-filters { padding: 0 10px 8px; }\n  .plans-list { padding: 0 10px 10px; }\n  .plans-plan-head { padding: 9px 10px; }\n  .plans-plan-body { padding: 0 10px 10px; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .plans * { transition: none !important; animation: none !important; }\n}\n";

// src/client/styles.js
var STYLE_ID = "dsh-plans-styles";
function injectStyles() {
  if (typeof document === "undefined" || document.head === null) return;
  const existing = document.getElementById(STYLE_ID);
  if (existing !== null) existing.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = panel_default;
  document.head.append(style);
}

// src/client/index.js
var TAB_ID = "dsh-plans";
var TAB_KIND = "plans";
var VIEW_ID = "plans";
var BETTER_TAB_ID = "dsh-plans:plans";
var NS = "dsh-plans";
var VIEW_ORDER = 40;
var inject = ["locale", "remote", "remote.session"];
function attempt(fn) {
  try {
    return fn();
  } catch {
    return void 0;
  }
}
function iconFor(size = 16) {
  return (0, import_react5.createElement)(
    "svg",
    {
      viewBox: "0 0 64 64",
      width: size,
      height: size,
      fill: "none",
      role: "img",
      "aria-hidden": "true",
      focusable: "false"
    },
    (0, import_react5.createElement)("rect", { x: 6, y: 6, width: 52, height: 52, rx: 12, stroke: "currentColor", strokeWidth: 4 }),
    (0, import_react5.createElement)("path", { d: "M18 22h20M18 32h28M18 42h14", stroke: "currentColor", strokeWidth: 4, strokeLinecap: "round" }),
    (0, import_react5.createElement)("circle", { cx: 46, cy: 42, r: 5, fill: "currentColor" })
  );
}
function sessionIdOf(owner) {
  return typeof owner === "string" ? owner : owner?.sessionId;
}
function apply(ctx) {
  const sessionRemote = attempt(() => ctx.remote.session);
  const readPlansWith = (sessionId) => (signal) => sessionRemote === void 0 ? Promise.reject(new Error("the session remote is unavailable")) : readSessionPlans(sessionRemote, sessionId, signal);
  const openPlanWith = (openResource, sessionId) => (callId) => {
    if (openResource !== void 0) openResource(planAddress(sessionId, callId));
  };
  const openPageWith = (sidebarRight) => typeof sidebarRight?.openTab === "function" ? () => sidebarRight.openTab(TAB_KIND) : void 0;
  injectStyles();
  ctx.effect(() => ctx.locale.register(NS, { en, ru }), "dsh-plans: dictionaries");
  const t = ctx.locale.bind(NS);
  ctx.inject(["sidebarRightTabs", "slots", "sidebarRight"], (scoped) => {
    const openResource = attempt(() => scoped.sidebarRight.openResource.bind(scoped.sidebarRight));
    const openPage = openPageWith(scoped.sidebarRight);
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: TAB_ID,
      kind: TAB_KIND,
      priority: "extension",
      title: () => t("tab.title"),
      guide: {
        order: 40,
        title: () => t("guide.title"),
        description: () => t("guide.description"),
        icon: iconFor
      }
    }), "dsh-plans: tab type");
    scoped.effect(() => scoped.slots.inject("sidebar.right.pane.tab", () => scoped.slots.register({
      name: "sidebar.right.pane.tab",
      key: TAB_ID,
      locale: NS,
      inject: (owner) => {
        const sessionId = sessionIdOf(owner);
        return {
          sessionId,
          readPlans: readPlansWith(sessionId),
          openPlan: openPlanWith(openResource, sessionId),
          openPage
        };
      }
    }, PlansPanel)), "dsh-plans: tab body");
  });
  ctx.inject(["betterSidebar"], (scoped) => {
    const sidebarRight = attempt(() => scoped.get("sidebarRight"));
    const openResource = typeof sidebarRight?.openResource === "function" ? sidebarRight.openResource.bind(sidebarRight) : void 0;
    const openPage = openPageWith(sidebarRight);
    scoped.effect(() => scoped.betterSidebar.registerTab({
      id: BETTER_TAB_ID,
      // A plain string: the registry stores the chip title as text.
      title: t("tab.title"),
      description: () => t("guide.description"),
      icon: iconFor,
      component: (props) => {
        const sessionId = props?.scope?.sessionId;
        return (0, import_react5.createElement)(PlansPanel, {
          t,
          sessionId,
          readPlans: readPlansWith(sessionId),
          openPlan: openPlanWith(openResource, sessionId),
          openPage
        });
      }
    }), "dsh-plans: better-sidebar tab");
  });
  ctx.inject(["slots"], (scoped) => {
    const sidebarRight = attempt(() => scoped.get("sidebarRight"));
    const openResource = typeof sidebarRight?.openResource === "function" ? sidebarRight.openResource.bind(sidebarRight) : void 0;
    const openPanel = openPageWith(sidebarRight);
    scoped.effect(() => scoped.slots.inject("conversation.view", () => scoped.slots.register({
      name: "conversation.view",
      id: VIEW_ID,
      order: VIEW_ORDER,
      locale: NS,
      label: () => t("view.title"),
      inject: (owner) => {
        const sessionId = sessionIdOf(owner);
        return {
          sessionId,
          readPlans: readPlansWith(sessionId),
          openPlan: openPlanWith(openResource, sessionId),
          openPanel
        };
      }
    }, PlansPage)), "dsh-plans: page");
  });
}
return module.exports; } });
