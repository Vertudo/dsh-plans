/**
 * Dev-only preview: renders the shipped bundle into static HTML.
 *
 * Why it exists: the app UI needs a token to open, and the mock in `mock.html`
 * carries its own copy of the styles. This script renders the *built* client
 * module with the test harness, links the *real* `panel.css`, and writes a page
 * that can be opened and screenshotted — so the code and the approved mock are
 * compared against the same picture.
 *
 * Not published: `design/` is outside the package's `files` list.
 *
 *   node design/render-preview.mjs      # writes design/preview-light.html, preview-dark.html
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReact, expand, flush } from '../tests/harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const code = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
const panelCss = readFileSync(join(root, 'src', 'client', 'panel.css'), 'utf8')

const now = Date.now()
const plans = [
  {
    callId: 'c5',
    n: 5,
    title: 'Дизайн панели «Планы»: карточки, страницы и тёмная тема',
    status: 'revise',
    source: 'dsh',
    time: now,
    markdown: '# Дизайн панели «Планы»\n\n## Цель\n\nЗаменить список планов оформлением в языке DSH и добавить страницу на всю ширину.\n\n## Решения\n\n- Только токены темы — ни одного жёсткого цвета.\n- Состав планов — одна полоса и три счётчика.\n- План открывается в просмотрщике, а не в карточке.\n\n| Вопрос | Решение |\n| --- | --- |\n| Где страница | Вкладка рядом с Chat |\n| Живое обновление | Позже |\n\n```sh\nnpm run verify\n```',
  },
  { callId: 'c4', n: 4, title: 'Спецификация импорта отчёта брокера «Открытие»', status: 'approved', source: 'dsh', time: now - 5_400_000, markdown: '# Спецификация\n\nТекст.' },
  { callId: 'c3', n: 3, title: 'План миграции MSSQL → PostgreSQL для сервиса позиций', status: 'approved', source: 'claude', time: now - 86_400_000, markdown: '# Миграция' },
  { callId: 'c2', n: 2, title: 'Ревизия документации EFTR.DataFeed.Position', status: 'dismissed', source: 'dsh', time: now - 90_000_000, markdown: '# Ревизия' },
  { callId: 'c1', n: 1, title: 'Черновик ADR по переводу Kafka-консьюмеров', status: 'dismissed', source: 'dsh', time: now - 260_000_000, markdown: '# ADR' },
]

/* ── load the shipped bundle and render the two surfaces ───────────────── */

const { react, render } = createReact()
let exports
const lookup = (name) => (name === 'react' ? react : undefined)
globalThis.window = { __ModuleLoader__: { load: ({ factory }) => { exports = factory(lookup) } } }
new Function('window', code)(globalThis.window)

const t = (key) => key
const props = { t, sessionId: '2af261e0-1c1a-4f2e-9a1d-1a2b3c4d5e6f', readPlans: async () => plans, openPlan: () => {}, openPage: () => {}, openPanel: () => {} }

render(exports.PlansPanel, props)
await flush()
const panel = expand(render(exports.PlansPanel, props).tree)
const page = expand(render(exports.PlansPage, props).tree)

/* ── serialize ─────────────────────────────────────────────────────────── */

const EXACT = new Set(['viewBox', 'role', 'title', 'type', 'colSpan', 'rowSpan'])

function attrName(name) {
  if (name === 'className') return 'class'
  if (name === 'strokeWidth') return 'stroke-width'
  if (name === 'strokeLinecap') return 'stroke-linecap'
  if (name.startsWith('aria-') || name.startsWith('data-') || EXACT.has(name)) return name
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function styleText(style) {
  return Object.entries(style).map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}`).join(';')
}

function serialize(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (Array.isArray(node)) return node.map(serialize).join('')
  if (typeof node === 'string' || typeof node === 'number') return String(node).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  if (typeof node !== 'object') return ''
  const { type, props: own } = node
  const attributes = []
  for (const [key, value] of Object.entries(own ?? {})) {
    if (key === 'children' || key === 'onClick' || key === 'key' || value === undefined || value === null) continue
    if (typeof value === 'function') continue
    if (key === 'style') attributes.push(`style="${styleText(value)}"`)
    else if (typeof value === 'boolean') attributes.push(`${attrName(key)}="${value}"`)
    else attributes.push(`${attrName(key)}="${String(value).replaceAll('"', '&quot;')}"`)
  }
  return `<${type}${attributes.length > 0 ? ` ${attributes.join(' ')}` : ''}>${serialize(own?.children)}</${type}>`
}

/* ── the page ──────────────────────────────────────────────────────────── */

const tokens = `
  body {
    --dsw-alias-bg-base: #ffffff;
    --dsw-alias-card-fill: #fafafa;
    --dsw-alias-card-fill-hover: #f2f3f5;
    --dsw-alias-border-l1: rgba(0, 0, 0, 0.04);
    --dsw-alias-border-l2: rgba(0, 0, 0, 0.10);
    --dsw-alias-border-l3: rgba(0, 0, 0, 0.12);
    --dsw-alias-label-primary: #0f1115;
    --dsw-alias-label-secondary: #61666b;
    --dsw-alias-label-tertiary: #81858c;
    --dsw-alias-interactive-bg-hover: rgba(38, 49, 72, 0.06);
    --dsw-alias-state-success-primary: #22c55e;
    --dsw-alias-state-warn-primary: #f59e0b;
    --dsw-alias-state-error-primary: #ec1313;
    --dsw-alias-state-idle-primary: #d4d4d4;
    --dsw-alias-bg-skeleton: rgba(0, 0, 0, 0.04);
    --dsw-alias-border-selected: #4176e6;
    --dsw-alias-link: #4176e6;
    --dsw-radius-sm: 6px;
    --dsw-radius-md: 8px;
    --dsw-radius-lg: 12px;
    --ds-transition-duration-fast: 140ms;
    --ds-ease-in-out: cubic-bezier(0.2, 0.7, 0.3, 1);
    background: #eef0f3;
    margin: 0;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  }
  body[data-ds-dark-theme] {
    --dsw-alias-bg-base: #151517;
    --dsw-alias-card-fill: #212123;
    --dsw-alias-card-fill-hover: #2a2a2d;
    --dsw-alias-border-l1: rgba(255, 255, 255, 0.06);
    --dsw-alias-border-l2: rgba(255, 255, 255, 0.12);
    --dsw-alias-border-l3: rgba(255, 255, 255, 0.16);
    --dsw-alias-label-primary: #f9fafb;
    --dsw-alias-label-secondary: #cfd3d6;
    --dsw-alias-label-tertiary: #adb2b8;
    --dsw-alias-interactive-bg-hover: rgba(255, 255, 255, 0.08);
    --dsw-alias-state-error-primary: #f25a5a;
    --dsw-alias-state-idle-primary: #545557;
    --dsw-alias-bg-skeleton: rgba(255, 255, 255, 0.08);
    --dsw-alias-border-selected: #7aaaff;
    --dsw-alias-link: #7aaaff;
    background: #0f0f10;
  }
  .frame { width: 400px; height: 860px; overflow: hidden; border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; background: var(--dsw-alias-bg-base); }
  .frame--page { width: 1440px; height: auto; }
  .caption { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); margin: 0 0 8px; }
  .shots { display: flex; flex-direction: column; gap: 28px; align-items: flex-start; }
`

function pageFor(theme, shots) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>dsh-plans — превью ${theme}</title>
<style>${tokens}${panelCss}</style>
</head>
<body${theme === 'dark' ? ' data-ds-dark-theme' : ''}>
<div class="shots">${shots}</div>
</body>
</html>
`
}

const panelShot = `<section><p class="caption">Панель — реальные компоненты и panel.css</p><div class="frame">${serialize(panel)}</div></section>`
const pageShot = `<section><p class="caption">Страница — реальные компоненты и panel.css</p><div class="frame frame--page">${serialize(page)}</div></section>`

writeFileSync(join(here, 'preview-light.html'), pageFor('light', panelShot + pageShot))
writeFileSync(join(here, 'preview-dark.html'), pageFor('dark', panelShot + pageShot))
console.log('wrote design/preview-light.html and design/preview-dark.html')
