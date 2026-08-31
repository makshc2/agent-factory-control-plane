## Context

Мотивація — `proposal.md` → Why. Контракт — delta `specs/change-metrics/spec.md`. Жива таблиця `/`, KPI і полер не змінюють HTTP і не читають `metrics.json`.

Чинний код (не вигадувати інший):

- `src/utils/changeMetrics.js` — `SPEND_KEYS` = `inputTokens|outputTokens|totalTokens|costUsd` (без `costUsdEstimated`); `PLATFORM_NUMBER_KEYS` / `SESSION_NUMBER_KEYS` / `MODEL_SPEND_KEYS` / `SOURCE_NUMBER_KEYS` / `PHASE_NUMBER_KEYS` так само без оцінки; `parseMetricsFile` ставить `source === 'metrics-file'` лише за цими ключами; `recordedCostUsd` обходить billed `costUsd`; `estimateCostFromTokens` множить токени на `USD_PER_MILLION_INPUT=3`, `USD_PER_MILLION_OUTPUT=15`, `USD_PER_MILLION_BLENDED=3.5`; `resolveDisplayedCost` підставляє цю вигадку, коли billed `null`.
- `src/views/AnalysisView.vue` — `costLabel` / `costTitle`: префікс `≈` і tooltip «оцінка за токенами: $3 / 1M…».
- `src/components/AnalysisDetailsModal.vue` — overlay «Вартість» через `resolveDisplayedCost`; таблиці платформ/моделей/фаз/сесій/sources через `costLabel(number)` лише з `costUsd`. `ampCredits` уже окрема колонка. Рядки `detailRows` не мають `title`.
- `src/views/AnalysisDetailsView.vue` — обгортка маршруту; підписи вартості там не живуть, файл не чіпати (включно з `src/views/AnalysisDetailsView.spec.js`).
- Архів `openspec/changes/archive/2026-08-29-consume-kit-metrics/` — парсер тоді свідомо дропнув невідомі ключі, зокрема майбутній `costUsdEstimated`.

Стек: Vue 3 `<script setup>`, Pinia, JavaScript, без Options API, без коментарів, без TypeScript, без нових npm.

Kit може пізніше дописати зміну `surface-estimated-spend` (оцінка не-grok моделей Cursor). Борд MUST рендерити `costUsdEstimated`, щойно ключ є у JSON; legacy без ключа → `null` → `—`, якщо немає billed.

Design-brief / Figma: немає.

## Goals / Non-Goals

**Goals:**

- Зберегти billed `costUsd` і додати kit `costUsdEstimated` у модель, overlay і журнал.
- Комірка аналізу / деталей: billed, інакше `≈` kit, інакше `—`.
- Прибрати локальну таблицю ставок з борду.
- CSV: стара `cost_usd` + хвіст `cost_usd_estimated` з overlay (без walk журналу).
- Amp credits лишаються окремою колонкою.

**Non-Goals:**

- Vendor API; запис `metrics.json`; конвертація credits; живий борд / KPI / полер.
- Заміна kit-таблиць ставок кодом борду.
- Зміна `AnalysisDetailsView.vue` і маршруту деталей.
- Показ ролей як моделей.

## Decisions

### D1. Billed vs estimated vs credits

Три різні числа, ніколи не змішувати:

| Поле | Сенс | Комірка «Вартість» |
|---|---|---|
| `costUsd` | Billed USD з kit (Amp thread `Cost: $N`, Claude `total_cost_usd`, якщо є) | `$X.XX` без `≈` |
| `costUsdEstimated` | Оцінка kit (Cursor API-equivalent / майбутній fallback інших моделей) | лише якщо billed `null`: `≈ $Y.YY` |
| `ampCredits` | Кредити Amp | ніколи в доларовій комірці; колонка «Amp credits» |

`recordedCostUsd(row)` лишається **лише billed**, той самий обхід: `spend.costUsd` → `journal.spend.costUsd` → сума платформ → моделей → сесій → фаз. Числовий `0` є значенням.

Новий експорт `recordedEstimatedCostUsd(row)` — той самий обхід, читає `costUsdEstimated` замість `costUsd`. Повний billed-обхід виконується **першим**; оцінка читається лише коли billed є `null`.

`resolveDisplayedCost(row)` SHALL повернути `{ costUsd, estimated, estimatedCostUsd }`:

- `estimatedCostUsd` = `recordedEstimatedCostUsd(row)` (або `null`)
- якщо billed скінченне: `{ costUsd: billed, estimated: false, estimatedCostUsd }`
- інакше якщо оцінка скінченна: `{ costUsd: estimated, estimated: true, estimatedCostUsd: estimated }`
- інакше `{ costUsd: null, estimated: false, estimatedCostUsd: null }`

Видалити `estimateCostFromTokens` і константи `USD_PER_MILLION_*`. Не лишати мертвого експорту.

**Чому не складати credits у USD:** credits ≠ долари; overlay уже це забороняє.

**Альтернатива (лише top-level spend без обходу журналу)** відхилена: Cursor часто пише оцінку на `spendByPlatform.cursor` / моделях, тоді як overlay `spend.costUsdEstimated` ще `null`.

### D2. Ключі парсера

У `src/utils/changeMetrics.js` додати `costUsdEstimated` до:

- `SPEND_KEYS` (і порожній `journal.spend` / результат `parseSpendFields` / overlay `parseMetricsFile`)
- `PLATFORM_NUMBER_KEYS` і `emptyPlatformSpend`
- `MODEL_SPEND_KEYS`
- `SESSION_NUMBER_KEYS`
- `SOURCE_NUMBER_KEYS`
- `PHASE_NUMBER_KEYS`

Правила числа без змін: `typeof === 'number' && Number.isFinite`, рядок `'1'` → `null`. Відсутній ключ → `null`. Борд MUST показати скінченне значення, щойно ключ є у JSON.

`parseMetricsFile`: overlay MUST містити `costUsdEstimated` (скопійоване з `journal.spend.costUsdEstimated`). `source === 'metrics-file'`, якщо **будь-яке** з п’яти чисел скінченне (включно з оцінкою). Billed `costUsd` лишається окремим полем і може бути `null`, коли джерело вже `metrics-file` лише через оцінку.

`collectJournalModelRows` MUST копіювати `costUsdEstimated` разом із `costUsd` / токенами / `ampCredits`, інакше таблиця моделей у деталях знову втратить оцінку.

Невідомі top-level ключі як і раніше ігнорувати. Не писати `metrics.json`.

**Альтернатива (окремий overlay `estimated`)** відхилена: зайве поле в схемі; kit уже кладе ключ поруч із `costUsd`.

### D3. Префікс `≈` у UI

Файли: `src/views/AnalysisView.vue`, `src/components/AnalysisDetailsModal.vue`. `<script setup>`, без Options API, без коментарів.

Таблиця `/analysis/:projectId` і рядок overlay «Вартість»:

- `resolveDisplayedCost` → текст `$X.XX` або `≈ $X.XX` або `—` (`toFixed(2)`)
- `title` коли `estimated === true`: точно `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude`
- `title` коли billed показане і `estimatedCostUsd` скінченне: точно `$X.XX billed · ≈ $Y.YY kit` (обидва `toFixed(2)`)
- інакше `title` порожній
- прибрати рядок «оцінка за токенами: $3 / 1M input, $15 / 1M output»

У модалці overlay: додати поле `title` на об’єкт рядка «Вартість» у `detailRows` і прив’язати `:title="item.title"` на `<td>` значення (інші рядки без `title` лишають порожній атрибут).

Таблиці деталей (платформа / модель / фаза / сесія / source): локальний форматер запису `{ costUsd, costUsdEstimated }`:

- скінченне `costUsd` → `$X.XX`
- інакше скінченне `costUsdEstimated` → `≈ $Y.YY`
- інакше `—`

Не викликати row-level walk усередині рядка таблиці журналу. Для сесії передавати весь об’єкт сесії (не голе `session.costUsd`); для source — об’єкт source.

`AnalysisDetailsView.vue` не редагувати.

**Альтернатива (іконка / окрема колонка «Оцінка»)** відхилена: незмерджений UI уже вчить оператора читати `≈` в тій самій колонці.

### D4. Чесність vs поле kit

Локальна таблиця ставок борду = вигадка → заборонена.

Скінченне `costUsdEstimated` з JSON = поле kit → дозволене, обов’язково з `≈` і tooltip D3.

Наявність токенів без billed і без оцінки → `—`, навіть якщо токени великі.

Борд MUST показувати оцінку, щойно ключ є у файлі. Якщо kit `surface-estimated-spend` ще не в проді — grok-файли з ключем уже працюють; інші Cursor-моделі без ключа лишаються `—` доки kit не допише поле. Борд не компенсує це своїми ставками.

**Альтернатива (залишити $3/$15 як fallback)** відхилена: прямо ламає «MUST NOT вигадувати витрати».

### D5. Колонка Amp credits лишається

Не чіпати заголовок і клітинки «Amp credits» у таблицях платформ / моделей / сесій / sources. Не додавати credits у `costUsd`, `costUsdEstimated`, комірку «Вартість» таблиці аналізу, overlay «Вартість» і CSV `cost_usd` / `cost_usd_estimated`. `amp_credits` у CSV без змін (скінченне `journal.spendByPlatform.amp.ampCredits` або порожньо).

## Risks / Trade-offs

- [CSV `cost_usd` / `cost_usd_estimated` беруть overlay, а комірка робить walk журналу] → як сьогодні для billed; не міняти семантику `cost_usd`. Оператор бачить оцінку в UI навіть коли overlay ще `null`, якщо вона є на платформі.
- [Подвійний рахунок при сумі платформ] → той самий ризик, що в чинного `recordedCostUsd`; не змінювати формулу, лише дзеркалити її для оцінки.
- [Legacy metrics.json без ключа] → `null` → `—`; не підставляти ставки борду.
- [Незалитий UI уже показує `≈` від токенів] → тести `resolveDisplayedCost` / `AnalysisView` «estimates from tokens» MUST замінити на kit-поле; інакше регресія чесності.
- [Широкий CSV] → лише append в кінець, старі індекси колонок живі.

## Migration Plan

Немає зміни localStorage / env / реєстру. Відкат — revert утиліти й двох Vue-файлів: аналіз знову або `—`, або стара вигадка, якщо revert неповний. Файли `metrics.json` пише kit.

## Open Questions

Немає — рішення оператора зафіксовані.
