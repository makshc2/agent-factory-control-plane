## Context

Мотивація — `proposal.md` → Why. Контракт — delta `specs/change-metrics/spec.md`. Реалізація вже в HEAD (закомічена); apply = верифікація коду проти delta-спеки, вузькі тести, build/lint.

Джерело правди kit (README `agent-orchestrator-kit`, «Для дашбордів»): межі й тривалість фази лише з `phases.<phase>.startedAt` / `endedAt` / `durationMs` (git log MUST NOT бути джерелом); headline-вартість — `spend.costUsdTotal` (також на `phases.*`, `spendByPlatform.*`, `spendByModel[]`, `sessions[]`); `costUsdTotal` = сума по сесіях billed `costUsd`, а де billed немає — `costUsdEstimated`; Amp credits ніколи не входять. Кожна `phases.<phase>` має `startedAt` / `endedAt` / `leadTimeMs` (wall clock фази) і `durationMs` (сума робочого часу сесій).

Чинний код у дереві (не вигадувати інший):

- `src/utils/changeMetrics.js` — константи ключів `SPEND_KEYS`, `PHASE_NUMBER_KEYS`, `PLATFORM_NUMBER_KEYS`, `SESSION_NUMBER_KEYS`, `MODEL_SPEND_KEYS`, `SOURCE_NUMBER_KEYS`; `parsePhase` через `coerceIsoTimestamp`; `spanFromCommits`, `spanFromPhase`, `spanFromJournal`, `preferDuration`, `recordedSpendField` (обхід overlay → journal.spend → платформи → моделі → сесії → фази), `recordedCostUsd`, `recordedEstimatedCostUsd`, `recordedTotalCostUsd`, `resolveDisplayedCost`, `buildChangeMetrics`, `metricsToCsv` з `CSV_HEADER`.
- `src/views/AnalysisView.vue` — `spanTitle`, `preferredDurationTitle`, `costLabel`, `costTitle`; поля Спека / Рев’ю / Apply / Усього через `preferDuration(row.kitTimes?.phases?.X, row.spans?.X)`.
- `src/components/AnalysisDetailsModal.vue` — `usdLabel`, `costLabel`, `spanCard`, `spendRows`, `spanCards`, `spansFromKit`, `phaseRows`; секція «Фази OpenSpec (інтервали)».
- Тести: `src/utils/changeMetrics.spec.js`, `src/views/AnalysisView.spec.js`, `src/components/AnalysisDetailsModal.spec.js` (99 тестів у 4 файлах зелені). Запуск лише вузько: `./node_modules/.bin/vitest run <файли> --maxWorkers=1`; повний `npm test` не запускати.

Стек: Vue 3 `<script setup>`, Pinia, JavaScript без TypeScript, без Options API, без коментарів, без нових npm. Design-brief / Figma: немає.

## Goals / Non-Goals

**Goals:**

- Інтервали `spans.*` з `phases.*` журналу; git-коміти лише fallback з незмінною формулою.
- `costUsdTotal` на всіх рівнях журналу; headline-вартість = total → billed → оцінка; результат резолюції з `billedCostUsd` / `estimatedCostUsd` / `source`.
- Tooltip і сторінка деталей чесно називають джерело (kit-span vs коміти; разом / рахунок / оцінка).
- CSV: `cost_usd_total` останній стовпець.

**Non-Goals:**

- v2-поля сесій `sourceIds` / `sourceTotals` / `byModel`; парсинг дат; сітка карток; конвертація Amp credits; vendor API; запис `metrics.json`.
- Прибирання запитів комітів (`listCommitsByPath`) — вони потрібні для fallback.

## Decisions

### D1. Span з фази журналу, git — лише fallback

`spanFromPhase(phase)`: `null`, якщо `phase` не об’єкт або обидві дати відсутні; інакше `{ startedAt, endedAt, durationMs: leadTimeMs ?? (endedAt − startedAt), commitCount: null, source: 'kit-sessions' }`. Дати проходять `coerceIsoTimestamp` (та сама канонізація, що інші timestamps). `durationMs` з `leadTimeMs` — бо це wall clock фази за kit; різниця дат — лише коли kit не дав `leadTimeMs`.

`spanFromJournal(journal)`: min `startedAt` / max `endedAt` по `PHASE_KEYS` і `sessions[]` (порівняння ISO-рядків, як у `minString` / `maxString` для комітів); `durationMs: totals.leadTimeMs ?? різниця`; `null`, якщо жодної дати.

`buildChangeMetrics`: `spec|review|apply = spanFromPhase(journal.phases.X) ?? spanFromCommits(commits.X)`; `change = spanFromJournal(journal) ?? spanFromCommits(unique(spec+review+apply))`. Журнал парситься до spans.

**Альтернатива (відкинута):** брати `sessions[]` фази для span Спека/Рев’ю/Apply — kit уже агрегує це в `phases.*`, а сесії можуть бути без `phase`. Для `change` сесії додаються, бо фаза `other` / сесії без фази інакше випадуть із загального інтервалу.

**Альтернатива (відкинута):** прибрати git fallback — legacy `metrics.json` без дат фаз і зміни без журналу лишилися б без інтервалів.

### D2. Три джерела показаної тривалості

`preferDuration(kitMs, span)`: скінченний `kitMs` → `{ durationMs: kitMs, source: 'kit-sessions' }`; інакше `span.source === 'kit-sessions'` → `{ durationMs: span.durationMs ?? null, source: 'kit-span' }`; інакше `{ durationMs: span?.durationMs ?? null, source: 'git-commits' }`. `'kit-span'` потрібен, щоб tooltip (`preferredDurationTitle` → `spanTitle`) відрізняв межі фази від часу сесій і від комітів. `spanTitle` для `source === 'kit-sessions'` → `${початок} – ${кінець}, межі фази за сесіями kit (metrics.json), не коміти` (дати `formatKyivDateTime` або `—`); для git — чинний рядок з `комітів: N`.

### D3. Резолюція вартості з пріоритетом `costUsdTotal`

`recordedTotalCostUsd(row) = recordedSpendField(row, 'costUsdTotal')` — той самий обхід, що billed / оцінка (overlay → `journal.spend` → сума платформ → сума моделей → сума сесій → сума фаз). `resolveDisplayedCost(row)` рахує всі три обходи і повертає `{ costUsd, estimated, billedCostUsd, estimatedCostUsd, source }` за правилами delta-спеки: `total` (з `estimated = billed == null`) → `billed` → `estimated` → `none`.

**Чому total, а не billed+оцінка локально:** kit уже підсумував по сесіях, де billed є — billed, інакше оцінка; локальна сума billed + оцінка подвоїла б сесії, що мають обидва поля. Борд MUST NOT рахувати `costUsdTotal` самостійно.

**Чому `≈` лише без billed:** total з billed-частиною — це рахунок плюс оцінка; помічати весь рядок як оцінку було б хибно, а tooltip показує складові.

Розширена форма результату сумісна зі старими споживачами (`costUsd`, `estimated`, `estimatedCostUsd` лишаються).

### D4. UI: комірка, tooltip, сторінка деталей

`AnalysisView.vue` `costTitle`: при `source === 'total'` — `разом (costUsdTotal)` + `: ` + наявні частини `$X.XX billed` / `≈ $Y.YY kit` через ` + `; інші гілки без змін. `costLabel` без змін (`≈` за `estimated`).

`AnalysisDetailsModal.vue`:

- `usdLabel(value, estimated)` → `—` / `$X.XX` / `≈ $X.XX`; `costLabel(item)` для записів журналу: `costUsdTotal` (з `≈`, якщо `item.costUsd` не скінченне) → `costUsd` → `≈ costUsdEstimated` → `—`.
- `spendRows`: «Вартість» = `usdLabel(cost.costUsd, cost.estimated)`, «Вартість · рахунок» = `usdLabel(cost.billedCostUsd, false)`, «Вартість · оцінка kit» = `usdLabel(cost.estimatedCostUsd, true)`.
- `spanCard`: «Комітів» лише для не-kit; «Джерело» = `сесії kit (metrics.json)` / `коміти файлів`; `spansFromKit` = хоч одна картка з kit-джерелом → підзаголовок секції «Фази OpenSpec (інтервали)».
- `phaseRows`: `startedAt` / `endedAt` через `formatKyivDateTime`, `leadTime` через `formatDuration(item.leadTimeMs)`; рядки «Початок», «Кінець», «Lead time» перед «Тривалість».

### D5. CSV

`CSV_HEADER` отримує `,cost_usd_total` в кінці; клітинка — `csvCell(spend.costUsdTotal)` після `cost_usd_estimated` (overlay без обходу журналу, як `cost_usd` / `cost_usd_estimated`). Старі індекси колонок не зсуваються.

## Risks / Trade-offs

- [Змішані журнали: одна фаза з датами, інша без] → per-phase fallback: kit-span для однієї, git-span для іншої; підзаголовок деталей каже «kit», якщо хоч один span з kit, а рядок «Джерело» кожної картки уточнює.
- [`spanFromJournal` бере min/max по ISO-рядках] → усі дати канонізовані `coerceIsoTimestamp` у `toISOString()`; некоректні рядки лишаються як є і можуть порівнюватися лексикографічно неправильно — так само, як у `spanFromCommits`; парсинг дат поза скоупом.
- [Сума `costUsdTotal` по платформах / сесіях може подвоїти, якщо kit дублює запис] → той самий ризик і формула, що в `recordedCostUsd`; не змінювати.
- [Legacy overlay: `costUsdTotal` відсутній, а billed є] → `source === 'billed'`, поведінка як до зміни.
- [Той самий commit містить табличну розмітку карток деталей (`.analysis-details-table`)] → поза скоупом цієї зміни (макет); вимоги делти не залежать від розмітки, тести читають підписані рядки.

## Migration Plan

Немає зміни localStorage / env / реєстру / API. Відкат — revert трьох файлів `src/` і трьох spec-файлів: інтервали знову з комітів, вартість без total. `metrics.json` пише kit; legacy-файли працюють без міграції.

## Open Questions

Немає — поведінка зафіксована в коді й decision brief.
