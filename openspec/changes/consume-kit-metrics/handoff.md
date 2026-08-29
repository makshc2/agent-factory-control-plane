# Session Handoff

## Closed role
Implementer — apply complete, 11/11 tasks, lint/test/build exit 0

## Change
- name: consume-kit-metrics
- status: applying
- tasks: 11/11
- review: APPROVE
- last_role: implementer

## Done
Parent-driven apply після APPROVE. Isolated `code-writer` зробив 1.1 / 2.1 / 3.1 / 3.2; isolated `test-writer` — 1.2 / 4.1 / 4.2 / 4.3. Батько перевірив Done-when і поставив чекбокси.

`src/utils/changeMetrics.js` експортує `parseKitMetrics`, `preferDuration`; `parseMetricsFile` — overlay spend; `buildChangeMetrics` додає `journal` і `kitTimes`; CSV-хвіст `sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits`. `journal.source === 'metrics-file'` для валідного JSON навіть коли spend null; `spend.source === 'metrics-file'` лише якщо ≥1 скінченне spend-число.

UI: колонки Сесії / Lead time / Моделі, мітка «триває», `preferDuration` для Спека/Рев’ю/Apply/Усього. Модалка — журнал, kit-час, таблиці платформ/моделей/фаз/сесій; git-span і spend-overlay збережені; без балу 1–5 і сирого `spend.source`. Стилі `.analysis-pending` і `.analysis-journal-table`. Не чіпали `analysis.js`, `board.js`, api, poller, `DETAIL_ARTIFACTS`, `openspecParsers.js`.

Верифікація: `npm run lint` exit 0; `npm test` 124/124 exit 0 (включно з ізоляцією борду); `npm run build` exit 0 (Vite, 107 modules).

## Decisions
- apply.delegation: isolated code-writer + test-writer — parent лише перевіряв Done-when і ставив `[x]`

## Blocked
none

## Next command
`/opsx:archive consume-kit-metrics`

## Next role
Archiver

## Attach
- `openspec/changes/consume-kit-metrics/tasks.md`
- `openspec/changes/consume-kit-metrics/apply-notes.md`
- `openspec/changes/consume-kit-metrics/review.md`
- `src/utils/changeMetrics.js`
- `src/views/AnalysisView.vue`
- `src/components/AnalysisDetailsModal.vue`

## Subagents to spawn
- — archive є CLI: `npx agent-orchestrator-kit archive consume-kit-metrics` (фаза-субагент заборонений; `spec-archiver` лише якщо CLI впав)
- `session-handoff` — restore fallback only if CLI + handoff.md fail

## Constraints
- language: uk
- do not mix phases
- archive after merge + CI green; do not start archive in the apply chat
- commit/PR separately; do not include unrelated dirty kit/add-factory-board files
- JS, `<script setup>`, no Options API, no comments
- do not touch board.js, analysis store, api, poller, DETAIL_ARTIFACTS
- status: applying
- tasks: 11/11
- review: APPROVE
- lint/test/build: exit 0

## Runtime
- runtime: local
- agent_id: none

## Prompt

```text
/opsx:archive consume-kit-metrics

Ти — conductor наступної рольової сесії для зміни `consume-kit-metrics`.
Мова відповіді: українська (`project.agent_language: uk`).
НЕ змішуй фази. НЕ починай наступну роль у цьому ж чаті, доки ця фаза не закрита за HARD STOP.

## Хто ти і що робити
- Команда цієї сесії: `/opsx:archive consume-kit-metrics`
- Наступна роль / субагент фази: `spec-archiver`
- Amp: заспавни isolated skill `subagent-spec-archiver` зі свіжим контекстом. Виконувати тіло спеціаліста в головному треді Amp — порушення протоколу.
- Cursor / Claude: заспавни `.cursor/agents/spec-archiver.md` / `.claude/agents/spec-archiver.md`.
- Батьківська сесія — лише conductor: перевіряє звіт, не виконує роботу спеціаліста.

## Обов'язковий старт (до будь-якої роботи спеціаліста)
1. Виконай pasted-команду `/opsx:archive consume-kit-metrics` і оголоси роль.
2. `npx agent-orchestrator-kit status`
3. `npx agent-orchestrator-kit handoff consume-kit-metrics --restore`
4. Прочитай Memory MCP: `Change:consume-kit-metrics`, `Handoff:consume-kit-metrics`, `Decision:*`.
5. Якщо Memory порожнє або MCP недоступний — прочитай `openspec/changes/consume-kit-metrics/handoff.md`. Відсутність Memory НЕ блокує сесію, коли є файл.
6. Заспавни `session-handoff` у режимі restore, якщо брифінг неповний (Amp: isolated `subagent-session-handoff`).
7. Лише після цього заспавни субагента фази. Free-form «продовжуй» / «далі» при одній активній зміні = `Handoff.next_command`.

## Повний контекст попередньої сесії (самодостатній — не покладайся лише на Memory)
- Закрита роль: Implementer — apply complete, 11/11 tasks, lint/test/build exit 0
- Зміна: - name: consume-kit-metrics
- status: applying
- tasks: 11/11
- review: APPROVE
- last_role: implementer
- Зроблено:
Parent-driven apply після APPROVE. Isolated `code-writer` зробив 1.1 / 2.1 / 3.1 / 3.2; isolated `test-writer` — 1.2 / 4.1 / 4.2 / 4.3. Батько перевірив Done-when і поставив чекбокси.

`src/utils/changeMetrics.js` експортує `parseKitMetrics`, `preferDuration`; `parseMetricsFile` — overlay spend; `buildChangeMetrics` додає `journal` і `kitTimes`; CSV-хвіст `sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits`. `journal.source === 'metrics-file'` для валідного JSON навіть коли spend null; `spend.source === 'metrics-file'` лише якщо ≥1 скінченне spend-число.

UI: колонки Сесії / Lead time / Моделі, мітка «триває», `preferDuration` для Спека/Рев’ю/Apply/Усього. Модалка — журнал, kit-час, таблиці платформ/моделей/фаз/сесій; git-span і spend-overlay збережені; без балу 1–5 і сирого `spend.source`. Стилі `.analysis-pending` і `.analysis-journal-table`. Не чіпали `analysis.js`, `board.js`, api, poller, `DETAIL_ARTIFACTS`, `openspecParsers.js`.

Верифікація: `npm run lint` exit 0; `npm test` 124/124 exit 0 (включно з ізоляцією борду); `npm run build` exit 0 (Vite, 107 modules).
- Рішення:
- apply.delegation: isolated code-writer + test-writer — parent лише перевіряв Done-when і ставив `[x]`
- Блокери:
none
- Attach:
- `openspec/changes/consume-kit-metrics/tasks.md`
- `openspec/changes/consume-kit-metrics/apply-notes.md`
- `openspec/changes/consume-kit-metrics/review.md`
- `src/utils/changeMetrics.js`
- `src/views/AnalysisView.vue`
- `src/components/AnalysisDetailsModal.vue`
- Субагенти цієї сесії:
- — archive є CLI: `npx agent-orchestrator-kit archive consume-kit-metrics` (фаза-субагент заборонений; `spec-archiver` лише якщо CLI впав)
- `session-handoff` — restore fallback only if CLI + handoff.md fail
- Обмеження:
- language: uk
- do not mix phases
- archive after merge + CI green; do not start archive in the apply chat
- commit/PR separately; do not include unrelated dirty kit/add-factory-board files
- JS, `<script setup>`, no Options API, no comments
- do not touch board.js, analysis store, api, poller, DETAIL_ARTIFACTS
- status: applying
- tasks: 11/11
- review: APPROVE
- lint/test/build: exit 0
- status: spec-approved
- tasks: 11/11
- review: APPROVE

## HARD STOP на виході (ти НЕ закінчив, поки це не виконано)
1. Заспавни `session-handoff` у режимі persist (Amp: isolated `subagent-session-handoff`). Якщо spawn недоступний — зроби persist сам, ніколи не пропускай.
2. Запиши `openspec/changes/consume-kit-metrics/handoff.md` з усіма секціями шаблону.
3. `npx agent-orchestrator-kit handoff consume-kit-metrics` — exit 0 обов'язковий. CLI записує Memory JSON абсолютним шляхом і друкує розширений промпт у stdout.
4. Якщо Memory MCP живий — онови `Change:consume-kit-metrics`, `Handoff:consume-kit-metrics`, `Decision:*` відповідно до файлу.
5. Встав stdout CLI у чат одним fenced-блоком. Не скорочуй. Без службового ярлика. Перший рядок — `/opsx:…`.
6. Зупинись. Наступна роль починається в НОВОМУ чаті з цим промптом.

OpenSpec-файли — source of truth для вимог і тасків. Memory і handoff.md — індекс фази. Цей промпт — повний операційний бриф наступного треду, навіть якщо Amp проігнорує Memory MCP.
```
