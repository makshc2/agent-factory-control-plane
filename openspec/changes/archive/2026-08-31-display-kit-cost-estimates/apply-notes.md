# Apply notes: display-kit-cost-estimates

- Порядок: 1.1 → 1.2 → 1.3 → 2.1 → 3.1 → 3.2 → 4.1 → 4.2 → 5.1. Канон текстів і CSV — `tasks.md`.
- Лише шість файлів: `src/utils/changeMetrics.js` (+ spec), `src/views/AnalysisView.vue` (+ spec), `src/components/AnalysisDetailsModal.vue` (+ spec). JS, `<script setup>`, без Options API, без коментарів, без TypeScript, без нових npm.
- НЕ чіпати: жива таблиця `/`, KPI, полер, `src/stores/board.js`, `usePoller`, `src/api/*`, роутер, `src/views/AnalysisDetailsView.vue`, запис `metrics.json`, vendor API, Hydra, конвертація Amp credits у USD.
- `recordedCostUsd` — лише billed. `recordedEstimatedCostUsd` — той самий обхід, читає `costUsdEstimated`. `resolveDisplayedCost` → `{ costUsd, estimated, estimatedCostUsd }`. Видалити `USD_PER_MILLION_*` і `estimateCostFromTokens` (без мертвого експорту).
- `spend.source === 'metrics-file'`, якщо скінченне будь-яке з п’яти overlay-чисел (включно з `costUsdEstimated`). Рядок `'0.42'` → `null`. `collectJournalModelRows` копіює `costUsdEstimated`.
- CSV: `cost_usd` = billed overlay; `cost_usd_estimated` лише в кінець заголовка. Не вставляти колонку в середину. CSV не робить walk журналу.
- UI: billed `$X.XX`; інакше `≈ $Y.YY`; інакше `—` (не `$0.00` з токенів). Tooltip оцінки точно: `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude`. Обидва скінченні: `$X.XX billed · ≈ $Y.YY kit`. Таблиці журналу — локальний форматер рядка, не `resolveDisplayedCost`. `ampCredits` лише колонка «Amp credits».
- Верифікація: `npm run lint`. Опційно: `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js src/views/AnalysisView.spec.js src/components/AnalysisDetailsModal.spec.js`.
