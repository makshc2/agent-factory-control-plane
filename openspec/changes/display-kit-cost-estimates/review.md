# Review: display-kit-cost-estimates

**Date:** 2026-08-31
**Verdict:** APPROVE

Tier 1 (`npx agent-orchestrator-kit gate-check --review display-kit-cost-estimates`) — «Tier 1 review passed». Tier 2 нижче — семантика, консистентність, посилання на репозиторій. Пункти Tier 1 (strict validate, наявність полів контракту, секції proposal, структура дельт) не переперевірялись.

## Checklist summary

**Consistency**
- proposal ↔ design ↔ tasks розповідають одну історію, без суперечностей і дрейфу — ✓
- Delta-спеки покривають усю змінену/додану поведінку з design — ✓

**Main specs**
- Немає конфліктів із чинними `openspec/specs/` після застосування дельти — ✓
- Вимога «Чесність відсутніх даних» оновлена: показ kit `costUsdEstimated` з `≈` дозволений; локальні ставки `$3` / `$15` (токен × $/1M) заборонені — ✓

**Scope**
- Немає scope creep проти proposal Non-goals — ✓

**Task self-sufficiency**
- Сліпий імплементер може виконати кожен таск лише з Files/Do/Done-when, без `design.md` — ✓

**Vue 3** (`openspec/config.yaml`: Vue 3, `<script setup>`, Pinia, Axios, JavaScript)
- Компоненти: `<script setup>` + Composition API, без Options API — ✓
- Стан / HTTP: Pinia-стори й Axios-клієнти не змінюються — ✓
- Таски посилаються на конкретні шляхи під `src/` — ✓ (усі існують)
- Немає scope creep у сторонні UI-рефактори — ✓

## Перевірено

- **Одна історія:** Why/What/Acceptance = D1–D5 = таски 1.1–5.1. Парсер `costUsdEstimated` на overlay / платформах / моделях / сесіях / sources / фазах; комірка billed → `≈` kit → `—`; прибрати `USD_PER_MILLION_*` і `estimateCostFromTokens`; Amp credits окремо; CSV `cost_usd` billed + хвіст `cost_usd_estimated`.
- **Чесність vs main spec:** чинна `openspec/specs/change-metrics/spec.md` забороняє вигадувати витрати і при `spend.costUsd === null` вимагає `—`. Дельта **MODIFIED** «Чесність відсутніх даних»: `null` лишається `—`; нуль з файлу (включно з `costUsdEstimated === 0`) видимий; MUST NOT локальна таблиця ставок; MUST NOT credits→USD; скінченне kit `costUsdEstimated` з `≈` **дозволене**. ADDED «Резолюція показаної вартості» фіксує обхід billed/estimated і заборону vendor API. Після archive старий сценарій «лише `costUsd === null` → `—`» замінюється на «обидва null → `—`».
- **Delta покриває design:** D1 (`recordedCostUsd` / `recordedEstimatedCostUsd` / `resolveDisplayedCost`) — ADDED резолюція + сценарії billed / лише оцінка / платформа Cursor / токени без вартості / credits / нулі. D2 — MODIFIED overlay (п’ять ключів, `source` від оцінки) і повний журнал (`costUsdEstimated` на платформі, сесії, source, фазі). D3 — MODIFIED екран аналізу (колонка + таблиці деталей). D4 — MODIFIED чесність. D5 — credits лишаються колонкою. CSV — MODIFIED заголовок і сценарії `cost_usd` vs `cost_usd_estimated`.
- **Інші main specs:** `factory-board` «Живий огляд без spend» і `board-polling` / `artifact-ingestion` (полер не читає `metrics.json`) не послаблюються — таски не чіпають `board.js`, api, `usePoller`, `/`, KPI.
- **Non-goals:** немає vendor API, запису `metrics.json`, конвертації credits, живої таблиці `/`, Hydra, копіювання kit rate tables, показу ролей як моделей, правки `AnalysisDetailsView.vue`.
- **Шляхи `src/` існують:** `src/utils/changeMetrics.js`, `src/utils/changeMetrics.spec.js`, `src/views/AnalysisView.vue`, `src/views/AnalysisView.spec.js`, `src/components/AnalysisDetailsModal.vue`, `src/components/AnalysisDetailsModal.spec.js`. `src/views/AnalysisDetailsView.vue` і `src/stores/board.js` існують і в тасках явно заборонені.
- **Самодостатність:** 1.1 — шість масивів ключів, overlay `source`, `collectJournalModelRows`; 1.2 — сигнатура `resolveDisplayedCost` і заборона `USD_PER_MILLION`; 1.3 — точний `CSV_HEADER`; 2.1 / 4.1 / 4.2 — конкретні фікстури й очікування; 3.1 — точні рядки tooltip; 3.2 — форматер запису, не голе число, Amp credits не чіпати.

## Findings (не блокують)

1. **Tooltip overlay у модалці.** D3 вимагає `title` і для рядка overlay «Вартість». Таск 3.1 канонізує tooltip у `AnalysisView.vue`; 3.2 лишає overlay на `displayedCostLabel` без окремого `title`. Сценарії ADDED кажуть «tooltip комірки» — достатньо таблиці `/analysis`. Не блокує apply.
2. **CSV vs комірка.** Оцінка в UI може прийти з walk журналу, коли overlay `null`; CSV читає лише overlay. Зафіксовано в design Risks; семантику `cost_usd` не міняти.
3. **proposal Why «Design: none»** — залишок шаблону; design.md повний.

## Обґрунтування

Артефакти імплементовані без матеріального вгадування: ключі парсера, сигнатура резолвера, точний CSV-рядок, тексти tooltip і очікування тестів задані в `tasks.md`; дельта знімає конфлікт чесності з kit-оцінкою і забороняє `$3` / `$15`; Non-goals і ізоляція живого борду не порушені.
