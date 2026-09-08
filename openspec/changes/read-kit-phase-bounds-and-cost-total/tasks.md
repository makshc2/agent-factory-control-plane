# Tasks: read-kit-phase-bounds-and-cost-total

Реалізація вже в HEAD (закомічена); apply = верифікація кожної задачі проти delta-спеки, вузькі тести, build/lint. Повний `npm test` не запускати.

## 1. Парсер metrics.json

- [x] 1.1 Читати `costUsdTotal` і межі фаз у журналі
  Files: src/utils/changeMetrics.js
  Do: JavaScript без TypeScript і коментарів. Додати `'costUsdTotal'` до `SPEND_KEYS`, `PHASE_NUMBER_KEYS`, `PLATFORM_NUMBER_KEYS`, `SESSION_NUMBER_KEYS`, `MODEL_SPEND_KEYS`, `SOURCE_NUMBER_KEYS`; додати `'leadTimeMs'` до `PHASE_NUMBER_KEYS`. У `emptyPlatformSpend`, `emptyJournal().spend`, `parseSpendFields` і overlay `parseMetricsFile` додати `costUsdTotal: null` за замовчуванням (overlay копіює `journal.spend.costUsdTotal`; `source === 'metrics-file'`, якщо будь-яке з шести чисел скінченне). У `parsePhase` додати `startedAt: coerceIsoTimestamp(raw.startedAt)` і `endedAt: coerceIsoTimestamp(raw.endedAt)`. Число береться лише якщо `typeof === 'number' && Number.isFinite`, інакше `null`; борд MUST NOT обчислювати `costUsdTotal` з `costUsd`/`costUsdEstimated` і MUST NOT додавати `ampCredits`.
  Done-when: `grep -c "costUsdTotal" src/utils/changeMetrics.js` ≥ 10; `parseMetricsFile('{"spend":{"costUsdTotal":21.0779}}')` дає `costUsdTotal === 21.0779` і `source === 'metrics-file'`; `parseMetricsFile('{"spend":{"costUsdTotal":"21.07"}}')` дає `costUsdTotal === null`; `parseKitMetrics` для фази з `startedAt`/`endedAt`/`leadTimeMs` зберігає ISO-рядки і число; `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "costUsdTotal"` зелений.

- [x] 1.2 Span з фази журналу і span усієї зміни
  Files: src/utils/changeMetrics.js
  Do: Експортувати `spanFromPhase(phase)`: `null`, якщо `phase` не plain-об’єкт або обидві `coerceIsoTimestamp(phase.startedAt)` / `coerceIsoTimestamp(phase.endedAt)` є `null`; інакше `{ startedAt, endedAt, durationMs: finiteNumber(phase.leadTimeMs) ?? durationMsFrom(startedAt, endedAt), commitCount: null, source: 'kit-sessions' }`. Експортувати `spanFromJournal(journal)`: зібрати рядкові `startedAt` / `endedAt` з `journal.phases[key]` для всіх `PHASE_KEYS` і з `journal.sessions[]`; якщо жодної дати — `null`; інакше `{ startedAt: minString(started), endedAt: maxString(ended), durationMs: finiteNumber(journal.totals.leadTimeMs) ?? durationMsFrom(startedAt, endedAt), commitCount: null, source: 'kit-sessions' }`. У `buildChangeMetrics` парсити журнал до spans і ставити `spec = spanFromPhase(journal.phases.spec) ?? spanFromCommits(commitMap.spec)`, аналогічно `review`, `apply`; `change = spanFromJournal(journal) ?? spanFromCommits(uniqueCommits([...spec, ...review, ...apply]))`. Формулу `spanFromCommits` не змінювати.
  Done-when: `buildChangeMetrics` з журналом, де `phases.spec` має `startedAt`/`endedAt`/`leadTimeMs: 873444`, і з комітами `proposal.md` дає `spans.spec` `{ durationMs: 873444, commitCount: null, source: 'kit-sessions' }` з датами фази; без `metrics.json` `spans.spec.source === 'git-commits'` і `commitCount` дорівнює кількості унікальних комітів; `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "span"` зелений.

- [x] 1.3 Третє джерело показаної тривалості `kit-span`
  Files: src/utils/changeMetrics.js
  Do: У `preferDuration(kitMs, span)` між гілкою скінченного `kitMs` (`{ durationMs: kitMs, source: 'kit-sessions' }`) і гілкою git додати: якщо `span?.source === 'kit-sessions'` → `{ durationMs: span.durationMs ?? null, source: 'kit-span' }`; інакше лишити `{ durationMs: span?.durationMs ?? null, source: 'git-commits' }`.
  Done-when: `preferDuration(null, { durationMs: 873444, source: 'kit-sessions' })` дорівнює `{ durationMs: 873444, source: 'kit-span' }`; `preferDuration(null, { durationMs: 7200000, source: 'git-commits' })` дорівнює `{ durationMs: 7200000, source: 'git-commits' }`; `preferDuration(467553, …)` дає `source: 'kit-sessions'`; `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "preferDuration"` зелений.

- [x] 1.4 Резолюція вартості з пріоритетом `costUsdTotal`
  Files: src/utils/changeMetrics.js
  Do: Експортувати `recordedTotalCostUsd(row)` = `recordedSpendField(row, 'costUsdTotal')` (той самий обхід, що `recordedCostUsd`: overlay → `journal.spend` → сума платформ → сума моделей → сума сесій → сума фаз). Переписати `resolveDisplayedCost(row)` так, щоб повертати `{ costUsd, estimated, billedCostUsd, estimatedCostUsd, source }`: total скінченне → `{ costUsd: total, estimated: billed == null, billedCostUsd: billed, estimatedCostUsd, source: 'total' }`; інакше billed скінченне → `{ costUsd: billed, estimated: false, billedCostUsd: billed, estimatedCostUsd, source: 'billed' }`; інакше оцінка скінченна → `{ costUsd: estimated, estimated: true, billedCostUsd: null, estimatedCostUsd, source: 'estimated' }`; інакше `{ costUsd: null, estimated: false, billedCostUsd: null, estimatedCostUsd: null, source: 'none' }`. `recordedCostUsd` / `recordedEstimatedCostUsd` не змінювати.
  Done-when: `resolveDisplayedCost({ spend: { costUsd: 14.48, costUsdEstimated: 6.5979, costUsdTotal: 21.0779 } })` дорівнює `{ costUsd: 21.0779, estimated: false, billedCostUsd: 14.48, estimatedCostUsd: 6.5979, source: 'total' }`; з `costUsd: null, costUsdTotal: 4.6377` → `estimated: true, source: 'total'`; без total і з `costUsd: 1.5` → `source: 'billed'`; усе `null` → `source: 'none'`; `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "resolveDisplayedCost"` зелений.

- [x] 1.5 CSV-стовпець `cost_usd_total`
  Files: src/utils/changeMetrics.js
  Do: Дописати `,cost_usd_total` у кінець `CSV_HEADER` (після `cost_usd_estimated`, інші заголовки без змін). У `metricsToCsv` після клітинки `csvCell(spend.costUsdEstimated)` додати останню клітинку `csvCell(spend.costUsdTotal)` (overlay `row.spend.costUsdTotal`, без обходу журналу; `null` → порожня клітинка).
  Done-when: перший рядок `metricsToCsv([...])` закінчується на `,cost_usd_estimated,cost_usd_total`; рядок зі `spend.costUsdTotal === 1.92` має клітинку `1.92`; з `costUsdTotal === null` — порожню клітинку (не `0`); `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "csv|CSV|cost_usd"` зелений.

## 2. Екран аналізу

- [x] 2.1 Tooltip тривалості для kit-span
  Files: src/views/AnalysisView.vue
  Do: `<script setup>` без Options API і коментарів. У `spanTitle(span)` після обчислення `started` / `ended` (`formatKyivDateTime` або `—`) додати гілку `span?.source === 'kit-sessions'` → повертати рівно `` `${started} – ${ended}, межі фази за сесіями kit (metrics.json), не коміти` ``; гілку git (`комітів: N, інтервал комітів файлів, не wall-clock сесії`) і `preferredDurationTitle` (kit-тривалість → `час сесій kit (metrics.json), не інтервал комітів`) не змінювати. Поля Спека / Рев’ю / Apply / Усього лишити на `preferDuration(row.kitTimes?.phases?.X, row.spans?.X)`.
  Done-when: у файлі є рядок `межі фази за сесіями kit (metrics.json), не коміти`; для рядка з `kitTimes.phases.spec === null` і `spans.spec.source === 'kit-sessions'` атрибут `title` поля Спека містить цю фразу і не містить `комітів:`; `./node_modules/.bin/vitest run src/views/AnalysisView.spec.js --maxWorkers=1 -t "kit phase bounds"` зелений.

- [x] 2.2 Tooltip вартості «разом (costUsdTotal)»
  Files: src/views/AnalysisView.vue
  Do: У `costTitle(row)` після перевірки `resolved.costUsd == null` додати гілку `resolved.source === 'total'`: зібрати `parts` з `` `$${billedCostUsd.toFixed(2)} billed` `` (якщо `Number.isFinite(resolved.billedCostUsd)`) і `` `≈ $${estimatedCostUsd.toFixed(2)} kit` `` (якщо `Number.isFinite(resolved.estimatedCostUsd)`); повертати `разом (costUsdTotal)` плюс `: ` і `parts.join(' + ')`, якщо `parts` непорожній. Гілки `estimated` (`оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude`) і billed (`$X.XX billed · ≈ $Y.YY kit`) не змінювати. `costLabel` лишити: `≈` лише коли `resolved.estimated === true`.
  Done-when: для `spend { costUsd: 14.48, costUsdEstimated: 6.5979, costUsdTotal: 21.0779 }` поле «Вартість» показує `$21.08`, а `title` дорівнює `разом (costUsdTotal): $14.48 billed + ≈ $6.60 kit`; для `costUsd: null, costUsdTotal: 4.6377` — `≈ $4.64` і `title` містить `costUsdTotal`; `./node_modules/.bin/vitest run src/views/AnalysisView.spec.js --maxWorkers=1 -t "costUsdTotal"` зелений.

## 3. Сторінка деталей

- [x] 3.1 Складові вартості й `costUsdTotal` у картках журналу
  Files: src/components/AnalysisDetailsModal.vue
  Do: Додати `usdLabel(value, estimated)` → `—` для нескінченного, інакше `$X.XX` або `≈ $X.XX`. Переписати `costLabel(item)`: скінченне `item.costUsdTotal` → `usdLabel(item.costUsdTotal, !Number.isFinite(item.costUsd))`; інакше скінченне `item.costUsd` → `usdLabel(item.costUsd, false)`; інакше `usdLabel(item.costUsdEstimated, true)`. У `spendRows` обчислити `cost = resolveDisplayedCost(row)` і замінити рядок «Вартість» на три рядки: `{ label: 'Вартість', value: usdLabel(cost.costUsd, cost.estimated) }`, `{ label: 'Вартість · рахунок', value: usdLabel(cost.billedCostUsd, false) }`, `{ label: 'Вартість · оцінка kit', value: usdLabel(cost.estimatedCostUsd, true) }`. Картки платформ / моделей / фаз / сесій / sources і далі беруть `costLabel(item)`; Amp credits лишити окремим рядком.
  Done-when: для `spend { costUsd: 14.48, costUsdEstimated: 6.5979, costUsdTotal: 21.0779 }` блок «Час і витрати» показує «Вартість» `$21.08`, «Вартість · рахунок» `$14.48`, «Вартість · оцінка kit» `≈ $6.60`; запис платформи `amp` з `costUsd: 14.48, costUsdTotal: 14.48` показує `$14.48`, запис `cursor` з `costUsd: null, costUsdTotal: 4.6377` — `≈ $4.64`; `./node_modules/.bin/vitest run src/components/AnalysisDetailsModal.spec.js --maxWorkers=1 -t "costUsdTotal|estimate"` зелений.

- [x] 3.2 Секція «Фази OpenSpec (інтервали)» з джерелом
  Files: src/components/AnalysisDetailsModal.vue
  Do: У `spanCard(title, span)` обчислити `fromKit = span?.source === 'kit-sessions'`; рядки: «Початок», «Кінець» (`formatKyivDateTime` або `—`), «Тривалість» (`formatDuration` або `—`), «Комітів» (`String(span?.commitCount ?? 0)`) лише якщо `!fromKit`, «Джерело» = `сесії kit (metrics.json)` якщо `fromKit`, інакше `коміти файлів`. Додати `spansFromKit = computed(() => spanCards.value.some(card => card.rows.some(item => item.value === 'сесії kit (metrics.json)')))`. У шаблоні заголовок секції змінити на `Фази OpenSpec (інтервали)`, підзаголовок `.analysis-details-subtitle` = `Початок і кінець фаз за сесіями kit із metrics.json.` якщо `spansFromKit`, інакше `Інтервали за комітами файлів спеки, не сесії агентів.`.
  Done-when: у файлі є `Фази OpenSpec (інтервали)` і обидва тексти підзаголовка; для рядка, де всі `spans.*.source === 'kit-sessions'`, секція показує kit-підзаголовок, картка Спека має «Джерело» `сесії kit (metrics.json)` і не має «Комітів»; для `source: 'git-commits'` — підзаголовок про коміти, «Комітів» і «Джерело» `коміти файлів`; `./node_modules/.bin/vitest run src/components/AnalysisDetailsModal.spec.js --maxWorkers=1 -t "phase bounds|коміти|git"` зелений.

- [x] 3.3 Межі фаз у картках фаз журналу
  Files: src/components/AnalysisDetailsModal.vue
  Do: У `phaseRows` додати `startedAt: textOrDash(formatKyivDateTime(item.startedAt))`, `endedAt: textOrDash(formatKyivDateTime(item.endedAt))`, `leadTime: textOrDash(formatDuration(item.leadTimeMs))`. У шаблоні картки фази після рядка «Сесії» додати рядки з підписами `Початок`, `Кінець`, `Lead time` перед `Тривалість`; решту рядків (Токени, Вартість, Агенти, Моделі) лишити.
  Done-when: для `journal.phases.spec` з `startedAt: '2026-09-07T15:17:07.490Z'`, `endedAt: '2026-09-07T15:31:40.934Z'`, `leadTimeMs: 873444`, `durationMs: 539356` картка фази показує «Початок» `07.09.2026, 18:17`, «Кінець» `07.09.2026, 18:31`, «Lead time» `14 хв 33 с`, «Тривалість» `8 хв 59 с`; фаза без цих полів показує `—` у трьох рядках; `./node_modules/.bin/vitest run src/components/AnalysisDetailsModal.spec.js --maxWorkers=1 -t "phase bounds"` зелений.

## 4. Тести

- [x] 4.1 Тести парсера, spans, резолюції й CSV
  Files: src/utils/changeMetrics.spec.js
  Do: Vitest. Переконатися, що є кейси: overlay `{"spend":{"costUsdTotal":21.0779}}` → `costUsdTotal`, `source: 'metrics-file'`; журнал v2 з `costUsdTotal` на `spend`, платформі, моделі, фазі, сесії та з `phases.spec.startedAt/endedAt/leadTimeMs`; legacy без цих ключів → `null`; порожній журнал має `costUsdTotal: null` на overlay і платформах; `buildChangeMetrics` бере `spans.spec` з фази (kit-sessions, `commitCount: null`) і падає на коміти без журналу; `spanFromJournal` дає min/max з фаз і сесій; `preferDuration` → `kit-span`; `resolveDisplayedCost` для total / total-без-billed / journal-walk total / billed / estimated / none; CSV заголовок закінчується на `,cost_usd_estimated,cost_usd_total`, `cost_usd_total` `1.92` і порожній для `null`. Відсутні кейси дописати; чинні не видаляти.
  Done-when: `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1` завершується з кодом 0 і виводом без `failed`.

- [x] 4.2 Тести екрана аналізу
  Files: src/views/AnalysisView.spec.js
  Do: Vitest + Vue Test Utils. Переконатися, що є кейси: total з billed і оцінкою → текст `$21.08`, `title` містить `costUsdTotal`, `$14.48 billed`, `≈ $6.60 kit`; total лише з оцінки → `≈ $4.64` і `title` містить `costUsdTotal`; журнал з `phases.spec.startedAt/endedAt/leadTimeMs: 873444` і `durationMs: null` плюс два коміти → поле Спека `14 хв 33 с`, `title` містить `межі фази за сесіями kit (metrics.json), не коміти` і не містить `комітів:`. Чинні кейси billed / estimated / `—` не видаляти.
  Done-when: `./node_modules/.bin/vitest run src/views/AnalysisView.spec.js --maxWorkers=1` завершується з кодом 0 і виводом без `failed`.

- [x] 4.3 Тести сторінки деталей
  Files: src/components/AnalysisDetailsModal.spec.js
  Do: Vitest + Vue Test Utils. Переконатися, що є кейси: рядок з `spend.costUsdTotal: 21.0779`, `spans.*` з `source: 'kit-sessions'`, `journal.spendByPlatform.amp/cursor` з `costUsdTotal` і `journal.phases.spec` з межами → «Вартість» `$21.08`, «Вартість · рахунок» `$14.48`, «Вартість · оцінка kit» `≈ $6.60`, kit-підзаголовок секції інтервалів, відсутність «Комітів», «Джерело» `сесії kit (metrics.json)`, `amp` `$14.48`, `cursor` `≈ $4.64`, картка фази з «Початок» / «Кінець» / «Lead time» / «Тривалість»; рядок з git-span → підзаголовок про коміти і «Джерело» `коміти файлів`. Чинні кейси (оцінка overlay, Amp credits, pending, сесії) не видаляти.
  Done-when: `./node_modules/.bin/vitest run src/components/AnalysisDetailsModal.spec.js --maxWorkers=1` завершується з кодом 0 і виводом без `failed`.

## 5. Build і lint

- [x] 5.1 Lint змінених файлів і production build
  Files: src/utils/changeMetrics.js, src/views/AnalysisView.vue, src/components/AnalysisDetailsModal.vue, src/utils/changeMetrics.spec.js, src/views/AnalysisView.spec.js, src/components/AnalysisDetailsModal.spec.js
  Do: Запустити `./node_modules/.bin/eslint src/utils/changeMetrics.js src/views/AnalysisView.vue src/components/AnalysisDetailsModal.vue src/utils/changeMetrics.spec.js src/views/AnalysisView.spec.js src/components/AnalysisDetailsModal.spec.js` і `./node_modules/.bin/vite build`; виправити зауваження lint у цих файлах без зміни поведінки. Повний `npm test` не запускати.
  Done-when: обидві команди завершуються з кодом 0; `! grep -rq "USD_PER_MILLION\|estimateCostFromTokens" src/` завершується з кодом 0 (жодного збігу); у `dist/` є `index.html`.
