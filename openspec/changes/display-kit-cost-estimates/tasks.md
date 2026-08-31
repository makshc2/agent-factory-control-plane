# Tasks: display-kit-cost-estimates

## 1. Парсер і резолюція вартості

- [x] 1.1 Додати `costUsdEstimated` у ключі парсера та overlay
  Files: src/utils/changeMetrics.js
  Do: JavaScript без TypeScript і без коментарів; додати `'costUsdEstimated'` у `SPEND_KEYS`, `PLATFORM_NUMBER_KEYS`, `MODEL_SPEND_KEYS`, `SESSION_NUMBER_KEYS`, `SOURCE_NUMBER_KEYS`, `PHASE_NUMBER_KEYS`; у `emptyPlatformSpend`, `emptyJournal().spend`, результат `parseSpendFields` і результат `parseMetricsFile` завжди тримати поле `costUsdEstimated` (скінченне число з JSON або `null`); `parseMetricsFile` ставить `source === 'metrics-file'`, якщо скінченне будь-яке з п’яти чисел `inputTokens|outputTokens|totalTokens|costUsd|costUsdEstimated`; `collectJournalModelRows` копіює `costUsdEstimated: item.costUsdEstimated ?? null` поруч із `costUsd`. Не додавати `ampCredits` у `costUsd` чи `costUsdEstimated`. Не редагувати `src/stores/board.js`.
  Done-when: у `src/utils/changeMetrics.js` є `'costUsdEstimated'` у всіх шести масивах ключів, у `parseMetricsFile` і в `collectJournalModelRows`; `npm run lint` завершується з кодом 0.

- [x] 1.2 Резолвити показану вартість з kit, прибрати локальні ставки
  Files: src/utils/changeMetrics.js
  Do: Видалити константи `USD_PER_MILLION_INPUT`, `USD_PER_MILLION_OUTPUT`, `USD_PER_MILLION_BLENDED` і функцію `estimateCostFromTokens` (не лишати експорт). Експортувати `recordedEstimatedCostUsd(row)` з тим самим обходом, що `recordedCostUsd` (`spend` → `journal.spend` → сума платформ → моделей → сесій → фаз), читаючи `costUsdEstimated`. `resolveDisplayedCost(row)` повертає `{ costUsd, estimated, estimatedCostUsd }`: якщо billed скінченне — `{ costUsd: billed, estimated: false, estimatedCostUsd }`; інакше якщо оцінка скінченна — `{ costUsd: оцінка, estimated: true, estimatedCostUsd: оцінка }`; інакше `{ costUsd: null, estimated: false, estimatedCostUsd: null }`.
  Done-when: файл не містить `USD_PER_MILLION` і `estimateCostFromTokens`; містить `export function recordedEstimatedCostUsd`; `resolveDisplayedCost` повертає ключ `estimatedCostUsd`; `npm run lint` завершується з кодом 0.

- [x] 1.3 Додати `cost_usd_estimated` у кінець CSV
  Files: src/utils/changeMetrics.js
  Do: Замінити `CSV_HEADER` на точний рядок `project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents,sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits,pending_platform,pending_thread_id,pending_client_source,session_spend_sources,thread_ids,cost_usd_estimated`. У `metricsToCsv` лишити клітинку `cost_usd` як `csvCell(spend.costUsd)` і додати останню клітинку `csvCell(spend.costUsdEstimated)`. Не вставляти нові колонки в середину рядка.
  Done-when: `CSV_HEADER` закінчується `,thread_ids,cost_usd_estimated`; масив клітинок `metricsToCsv` має `csvCell(spend.costUsdEstimated)` останнім елементом; `npm run lint` завершується з кодом 0.

## 2. Спеки парсера

- [x] 2.1 Зафіксувати overlay, обхід оцінки і CSV у `changeMetrics.spec.js`
  Files: src/utils/changeMetrics.spec.js
  Do: Додати `costUsdEstimated: null` у `unknownSpend` і в очікування `parseMetricsFile('{"spend":{"costUsd":1.5,"totalTokens":30}}')`. Замінити кейс `estimates cost from tokens when costUsd is missing` на: токени без `costUsd` і без `costUsdEstimated` → `{ costUsd: null, estimated: false, estimatedCostUsd: null }`. Додати очікування: `parseMetricsFile('{"spend":{"costUsdEstimated":0.42}}')` → `costUsd === null`, `costUsdEstimated === 0.42`, `source === 'metrics-file'`; рядок `"0.42"` → `costUsdEstimated === null` і `source === 'unknown'`; `parseKitMetrics` з `spendByPlatform.cursor.costUsdEstimated: 0.18` зберігає `0.18`; `recordedEstimatedCostUsd` з оцінкою лише на `journal.spendByPlatform.cursor` повертає `0.18`; `resolveDisplayedCost` з `costUsd: 1.5` і `costUsdEstimated: 0.42` → `{ costUsd: 1.5, estimated: false, estimatedCostUsd: 0.42 }`; лише `costUsdEstimated: 0` → `{ costUsd: 0, estimated: true, estimatedCostUsd: 0 }`; `metricsToCsv` заголовок закінчується `,cost_usd_estimated`, клітинка billed `1.5` лишається в `cost_usd`, оцінка `0.42` у `cost_usd_estimated`. Імпортувати `recordedEstimatedCostUsd`. Оновити наявні `toEqual` для `resolveDisplayedCost`, щоб містили `estimatedCostUsd`.
  Done-when: файл імпортує `recordedEstimatedCostUsd`; містить рядок `costUsdEstimated: 0.42` і заголовок `,cost_usd_estimated`; не містить `3818279 * 3 / 1e6`; `npm run lint` завершується з кодом 0.

## 3. UI аналізу

- [x] 3.1 Показати billed / `≈` kit у таблиці аналізу
  Files: src/views/AnalysisView.vue
  Do: Лишити `<script setup>` без Options API і коментарів. `costLabel(row)` бере `resolveDisplayedCost(row)`: `null` → `—`; інакше `$` + `toFixed(2)`; якщо `estimated === true` префікс `≈ `. `costTitle(row)`: якщо `estimated === true` повернути точно `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude`; якщо `estimated === false` і `estimatedCostUsd` скінченне — точно `$` + `costUsd.toFixed(2)` + ` billed · ≈ $` + `estimatedCostUsd.toFixed(2)` + ` kit`; інакше порожній рядок. Видалити текст `оцінка за токенами: $3 / 1M input, $15 / 1M output`. Не імпортувати `usePoller`. Не редагувати `src/views/AnalysisDetailsView.vue`.
  Done-when: файл містить фразу `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude` і `billed · ≈ $`; не містить `$3 / 1M`; `npm run lint` завершується з кодом 0.

- [x] 3.2 Показати billed / `≈` kit у деталях і лишити Amp credits
  Files: src/components/AnalysisDetailsModal.vue
  Do: Лишити `<script setup>` без Options API і коментарів. Overlay «Вартість» лишає `displayedCostLabel` на `resolveDisplayedCost`. Замінити `costLabel(value)` на форматер запису: скінченне `item.costUsd` → `$` + `toFixed(2)`; інакше скінченне `item.costUsdEstimated` → `≈ $` + `toFixed(2)`; інакше `—`. Викликати його з об’єкта рядка в `platformRows`, `modelRows`, `phaseRows`, `sessionRows`, `sourceRows` (не з голого числа). Не змінювати заголовок і клітинки колонки `Amp credits`. Не додавати credits у текст колонки «Вартість».
  Done-when: файл читає `costUsdEstimated` у форматері вартості таблиць; шаблон досі містить `Amp credits`; `npm run lint` завершується з кодом 0.

## 4. Спеки UI

- [x] 4.1 Замінити кейс локальної оцінки в `AnalysisView.spec.js`
  Files: src/views/AnalysisView.spec.js
  Do: Замінити тест `shows estimated cost when tokens exist without costUsd`: `createJournalClient` з `spend: { inputTokens: 3818279, outputTokens: 38764, totalTokens: 3857043, costUsd: null, costUsdEstimated: 0.42 }` → колонка «Вартість» є `≈ $0.42`, `title` містить `оцінка kit (costUsdEstimated)` і не містить `$3 / 1M`. Додати кейс `costUsd: 1.5` і `costUsdEstimated: 0.42` → колонка є `$1.50` (без `≈`), `title` містить `billed` і `≈ $0.42 kit`. Додати кейс токенів без `costUsd` і без `costUsdEstimated` → колонка «Вартість» є `—` і не містить `$`.
  Done-when: файл містить `costUsdEstimated: 0.42` і очікування `≈ $0.42`; не очікує `≈ $` лише від токенів; `npm run lint` завершується з кодом 0.

- [x] 4.2 Покрити оцінку в таблицях модалки
  Files: src/components/AnalysisDetailsModal.spec.js
  Do: Додати кейс рядка з `spend: { costUsd: null, costUsdEstimated: 0.42, source: 'metrics-file' }` → текст містить `≈ $0.42` у overlay «Вартість». Додати кейс `journal.spendByPlatform.cursor: { costUsd: null, costUsdEstimated: 0.18, ampCredits: null }` → текст містить `≈ $0.18` і заголовок `Amp credits`, і `0.18` не стоїть у клітинці Amp credits. Не видаляти чинні кейси київських дат і `Amp credits`.
  Done-when: файл містить `costUsdEstimated: 0.42` і `costUsdEstimated: 0.18`; `npm run lint` завершується з кодом 0.

## 5. Перевірка

- [x] 5.1 Лінт змінених файлів
  Files: src/utils/changeMetrics.js, src/utils/changeMetrics.spec.js, src/views/AnalysisView.vue, src/views/AnalysisView.spec.js, src/components/AnalysisDetailsModal.vue, src/components/AnalysisDetailsModal.spec.js
  Do: Виконати `npm run lint` і виправити помилки ESLint лише в цих шести файлах. Не додавати TypeScript і не писати коментарі.
  Done-when: `npm run lint` завершується з кодом 0.
