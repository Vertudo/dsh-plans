# Макет и превью

Рабочие артефакты дизайна, в пакет не входят (`files` в `package.json` каталог не перечисляет).

- `mock.html` — согласованный макет: панель в правом сайдбаре (400px), страница на всю ширину (1440px), три состояния панели (загрузка, пусто, ошибка). Светлая и тёмная темы переключаются в шапке.
- `render-preview.mjs` — рендерит **собранный** клиентский модуль (`lib/client.js`) в статический HTML с настоящим `src/client/panel.css`: так реализация сверяется с макетом, а не с его копией.
- `preview-light.html`, `preview-dark.html` — результат рендерера, генерируются заново; в репозиторий не коммитятся.
- `screens/` — снимки: `panel-light`, `panel-dark`, `page-light`, `page-dark`, `states-light` (макет) и `real-light`, `real-dark` (собранный код).

Открыть макет: `file:///C:/CloudFactory/repo/dsh/dsh-plans/design/mock.html`. Пересобрать превью: `node design/render-preview.mjs` (нужна свежая `lib/client.js`).

Значения цветов в макете — реальные токены DSH 0.2.2-rc.5 из `dsh-client-ui-theme/src/styles/design-platform.css` (светлая и тёмная темы). В коде эти значения не переносятся: `src/client/panel.css` использует `var(--dsw-alias-…)`; макет показывает, как токены читаются на глаз.

Снимки макета делаются в режиме одной секции: `document.body.dataset.shot = 'panel' | 'page' | 'states'`, тема — `document.documentElement.dataset.theme`. Превью снимается как есть, тема задана в самом файле.
