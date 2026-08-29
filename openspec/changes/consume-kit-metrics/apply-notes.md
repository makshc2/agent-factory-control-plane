# Apply notes: consume-kit-metrics

- Порядок: 1.1 → 1.2 → 2.1 → 3.1 → 3.2 → 4.1–4.3 → 5.1–5.3. Канон текстів/CSV/полів — `tasks.md`.
- НЕ чіпати: `src/stores/analysis.js`, `src/stores/board.js`, `src/api/*`, `src/router`, `src/utils/openspecParsers.js`, `usePoller`, `refreshAll` / `loadProjectDetails`, `.board-kpis`, ключ `factory-board.projects.v1`. Без нових npm і без `fetch(` у api.
- `journal.source === 'metrics-file'` для валідного JSON-об’єкта навіть коли всі `spend.* === null`; `spend.source === 'metrics-file'` лише якщо ≥1 скінченне spend-число. Не зводити одне до одного.
- `preferDuration`: скінченне `kitMs` (включно з `0`) → kit; інакше git-span. Tooltip називає джерело показаного числа.
- `ampCredits` ніколи не додавати в `costUsd`. CSV: `spec_hours`/`review_hours`/`apply_hours`/`change_hours` = git-span; `work_hours`/`lead_hours` = kit; `amp_credits` = скінченне `journal.spendByPlatform.amp.ampCredits` або порожньо. BOM лише в UI.
- Агенти: `subagents` завжди з handoff; моделі ніколи з `role` / Closed role. Модалка: `journal?.…` (чинний тест без журналу); колонка «Токени» у фазах/сесіях = `totalTokens`; git-span і spend-overlay зберегти; без балу 1–5 і сирого `spend.source`.
- JS, `<script setup>`, без Options API і без коментарів. `DETAIL_ARTIFACTS` і полер без `metrics.json` — не послаблювати `board.spec.js`.
- Верифікація: `npm run lint`, `npm test`, `npm run build` — усі exit 0.
