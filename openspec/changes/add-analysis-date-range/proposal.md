## Why

`/analysis/:projectId` зараз тягне всю історію (усі активні + усі архіви) і на кожну зміну робить N+1 fan-out артефактів і комітів. Оператор не може обмежити вибірку календарним вікном, тож аналіз старих архівів щоразу платить повний HTTP-рахунок без власного analysis API.

Design: none

## What Changes

- Період ріже **які зміни вантажити** (`loadChange` / fan-out). Для вже завантаженої зміни git-span і spend/journal MUST NOT переписуватися вікном.
- За замовчуванням — останні 7 календарних днів у поясі Києва (`from = today-6`, `to = today`, обидва кінці включно). Контроль «весь час» відновлює чинну поведінку (усі активні + усі архіви через `loadChange`).
- У `.board-filters` на `/analysis/:projectId` — два нативні `<input type="date">` (from/to) і контроль «весь час». Без VueDatePicker, Quasar date і нової npm-бібліотеки.
- Listing архіву (`contents`/`tree`) лишається без дат. `loadChange` для архіву — лише якщо `archivedAt` ∈ `[from,to]`. Усі активні — завжди. Архів без префікса `YYYY-MM-DD-` (`archivedAt === null`) — включати. У режимі «весь час» skip немає.
- Зміна from/to або «весь час» ↔ вікно → повторний HTTP `loadAnalysis`. Пошук і фільтр усі/активні/архів лишаються клієнтськими (без HTTP).
- Ключ свіжості Pinia = `projectId` + період. Back з `/analysis/:projectId/metrics/:changeRef` MUST NOT ганяти повний `loadAnalysis`, якщо рядки цього ключа вже є. Оверлей keep розширити ключем періоду, не ламати чинний оверлей.
- CSV = завантажені рядки поточного вікна (колонки/заголовки без змін).
- `listCommitsByPath` MUST NOT отримувати `since`/`until`.

## Capabilities

### New Capabilities

(немає)

### Modified Capabilities

- `change-metrics`: період як HTTP-фільтр завантаження; не всі архіви стають рядками у вікні; клієнтські фільтри лишаються пошук + усі/активні/архів; CSV і оверлей/skip-refetch — за ключем `projectId`+період; заборона `since`/`until` на комітах.

## Impact

- Код: `src/stores/analysis.js` (+ spec), `src/views/AnalysisView.vue` (+ spec), `src/views/AnalysisDetailsView.vue` (+ spec), новий `src/utils/analysisPeriod.js` (+ spec). За потреби дрібні стилі `.board-filters` у `src/styles.css`.
- Формули `src/utils/changeMetrics.js` (span/spend) — без змін. `src/stores/board.js`, `src/composables/usePoller.js`, жива таблиця `/`, KPI — без змін.
- API GitHub/GitLab: сигнатури `listCommitsByPath` / listing архіву без дат. Не додавати analysis backend.
- Залежності: без нових npm. Vue 3 `<script setup>`, Pinia, Axios, JavaScript (без TypeScript).
- Роутер: існуючі `/analysis/:projectId` і `/analysis/:projectId/metrics/:changeRef`. Без обов’язкового sync дат у query.

## Non-goals

- Новий backend / analysis API.
- `since`/`until` на listing комітів.
- Перерахунок span/spend під вікно.
- VueDatePicker / Quasar date / нова npm.
- Figma / design-brief.
- Зміна живої таблиці `/`, KPI, полера.
- Hydra SSO.
- Фільтр активних змін за датою створення (активні завжди).
- Deep-link дат у URL query.

## Acceptance criteria

- Перше відкриття `/analysis/:projectId`: вікно 7 днів Київ (`from = today-6`, `to = today`); активні завжди в рядках; архів з `archivedAt` поза вікном не стає рядком; listing архіву все одно викликається.
- «Весь час»: `loadChange` для всіх активних і всіх архівів (як зараз).
- Архів `hotfix` (`archivedAt === null`) у вікні — рядок є.
- Зміна from/to або «весь час» ↔ вікно викликає HTTP `loadAnalysis`; зміна пошуку або усі/активні/архів — ні.
- `from > to`: немає HTTP; видиме повідомлення валідації.
- Back з деталей того самого `projectId` і періоду: немає повного `loadAnalysis`; картки лишаються; оверлей не спалахує.
- Зміна періоду: новий load; оверлей лише якщо немає рядків цього ключа.
- Кожен виклик `listCommitsByPath` — лише `(project, path)`, без `since`/`until`.
- CSV містить завантажені рядки вікна і не містить пропущених архівів; заголовки без змін.
- Порожнє вікно після успішного load: «Немає даних для аналізу.»
- Жива таблиця `/` і полер без змін поведінки.
