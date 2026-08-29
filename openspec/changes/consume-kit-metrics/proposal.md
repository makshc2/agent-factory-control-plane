# Proposal: consume-kit-metrics

## Why

Екран аналізу вже читає `metrics.json`, але `parseMetricsFile` бере лише `spend.inputTokens|outputTokens|totalTokens|costUsd`. Типовий журнал agent-orchestrator-kit v0.5.0 має `sessions`, `totals`, `phases`, `spendByPlatform`, `spendByModel`, тоді як `spend.*` усі `null` — таблиця показує `—` і `source: unknown`, ніби файлу немає. Оператор потребує повний журнал kit на `/analysis`, без змін живого борду.

## What Changes

- Розширити view-model `factory-board.change-metrics.v1`: парсити повний журнал kit v1 і прикріплювати його до рядка аналізу (`journal`), зберігаючи git-span і spend-overlay.
- Відрізняти валідний розпарсений журнал (навіть з усіма `spend.* === null`) від відсутнього/невалідного файлу: `journal.source === 'metrics-file'` vs `'unknown'`.
- Комірки Спека / Рев’ю / Apply / Усього надають перевагу kit `phases.*.durationMs` / `totals.durationMs`, якщо число не `null`; інакше git-span. Tooltip MUST називати джерело. Модалка деталей MUST показувати обидва часи.
- Таблиця аналізу: нові колонки Сесії, Lead time, Моделі; бейдж «триває», якщо `pending` не `null`. CSV: нові англійські заголовки журналу.
- Агенти: за наявності сесій/фаз — ролі, моделі, runtime і платформи з журналу; інакше чинний розбір `handoff.md`.
- Жива таблиця, 4 KPI, полер, `refreshProject` / `refreshAll` / `usePoller` і drawer деталей MUST NOT почати читати `metrics.json`.

**Design: none** — `require_design_brief: false`; UI фіксується в `design.md`.

## Non-goals

- Cursor / Amp vendor API і вигадування USD з Amp credits.
- Запис `metrics.json` з борду.
- Перейменування kit Runtime.
- П’ятий KPI на живому борді; колонки spend/токенів на `/`.
- Полер, що вантажить аналіз, архіви, `metrics.json` або коміти.
- `metrics.json` у live drawer деталей проєкту.
- Hydra SSO.
- Суб’єктивний бал спеки 1–5.
- Пагінація комітів >100.
- Зміна ключа реєстру `factory-board.projects.v1`.
- Нові npm-пакети; `fetch(` у api-модулях.

## Capabilities

### New Capabilities

- (немає)

### Modified Capabilities

- `change-metrics`: повний журнал kit v1 у view-model; чесність `journal.source` vs `spend.source`; kit-тривалості поруч із git-span; пріоритет kit у комірках таблиці; агенти/моделі/платформи з сесій; колонки Сесії / Lead time / Моделі / pending; розширений CSV; модалка з meta / totals / platforms / models / phases / sessions.

## Acceptance criteria

- Валідний kit-файл як у архіві `fix-metrics-model-and-spend` (7 сесій, `spend.*` усі `null`) дає `journal.source === 'metrics-file'`, `totals.sessions === 7`, робочий час з `totals.durationMs`, і MUST NOT виглядати як порожній `unknown`.
- Невалідний JSON / відсутній файл: `journal.source === 'unknown'`, рядок не падає, UI `—`.
- `ampCredits` не додаються до `costUsd`; окреме поле / колонка CSV.
- Таблиця `/analysis/:projectId` має нові колонки українською; null → `—`; нуль лишається нулем.
- CSV зберігає старі заголовки і додає `sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits`.
- `DETAIL_ARTIFACTS` у `board.js` без `metrics.json`; тести полера не послаблюються.
- `npm run lint`, `npm test`, `npm run build` завершуються з кодом 0.

## Impact

- Код: `src/utils/changeMetrics.js` (+ spec), `src/views/AnalysisView.vue` (+ spec), `src/components/AnalysisDetailsModal.vue` (+ spec), `src/utils/changeMetrics.spec.js`; стор `analysis.js` лишає HTTP, лише споживає багатший парсер; тести `analysis.spec.js` / `AnalysisView.spec.js` / `AnalysisDetailsModal.spec.js` оновити під журнал.
- API / стор борду: без нових ендпоінтів; сигнатури `listChanges`, `fetchArtifact`, `fetchBranchHead`, `parseHandoff`, `parseTasksProgress`, `parseReviewVerdict` заморожені.
- Залежності: без нових npm.
- Реєстр: `factory-board.projects.v1` без змін.
- Роутер: `/analysis/:projectId` без нової адреси.
