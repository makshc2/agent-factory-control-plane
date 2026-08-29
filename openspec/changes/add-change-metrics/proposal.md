# Proposal: add-change-metrics

## Why

Оператор планує інші проєкти і потребує точних, придатних до аналізу даних про роботу AI-агентів: токени/гроші, інтервали spec / review / apply, факти якості спеки, виконані задачі, ролі агентів. Живий борд показує лише поточний OpenSpec-статус активних змін; облік spend і лістинг архіву були явними non-goal `board-project-details`, тож після `/opsx:archive` історія зникає з огляду.

## What Changes

- Новий маршрут `/analysis` («Аналіз змін») з таблицею view-model `factory-board.change-metrics.v1` для **активних і архівних** змін усіх зареєстрованих проєктів; жива таблиця борду й чотири KPI **без** п’ятої метрики і **без** колонки spend.
- Метрики збираються з git-артефактів (handoff, tasks, review, proposal, decisions, коміти за шляхом) і опційного `metrics.json`; відсутні дані → `null` / UI `—`, ніколи вигаданий `0` чи `$0`.
- Клієнти GitHub/GitLab отримують нові експорти `listArchivedChanges`, `fetchArchivedArtifact`, `listCommitsByPath` **поруч** із замороженими `listChanges` / `fetchArtifact` / `fetchBranchHead`.
- Окремий Pinia-стор `useAnalysisStore`; полер, `refreshProject` / `refreshAll` / `usePoller` MUST NOT читати архів, `metrics.json`, історію комітів чи аналіз.
- Експорт CSV (UTF-8 з BOM) з англійськими заголовками для таблиць Excel.

**Design: none** — `require_design_brief: false`, Figma немає; UI фіксується в `design.md`.

## Non-goals

- Cursor Admin/dashboard API, Amp ledger, будь-які vendor billing API.
- Власний бекенд або проксі; запис `metrics.json` з борду.
- Зміна handoff Runtime у agent-orchestrator-kit з `local|cloud` на `cursor|amp|cloud`.
- Очікування телеметрійного контракту kit: ця зміна — відкладений наступник обліку токенів з `openspec/config.yaml`, але **лише** git-артефакти + опційний `metrics.json`, не live billing.
- Hydra SSO і multi-tenant.
- Зміна колонок або KPI живого `factory-board`.
- ETag; пагінація понад чинне `per_page=100`.
- Лістинг архівних змін у живій таблиці борду (`listChanges` і далі пропускає `archive`).
- Суб’єктивна оцінка якості спеки 1–5.

## Capabilities

### New Capabilities

- `change-metrics`: канонічна view-model зміни (активна або архівна), правила деривації span/spend/агентів, чесність `null` проти `0`, overlay `metrics.json`, аналіз-в’ю, семантика git-span («інтервал комітів файлів, не wall-clock сесії»), експорт CSV.

### Modified Capabilities

- `artifact-ingestion`: лістинг архівних змін; читання архівних артефактів; коміти за шляхом; читання `metrics.json`; відсутня тека archive / відсутній `metrics.json` не є помилкою полінгу проєкту (на рівні аналізу — порожній список / `null`).
- `board-polling`: цикл опитування MUST NOT завантажувати аналіз, архіви, `metrics.json` або історії комітів за шляхом.
- `factory-board`: навігація з огляду на `/analysis`; жива таблиця й KPI без нових колонок і без 5-го лічильника. Лістинг архіву на живій таблиці не вимагається.

## Acceptance criteria

- Маршрут `/analysis` показує «Аналіз змін»; з борду є посилання «Аналіз», з аналізу — «Борд» на `/`. Жива таблиця борду й чотири KPI (проєкти, активні зміни, blocked, помилки) без змін складу; колонки spend/токенів на борді немає.
- Аналіз завантажується лише при відкритті `/analysis` (або кнопці «Оновити» там); `refreshProject` / `refreshAll` / `usePoller` не викликають `listArchivedChanges`, `listCommitsByPath`, `metrics.json` і `loadAnalysis`.
- Рядки аналізу включають активні зміни (`openspec/changes/<name>/`) і архівні (`openspec/changes/archive/<folder>/`); живий `listChanges` і далі виключає теку `archive`.
- Відсутні spend/тривалість рендеряться як `—`; `null` MUST NOT показуватися як `0`, `$0` або `$0.00`. Кожне derived duration/spend поле має видиме `source`.
- Тривалість span = різниця min/max дат комітів відповідних шляхів (порожній набір → `durationMs` `null`, не `0`; один коміт → `0` дозволено) з tooltip «інтервал комітів файлів, не wall-clock сесії».
- Невалідний або відсутній `metrics.json` дає spend `null` і `source: 'unknown'` і MUST NOT валити рядок зміни.
- Кнопка «Експорт CSV» завантажує `factory-board-analysis.csv` (UTF-8 з BOM); за відсутності рядків кнопка неактивна.
- `npm run lint`, `npm test` та `npm run build` завершуються без помилок.

## Impact

- Код: нові `src/utils/changeMetrics.js`, `src/stores/analysis.js`, `src/views/AnalysisView.vue`; зміни `src/api/github.js`, `src/api/gitlab.js`, `src/router/index.js`, `src/views/BoardView.vue`, `src/styles.css`, `src/App.spec.js`, `src/stores/board.spec.js`, `src/views/BoardView.spec.js`; тести Vitest/VTU.
- API: GET contents/tree `openspec/changes/archive`; raw-файл архівного артефакту; GET commits з `path` (`per_page=100`); читання `metrics.json` через ті самі raw-канали, що й інші артефакти — лише зі стора аналізу.
- Залежності: нові npm-пакети не потрібні; HTTP лише Axios `createHttp` (без `fetch` у api-модулях).
- Роутер: новий маршрут `{ path: '/analysis', name: 'analysis' }`; `/` лишається Factory board.
- Безпека: ті самі read-only токени; більше запитів лише на екрані аналізу.
- Реєстр: ключ localStorage `factory-board.projects.v1` без змін.
- Сигнатури `listChanges`, `fetchArtifact`, `fetchBranchHead`, `parseHandoff`, `parseTasksProgress`, `parseReviewVerdict` без змін.
