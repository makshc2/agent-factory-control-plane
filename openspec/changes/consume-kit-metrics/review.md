# Review: consume-kit-metrics

**Date:** 2026-08-29
**Verdict:** APPROVE

Tier 1 (`npx agent-orchestrator-kit gate-check --review consume-kit-metrics`) — пройдено. Tier 2 нижче — семантика, консистентність, посилання на репозиторій. Пункти Tier 1 (strict validate, наявність полів контракту, секції proposal, структура дельт) не переперевірялись.

## Checklist summary

**Consistency**
- proposal ↔ design ↔ tasks розповідають одну історію, без суперечностей і дрейфу — ✓
- Delta-спеки покривають усю змінену/додану поведінку з design — ✓

**Main specs**
- Немає конфліктів із чинними `openspec/specs/` — ✓

**Scope**
- Немає scope creep проти proposal Non-goals — ✓

**Task self-sufficiency**
- Сліпий імплементер може виконати кожен таск лише з Files/Do/Done-when, без `design.md` — ✓

**Vue 3** (`project.stack: vue3`)
- Компоненти: `<script setup>` + Composition API, без Options API — ✓
- Стан через Pinia setup stores (HTTP стора не змінюється) — ✓
- HTTP через наявні Axios-клієнти провайдера, без `fetch(` у api — ✓
- Таски посилаються на конкретні шляхи під `src/` — ✓ (усі існують)
- Немає scope creep у сторонні UI-рефактори — ✓

## Перевірено

- **Рішення propose-сесії** відображені в усіх артефактах: `journal.source === 'metrics-file'` для валідного JSON навіть коли `spend.* === null`; таблиця пріоритет kit-тривалості; git-span лишається в модалці; CSV `spec_hours` лишається git-span; повний журнал kit v1 (sessions / phases / totals / platforms / models / pending), не spend-only; живий полер без `metrics.json`; `ampCredits` ≠ USD.
- **proposal ↔ design ↔ tasks:** Why/What/Acceptance = D1–D8 = таски 1.1–5.3. Немає нових HTTP, нової адреси, п’ятого KPI, vendor billing, запису журналу, Hydra, балу 1–5, зміни ключа `factory-board.projects.v1`.
- **Delta `change-metrics`:** ADDED «Повний журнал» і «Kit-тривалості»; MODIFIED канонічна модель (`journal`, `kitTimes`, `agents.models`/`platforms`), чесність (`journal.source` окремо від `spend.source`), spend-overlay, екран `/analysis/:projectId` з новими колонками й `preferDuration`, CSV-хвіст, агенти з журналу. Поведінка D1–D5 покрита вимогами; імена функцій (`parseKitMetrics`, `preferDuration`) свідомо лишені в тасках.
- **Основні спеки:** `factory-board` (4 KPI, без spend-колонок на `/`), `board-polling` і `artifact-ingestion` (полер не читає `metrics.json`) не послаблюються — таски не чіпають `board.js` / api / `usePoller`. `project-registry` / `project-detail` поза скоупом. MODIFIED «Деривація інтервалів» (`change` = унікальні коміти spec+review+apply) фіксує вже наявний код у `buildChangeMetrics`, а не нову формулу — таск 1.1 забороняє змінювати git-spans.
- **Шляхи `src/` існують і є правильними цілями:** `changeMetrics.js` (spend-only `parseMetricsFile`, CSV без журналу), `AnalysisView.vue` (колонки без Сесій/Lead/Моделей, час з `spans`), `AnalysisDetailsModal.vue` (плоский список без журналу), `styles.css` (є `.analysis-details-table` і `.board-kpis` на 4 колонки), `analysis.js` уже передає `artifacts.metrics`, `board.js` `DETAIL_ARTIFACTS` без `metrics.json`, тести `changeMetrics.spec.js` / `analysis.spec.js` / `AnalysisView.spec.js` / `AnalysisDetailsModal.spec.js` / `board.spec.js` (рядок про `metrics.json` не в poller).
- **Самодостатність:** 1.1 містить повний контракт парсера, stub, `preferDuration`, `kitTimes`, агентів і точний CSV-заголовок; 1.2 — фікстуру 7 сесій і очікування; 3.1 — порядок `<th>`, тексти tooltip, `триває`; 3.2 — українські підписи й таблиці; 4.x — що не ламати і що додати.

## Findings (не блокують)

1. **Колонка «Токени» у таблицях фаз/сесій.** Таск 3.2 задає заголовок, але не поле. Канон екрана аналізу — `totalTokens` (як колонка «Токени» зі `spend`). Зафіксовано в `apply-notes.md`.
2. **`sessions[].sources`.** D1 і таск 1.1 вимагають парсити `sources`; delta й модалка їх не показують. Парсити й ігнорувати в UI — достатньо.
3. **Чинний тест модалки** без `journal` / `kitTimes`. Таск 4.2 його зберігає: читати `row.journal?.…`, відсутнє → `невідомо` / `—`, без throw.
4. **`factory-board`** досі згадує шлях `/analysis` (навігація з борду). У коді вже `/analysis/:projectId`; ця зміна роутер не чіпає. Поза скоупом.

## Обґрунтування

Артефакти імплементовані без матеріального вгадування: контракт парсера, CSV, колонки, підписи модалки й очікування тестів задані дослівно в `tasks.md`; посилання на існуючі файли перевірені; Non-goals і ізоляція живого борду не порушені.
