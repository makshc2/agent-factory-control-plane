## Why

Kit `agent-orchestrator-kit` (README, розділ «Для дашбордів») визначає джерело правди для дашбордів: межі й тривалість фази — лише `phases.<phase>.startedAt` / `endedAt` / `durationMs` (git log MUST NOT бути джерелом меж фаз), а headline-вартість — `spend.costUsdTotal` (billed `costUsd` за наявності, інакше `costUsdEstimated`, по сесіях; Amp credits ніколи не входять). Control plane досі рахує інтервали Спека / Рев’ю / Apply / Усього з комітів файлів спеки і показує лише billed `costUsd` (або оцінку, якщо billed немає), тому губить платформи з іншим типом звіту й показує фази, які не збігаються з журналом kit.

Реалізація вже в HEAD (закомічена; `git diff --stat HEAD -- src/` порожній). Ця зміна легалізує її через пайплайн: apply = верифікація коду проти delta-спеки + build/lint.

## What Changes

- Парсер `metrics.json` читає `costUsdTotal` (скінченне число або `null`) у `spend`, `spendByPlatform.*`, `spendByModel[]`, `phases.*`, `sessions[]`, `sessions[].sources[]`; порожній журнал / платформа / overlay мають `costUsdTotal: null`. Кожна `phases.<phase>` додатково зберігає `startedAt`, `endedAt` (ISO, канонізовані як інші timestamps) і `leadTimeMs`.
- Інтервали `spans.spec|review|apply` беруться з `journal.phases.<phase>` (`startedAt`/`endedAt`, `durationMs = leadTimeMs ?? endedAt − startedAt`, `commitCount: null`, `source: 'kit-sessions'`); `spans.change` — min `startedAt` / max `endedAt` по всіх фазах і сесіях з `durationMs = totals.leadTimeMs ?? різниця`. Git-коміти лишаються лише fallback (журнал відсутній або фаза без дат) із незмінною формулою і `source: 'git-commits'`. Listing комітів (`listCommitsByPath`) MUST NOT мати `since`/`until`; коли span падає на git-fallback, він SHALL будуватися з повного набору комітів відповідних шляхів — вікно періоду не обрізає коміти вже завантаженої зміни.
- Показана тривалість: скінченний kit `durationMs` фази / `workMs` → `'kit-sessions'`; інакше kit-span → `'kit-span'`; інакше git-span → `'git-commits'`. Tooltip для kit-span: `<початок> – <кінець>, межі фази за сесіями kit (metrics.json), не коміти`. Tooltip git-span показує `startedAt`–`endedAt` у поясі Києва (не сирий ISO) і підпис `комітів: N` замість літерала `commitCount` — контракт узгоджено з чинним `spanTitle` у `AnalysisView.vue`.
- Резолюція вартості: пріоритет `costUsdTotal` (той самий обхід overlay → journal.spend → платформи → моделі → сесії → фази), далі billed, далі оцінка; результат `{ costUsd, estimated, billedCostUsd, estimatedCostUsd, source: 'total' | 'billed' | 'estimated' | 'none' }`. Для `total` префікс `≈` лише коли billed відсутній; tooltip `разом (costUsdTotal): $14.48 billed + ≈ $6.60 kit` (частини за наявності). Старі випадки billed / estimated без змін.
- CSV: новий останній стовпець `cost_usd_total` після `cost_usd_estimated` (порожній, якщо `null`; ніколи не `0`).
- Сторінка деталей: секція «Фази OpenSpec (інтервали)» з підзаголовком за джерелом, рядок «Джерело» (`сесії kit (metrics.json)` / `коміти файлів`) і «Комітів» лише для git-span; блок «Час і витрати» отримує «Вартість · рахунок» і «Вартість · оцінка kit»; картки платформ / моделей / фаз / сесій / sources показують `costUsdTotal` (з `≈`, якщо `costUsd` відсутній), інакше billed, інакше `≈` оцінку; картки фаз журналу отримують рядки «Початок», «Кінець», «Lead time».

## Capabilities

### New Capabilities

(немає)

### Modified Capabilities

- `change-metrics`: канонічна модель (`costUsdTotal`, межі фаз, `spans.*.source` ∈ `kit-sessions | git-commits`); деривація інтервалів з фаз журналу з git-fallback і tooltip kit-span; listing комітів без `since`/`until` (git-fallback span з повного набору комітів); повний журнал kit (`costUsdTotal` на всіх рівнях, `phases.*.startedAt/endedAt/leadTimeMs`); kit-тривалості (`kit-span` як третє джерело показаного часу); резолюція показаної вартості з пріоритетом `costUsdTotal`; екран аналізу (вартість записів деталей через `costUsdTotal`); експорт CSV (`cost_usd_total` останній); нова вимога для сторінки деталей (інтервали з джерелом, складові вартості, межі фаз журналу).

## Impact

- Код: `src/utils/changeMetrics.js` (+ `src/utils/changeMetrics.spec.js`), `src/views/AnalysisView.vue` (+ `src/views/AnalysisView.spec.js`), `src/components/AnalysisDetailsModal.vue` (+ `src/components/AnalysisDetailsModal.spec.js`).
- API-клієнти GitHub / GitLab, полер, `src/stores/board.js`, `src/stores/analysis.js`, реєстр, жива таблиця `/`, KPI, роутер: без змін. Коміти файлів як і раніше запитуються для fallback.
- Залежності: без нових npm; JavaScript без TypeScript, без коментарів, `<script setup>`.
- Сумісність: legacy `metrics.json` без `costUsdTotal` і без дат фаз працює як раніше (billed / оцінка, git-span).

## Acceptance criteria

Кожен критерій перевірний вузьким прогоном Vitest (`./node_modules/.bin/vitest run <файл> --maxWorkers=1`), grep або спостережуваним виходом; повний `npm test` не запускається.

**AC1. Span фази береться з журналу, а не з комітів.** Для журналу з `phases.spec.startedAt === '2026-09-07T15:17:07.490Z'`, `phases.spec.endedAt === '2026-09-07T15:31:40.934Z'`, `phases.spec.leadTimeMs === 873444` і двох комітів `proposal.md` з іншими датами `buildChangeMetrics` повертає `spans.spec === { startedAt: '2026-09-07T15:17:07.490Z', endedAt: '2026-09-07T15:31:40.934Z', durationMs: 873444, commitCount: null, source: 'kit-sessions' }`; дати комітів на `spans.spec` не впливають. Аналогічно для `review` і `apply`.
Перевірка: `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "span"` — зелений.

**AC2. `durationMs` фази без `leadTimeMs` — різниця дат.** Для `phases.review` з `startedAt === '2026-09-07T15:26:14.472Z'`, `endedAt === '2026-09-07T15:39:40.339Z'`, `leadTimeMs === null` результат `spans.review.durationMs === 805867`, `commitCount === null`, `source === 'kit-sessions'`. Якщо однієї з дат немає — `durationMs === null` (не `0`).
Перевірка: той самий прогін `changeMetrics.spec.js -t "span"`.

**AC3. `spans.change` — min/max по фазах і сесіях.** Для журналу з `phases.explore.startedAt === '2026-09-07T15:03:00.000Z'`, `phases.apply.endedAt === '2026-09-07T16:20:00.000Z'`, сесією `startedAt === '2026-09-07T15:05:00.000Z'` / `endedAt === '2026-09-07T16:25:00.000Z'` і `totals.leadTimeMs === 4691796` результат `spans.change === { startedAt: '2026-09-07T15:03:00.000Z', endedAt: '2026-09-07T16:25:00.000Z', durationMs: 4691796, commitCount: null, source: 'kit-sessions' }`.
Перевірка: `changeMetrics.spec.js -t "span"` (кейс `spanFromJournal`).

**AC4. Git-коміти — лише fallback.** Без `metrics.json` `spans.spec` будується з унікальних за sha комітів `proposal.md` / `design.md` / `specs/` з незмінною формулою: `startedAt` = min, `endedAt` = max, `durationMs` = різниця, `commitCount` = кількість унікальних комітів, `source === 'git-commits'`. Для валідного журналу, де `phases.review` не має жодної дати, `spans.review` теж падає на коміти (`source === 'git-commits'`, `commitCount === 1`). Порожній список комітів дає `startedAt === null`, `endedAt === null`, `durationMs === null` (не `0`), `commitCount === 0`.
Перевірка: `changeMetrics.spec.js -t "span"`; регресія формули відсутня — `spanFromCommits` не змінено.

**AC5. `kit-span` як третє джерело показаного часу і його tooltip.** `preferDuration(null, { durationMs: 873444, source: 'kit-sessions' })` дорівнює `{ durationMs: 873444, source: 'kit-span' }`; `preferDuration(null, { durationMs: 7200000, source: 'git-commits' })` дорівнює `{ durationMs: 7200000, source: 'git-commits' }`; скінченний `kitMs` дає `source: 'kit-sessions'`. У таблиці аналізу для рядка з `kitTimes.phases.spec === null` і kit-span поле Спека показує `14 хв 33 с`, а `title` дорівнює рівно `07.09.2026, 18:17 – 07.09.2026, 18:31, межі фази за сесіями kit (metrics.json), не коміти` і не містить `комітів:`.
Перевірка: `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "preferDuration"` і `./node_modules/.bin/vitest run src/views/AnalysisView.spec.js --maxWorkers=1 -t "kit phase bounds"` — зелені.

**AC6. `costUsdTotal` читається з файлу на всіх рівнях і ніколи не обчислюється.** `parseMetricsFile('{"spend":{"costUsdTotal":21.0779}}')` дає overlay `costUsdTotal === 21.0779`, `costUsd === null`, `costUsdEstimated === null`, `source === 'metrics-file'`; `parseMetricsFile('{"spend":{"costUsdTotal":"21.07"}}')` дає `costUsdTotal === null` і `source === 'unknown'`. Журнал v2 зберігає скінченні `costUsdTotal` на `spend`, `spendByPlatform.amp`, `spendByModel[0]`, `phases.spec`, `sessions[0]`, `sessions[0].sources[0]`, а `spendByPlatform.cursor.costUsdTotal === null`. Для журналу з `spend.costUsd === 1.5` без ключа `costUsdTotal` значення `1.5` MUST NOT потрапити в `costUsdTotal`. `ampCredits` не додаються в жодне доларове поле.
Перевірка: `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "costUsdTotal"` — зелений.

**AC7. Headline-вартість: `costUsdTotal` має пріоритет, `≈` лише без billed.** `resolveDisplayedCost({ spend: { costUsd: 14.48, costUsdEstimated: 6.5979, costUsdTotal: 21.0779 } })` дорівнює `{ costUsd: 21.0779, estimated: false, billedCostUsd: 14.48, estimatedCostUsd: 6.5979, source: 'total' }`, комірка «Вартість» — `$21.08` без `≈`, tooltip — рівно `разом (costUsdTotal): $14.48 billed + ≈ $6.60 kit`. Для `costUsd === null`, `costUsdEstimated === 4.6377`, `costUsdTotal === 4.6377` результат має `estimated: true`, `billedCostUsd: null`, `source: 'total'`, комірка — `≈ $4.64`, tooltip — `разом (costUsdTotal): ≈ $4.64 kit`. Коли overlay `costUsdTotal === null`, total береться обходом overlay → `journal.spend` → платформи → моделі → сесії → фази.
Перевірка: `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "resolveDisplayedCost"` і `./node_modules/.bin/vitest run src/views/AnalysisView.spec.js --maxWorkers=1 -t "costUsdTotal"` — зелені.

**AC8. CSV: `cost_usd_total` — останній стовпець.** Рядок заголовків `metricsToCsv` закінчується рівно на `,cost_usd_estimated,cost_usd_total`; порядок і індекси попередніх колонок не змінені. Для `spend.costUsdTotal === 1.92` клітинка `1.92`; для `costUsdTotal === null` клітинка порожня — ніколи `0` чи `0.00`, навіть коли `journal.spendByPlatform.amp.costUsdTotal === 14.48` (CSV бере лише overlay, без обходу журналу).
Перевірка: `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js --maxWorkers=1 -t "csv|CSV|cost_usd"` — зелений.

**AC9. Сторінка деталей: секція «Фази OpenSpec (інтервали)».** Секція має заголовок `Фази OpenSpec (інтервали)` і чотири картки (Спека, Рев'ю, Apply, Усього). Коли хоча б один span має `source === 'kit-sessions'`, підзаголовок дорівнює рівно `Початок і кінець фаз за сесіями kit із metrics.json.`, картка показує «Джерело» `сесії kit (metrics.json)` і не містить рядка «Комітів». Коли всі span git-ові, підзаголовок дорівнює рівно `Інтервали за комітами файлів спеки, не сесії агентів.`, картка показує «Комітів» `2` і «Джерело» `коміти файлів`.
Перевірка: `./node_modules/.bin/vitest run src/components/AnalysisDetailsModal.spec.js --maxWorkers=1 -t "phase bounds|коміти|git"` — зелений.

**AC10. Сторінка деталей: складові вартості й межі фаз журналу.** Для `spend { costUsd: 14.48, costUsdEstimated: 6.5979, costUsdTotal: 21.0779 }` блок «Час і витрати» показує «Вартість» `$21.08`, «Вартість · рахунок» `$14.48`, «Вартість · оцінка kit» `≈ $6.60`. Для `costUsd === null`, `costUsdEstimated === 0.42`, `costUsdTotal === null` — «Вартість» `≈ $0.42`, «Вартість · рахунок» `—`, «Вартість · оцінка kit» `≈ $0.42`; `null` ніколи не показується як `$0.00`. Картка фази `spec` з `startedAt === '2026-09-07T15:17:07.490Z'`, `endedAt === '2026-09-07T15:31:40.934Z'`, `leadTimeMs === 873444`, `durationMs === 539356` показує «Початок» `07.09.2026, 18:17`, «Кінець» `07.09.2026, 18:31`, «Lead time» `14 хв 33 с`, «Тривалість» `8 хв 59 с`; фаза без цих полів — `—` у трьох рядках.
Перевірка: `./node_modules/.bin/vitest run src/components/AnalysisDetailsModal.spec.js --maxWorkers=1 -t "costUsdTotal|estimate"` і `-t "phase bounds"` — зелені.

**AC11. Legacy `metrics.json` без регресії.** Для файлу без `costUsdTotal` і без дат фаз: `spend.costUsdTotal === null`, `phases.spec.startedAt === null`, `endedAt === null`, `leadTimeMs === null`; комірка «Вартість» лишається billed (`source === 'billed'`) або `≈` оцінкою (`source === 'estimated'`) з чинними tooltip-текстами; `spans.*` будуються з комітів із `source === 'git-commits'`; клітинка `cost_usd_total` у CSV порожня. Amp credits не стають доларами.
Перевірка: чинні кейси billed / estimated / `—` / Amp credits у трьох spec-файлах лишаються зеленими — `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js src/views/AnalysisView.spec.js src/components/AnalysisDetailsModal.spec.js --maxWorkers=1` завершується кодом 0 без `failed`.

**AC12. Скоуп і якість.** Змінені лише `src/utils/changeMetrics.js`, `src/views/AnalysisView.vue`, `src/components/AnalysisDetailsModal.vue` і три їхні spec-файли; нових npm-залежностей немає; `grep -rn "USD_PER_MILLION\|estimateCostFromTokens" src/` порожній (борд не рахує долари з токенів локальними ставками).
Перевірка: `./node_modules/.bin/eslint` по шести файлах і `./node_modules/.bin/vite build` завершуються кодом 0; у `dist/` є `index.html`.

**AC13. Картка платформи з costUsdTotal.** Для `journal.spendByPlatform.amp` з `costUsd === 14.48` і `costUsdTotal === 14.48` поле Вартість запису `amp` показує `$14.48`; для `journal.spendByPlatform.cursor` з `costUsd === null`, `costUsdEstimated === 4.6377`, `costUsdTotal === 4.6377` поле Вартість запису `cursor` показує `≈ $4.64`.
Перевірка: `./node_modules/.bin/vitest run src/components/AnalysisDetailsModal.spec.js --maxWorkers=1 -t "costUsdTotal|estimate"` — зелений.

## Non-goals (out of scope)

- Читання v2-полів сесій `sourceIds` / `sourceTotals` / `byModel` замість `sources`.
- Зміни в парсингу дат (`parseFlexibleIso`, канонізація ISO).
- Зміна сітки карток / макета сторінки деталей і списку аналізу.
- Конвертація Amp credits у USD або додавання credits у будь-яке доларове поле.
- Виклики Amp / Cursor / Claude API; запис `metrics.json` з борду.
