## Why

Екран аналізу вже показує колонку «Вартість», але парсер відкидає kit-поле `costUsdEstimated`, а борд підставляє долари локальною таблицею `$3 / $15` за 1M токенів, коли billed `costUsd` є `null`. Це порушує чинну вимогу «MUST NOT вигадувати витрати»: оператор бачить вигадку борду замість billed Amp `$` або підписаної оцінки kit.

Design: none

## What Changes

- Парсити `costUsdEstimated` у spend-overlay, платформах, моделях, сесіях, sources і фазах журналу. Скінченне `costUsdEstimated` SHALL ставити `spend.source === 'metrics-file'`; billed `costUsd` лишається окремим полем.
- Комірка «Вартість» на `/analysis` і в деталях SHALL брати числа лише з kit `metrics.json`: billed `costUsd` як `$X.XX`; якщо billed `null` — `≈ $Y.YY` з kit `costUsdEstimated`; якщо обидва `null` — `—` (не `$0.00`, не локальний token×rate).
- Якщо billed і estimated обидва скінченні: комірка показує billed; tooltip MUST бути `$X.XX billed · ≈ $Y.YY kit`.
- Якщо показано лише `≈`: tooltip MUST казати, що це оцінка kit, не рахунок Cursor / Amp / Claude і не ставки `$3 / $15` на борді.
- Видалити з борду `USD_PER_MILLION_*` і `estimateCostFromTokens`. Amp `ampCredits` лишаються колонкою деталей і MUST NOT потрапляти в комірку доларів чи в `costUsd` / `costUsdEstimated`.
- Оновити вимогу чесності: локальні таблиці ставок заборонені; показ підписаного kit `costUsdEstimated` дозволений (це поле файлу, не вигадка борду).
- CSV: `cost_usd` лишається billed overlay; у кінець заголовків додати `cost_usd_estimated`. Порядок наявних колонок не ламати.

## Capabilities

### New Capabilities

(немає)

### Modified Capabilities

- `change-metrics`: парсер `costUsdEstimated`; чесність (заборона локальних ставок, дозвіл kit-оцінки); комірка «Вартість» і таблиці деталей billed-then-estimated; CSV `cost_usd_estimated`.

## Impact

- Код: `src/utils/changeMetrics.js` (+ `src/utils/changeMetrics.spec.js`), `src/views/AnalysisView.vue` (+ spec), `src/components/AnalysisDetailsModal.vue` (+ spec). `src/views/AnalysisDetailsView.vue` лише обгортає модалку — підписи вартості там не живуть.
- API / полер / `src/stores/board.js` / реєстр / жива таблиця `/` / KPI: без змін.
- Залежності: без нових npm; JavaScript, без TypeScript.
- Роутер: `/analysis/:projectId` без нової адреси. Борд не пише `metrics.json`.

## Non-goals

- Виклики Amp / Cursor / Claude API з борду.
- Конвертація Amp credits у USD і змішування credits у `spend.costUsd` / комірку «Вартість».
- Зміна живої таблиці `/`, KPI або полера.
- Запис `metrics.json` з борду.
- Hydra SSO.
- Копіювання kit rate tables на борд (борду не можна тримати власну таблицю ставок).
- Показ імен ролей Explorer / Architect як моделей.

## Acceptance criteria

- Парсер зберігає скінченне `costUsdEstimated` на overlay, платформах, моделях, сесіях, sources і фазах; рядок `'1'` → `null`; відсутній ключ → `null`.
- Overlay лише з `costUsdEstimated: 0.42` → це число, `costUsd === null`, `source === 'metrics-file'`.
- Токени без `costUsd` і без `costUsdEstimated` → комірка `—`; модуль MUST NOT експортувати `estimateCostFromTokens` і MUST NOT містити `USD_PER_MILLION`.
- Комірка «Вартість»: billed `$1.50`; лише estimated `≈ $0.42` з tooltip оцінки kit; обидва скінченні — billed у комірці й tooltip `$1.50 billed · ≈ $0.42 kit`; обидва `null` → `—`.
- Amp credits видимі в колонці деталей і відсутні в комірці «Вартість».
- CSV зберігає порядок старих заголовків і додає `cost_usd_estimated` у кінець.
- Живий борд `/` і KPI без змін.
