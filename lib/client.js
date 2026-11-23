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
  PlansPanel: () => PlansPanel,
  TAB_ID: () => TAB_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// src/plans/log.js
var DSH_TOOL = "exit_plan_mode";
var CLAUDE_TOOL = "ExitPlanMode";
var CALL_KINDS = /* @__PURE__ */ new Set(["tool/call", "tool/ptc-dispatch-start", "tool/ptc-dispatch"]);
var TITLE_PATTERN = /^#\s+(\S[^\r\n]*)/;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

// src/client/presentation.js
var en = {
  "tab.title": "Plans",
  "guide.title": "Plans",
  "guide.description": "Every plan this Session submitted, newest first",
  "panel.heading": "Plans in this Session",
  "panel.subheading": "Oldest first below, newest on top",
  "panel.refresh": "Refresh",
  "panel.loading": "Reading the Session\u2026",
  "panel.empty": "This Session has no submitted plans yet.",
  "panel.emptyHint": "Enter plan mode with /plan, then submit a plan for review.",
  "panel.error": "Could not read the Session: {message}",
  "panel.retry": "Try again",
  "panel.untitled": "Plan {n}",
  "panel.open": "Open plan",
  "panel.approved": "Approved",
  "panel.revise": "Sent back for revision",
  "panel.dismissed": "Dismissed",
  "panel.unknown": "Outcome unknown",
  "panel.imported": "Claude Code",
  "panel.updated": "Updated {time}"
};
var ru = {
  "tab.title": "\u041F\u043B\u0430\u043D\u044B",
  "guide.title": "\u041F\u043B\u0430\u043D\u044B",
  "guide.description": "\u0412\u0441\u0435 \u043F\u043B\u0430\u043D\u044B \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438, \u0441\u0432\u0435\u0436\u0438\u0435 \u0441\u0432\u0435\u0440\u0445\u0443",
  "panel.heading": "\u041F\u043B\u0430\u043D\u044B \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438",
  "panel.subheading": "\u0421\u0432\u0435\u0436\u0438\u0435 \u0441\u0432\u0435\u0440\u0445\u0443",
  "panel.refresh": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
  "panel.loading": "\u0427\u0438\u0442\u0430\u044E \u0436\u0443\u0440\u043D\u0430\u043B \u0441\u0435\u0441\u0441\u0438\u0438\u2026",
  "panel.empty": "\u0412 \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u043F\u043B\u0430\u043D\u043E\u0432 \u0435\u0449\u0451 \u043D\u0435 \u0431\u044B\u043B\u043E.",
  "panel.emptyHint": "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u0440\u0435\u0436\u0438\u043C \u043F\u043B\u0430\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 /plan \u0438 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u043B\u0430\u043D \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443.",
  "panel.error": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0436\u0443\u0440\u043D\u0430\u043B \u0441\u0435\u0441\u0441\u0438\u0438: {message}",
  "panel.retry": "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
  "panel.untitled": "\u041F\u043B\u0430\u043D {n}",
  "panel.open": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043B\u0430\u043D",
  "panel.approved": "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D",
  "panel.revise": "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0443",
  "panel.dismissed": "\u041E\u0442\u043A\u043B\u043E\u043D\u0451\u043D",
  "panel.unknown": "\u0418\u0442\u043E\u0433 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D",
  "panel.imported": "Claude Code",
  "panel.updated": "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E {time}"
};

// src/client/index.js
var TAB_ID = "dsh-plans";
var TAB_KIND = "plans";
var NS = "dsh-plans";
var inject = ["slots", "locale", "remote", "sidebarRight", "sidebarRightTabs"];
var STYLE = {
  root: { display: "flex", flexDirection: "column", gap: "8px", padding: "12px", height: "100%", boxSizing: "border-box", overflowY: "auto", color: "inherit", fontSize: "13px" },
  head: { display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "space-between" },
  heading: { margin: 0, fontSize: "14px", fontWeight: 600 },
  count: { opacity: 0.6, fontVariantNumeric: "tabular-nums" },
  button: { border: "1px solid currentColor", background: "transparent", color: "inherit", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", cursor: "pointer", opacity: 0.85 },
  list: { display: "flex", flexDirection: "column", gap: "6px", margin: 0, padding: 0, listStyle: "none" },
  row: { display: "flex", flexDirection: "column", gap: "2px", width: "100%", textAlign: "left", border: "1px solid currentColor", background: "transparent", color: "inherit", borderRadius: "8px", padding: "8px", cursor: "pointer", opacity: 0.9 },
  rowTitle: { fontWeight: 600, lineHeight: 1.3 },
  meta: { display: "flex", gap: "8px", alignItems: "baseline", opacity: 0.65, fontSize: "12px" },
  note: { opacity: 0.7, margin: 0 },
  error: { color: "inherit", opacity: 0.9, margin: 0, padding: "8px", border: "1px dashed currentColor", borderRadius: "8px" }
};
function statusLabel(status, t) {
  if (status === "approved") return t("panel.approved");
  if (status === "revise") return t("panel.revise");
  if (status === "dismissed") return t("panel.dismissed");
  return t("panel.unknown");
}
function timeLabel(time) {
  if (typeof time !== "number") return "";
  try {
    return new Date(time).toLocaleString();
  } catch {
    return "";
  }
}
function PlansPanel(props) {
  const { t, sessionId, readPlans: read, openPlan } = props;
  const [attempt, setAttempt] = (0, import_react.useState)(0);
  const [state, setState] = (0, import_react.useState)({ status: "loading", plans: [], error: void 0 });
  const refresh = (0, import_react.useCallback)(() => setAttempt((value) => value + 1), []);
  (0, import_react.useEffect)(() => {
    if (typeof sessionId !== "string" || sessionId === "" || typeof read !== "function") {
      setState({ status: "failed", plans: [], error: "no session" });
      return void 0;
    }
    let alive = true;
    const controller = new AbortController();
    setState((current) => ({ status: "loading", plans: current.plans, error: void 0 }));
    read(controller.signal).then(
      (plans) => {
        if (alive) setState({ status: "ready", plans, error: void 0 });
      },
      (error) => {
        if (alive && !controller.signal.aborted) setState({ status: "failed", plans: [], error: String(error?.message ?? error) });
      }
    );
    return () => {
      alive = false;
      controller.abort();
    };
  }, [sessionId, read, attempt]);
  const rows = state.plans.map((plan) => (0, import_react.createElement)(
    "li",
    { key: plan.callId },
    (0, import_react.createElement)(
      "button",
      {
        type: "button",
        style: STYLE.row,
        title: t("panel.open"),
        onClick: () => openPlan(plan.callId)
      },
      (0, import_react.createElement)("span", { style: STYLE.rowTitle }, plan.title ?? t("panel.untitled", { n: plan.n })),
      (0, import_react.createElement)(
        "span",
        { style: STYLE.meta },
        (0, import_react.createElement)("span", null, `#${plan.n}`),
        (0, import_react.createElement)("span", null, statusLabel(plan.status, t)),
        plan.source === "claude" ? (0, import_react.createElement)("span", null, t("panel.imported")) : null,
        timeLabel(plan.time) === "" ? null : (0, import_react.createElement)("span", null, timeLabel(plan.time))
      )
    )
  ));
  let body;
  if (state.status === "loading" && state.plans.length === 0) body = (0, import_react.createElement)("p", { style: STYLE.note }, t("panel.loading"));
  else if (state.status === "failed") {
    body = (0, import_react.createElement)(
      "div",
      { style: STYLE.list, role: "alert" },
      (0, import_react.createElement)("p", { style: STYLE.error }, t("panel.error", { message: state.error ?? "" })),
      (0, import_react.createElement)("button", { type: "button", style: STYLE.button, onClick: refresh }, t("panel.retry"))
    );
  } else if (state.plans.length === 0) {
    body = (0, import_react.createElement)(
      "div",
      { style: STYLE.list },
      (0, import_react.createElement)("p", { style: STYLE.note }, t("panel.empty")),
      (0, import_react.createElement)("p", { style: STYLE.note }, t("panel.emptyHint"))
    );
  } else body = (0, import_react.createElement)("ul", { style: STYLE.list }, rows);
  return (0, import_react.createElement)(
    "div",
    { style: STYLE.root, "data-dsh-plans-panel": "true" },
    (0, import_react.createElement)(
      "div",
      { style: STYLE.head },
      (0, import_react.createElement)("h2", { style: STYLE.heading }, t("panel.heading")),
      (0, import_react.createElement)(
        "span",
        { style: STYLE.meta },
        (0, import_react.createElement)("span", { style: STYLE.count }, String(state.plans.length)),
        (0, import_react.createElement)("button", { type: "button", style: STYLE.button, onClick: refresh }, t("panel.refresh"))
      )
    ),
    body
  );
}
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { en, ru }), "dsh-plans: dictionaries");
  const t = ctx.locale.bind(NS);
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: "extension",
    title: () => t("tab.title"),
    guide: {
      order: 40,
      title: () => t("guide.title"),
      description: () => t("guide.description")
    }
  }), "dsh-plans: tab type");
  ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
    name: "sidebar.right.pane.tab",
    key: TAB_ID,
    locale: NS,
    inject: (owner) => {
      const sessionId = typeof owner === "string" ? owner : owner?.sessionId;
      return {
        sessionId,
        readPlans: (signal) => readSessionPlans(ctx.remote.session, sessionId, signal),
        openPlan: (callId) => ctx.sidebarRight.openResource(planAddress(sessionId, callId))
      };
    }
  }, PlansPanel)), "dsh-plans: tab body");
}
return module.exports; } });
