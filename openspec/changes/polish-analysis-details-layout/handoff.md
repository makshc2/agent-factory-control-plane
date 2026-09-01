# Session Handoff

## Closed role
Implementer (conductor) — apply complete, 15/15

## Change
- name: polish-analysis-details-layout
- status: apply-complete
- tasks: 15/15
- review: APPROVE
- last_role: Implementer

## Done
Conductor заспавнив спеціалістів, перевірив Done-when, позначив `tasks.md`. Код писали субагенти, не батьківський тред.

Keep-flag у `loadAnalysis`: той самий `projectId` не обнуляє рядки; порожній успіх замінює; повний збій при `keep` лишає старі. Оверлей `AnalysisLoadingOverlay` (z-index 30, без Quasar) лише коли немає рядків для рендеру. Список аналізу — стек `.analysis-change-card` (без таблиці, без колонок «Агенти»/«Платформи»). Деталі — `.analysis-metric-card` / `.analysis-session-card` / `.analysis-journal-card`; pending-підписи hide-when-empty; `runtime` як середовище. Шухляда — `.board-detail-card`, вердикт/blocked/`nextRole` бейджами. Тести оновлені під картки/оверлей. `npm run lint` — exit 0. Тести не ганялись (user policy).

Браузер (localhost:5174): холодний аналіз показує оверлей «Завантаження аналізу…»; при вже наявних рядках оверлей не з’являється на повторному завантаженні; картки списку й деталей без H-scroll; шухляда `role="dialog"` / «Закрити» / «Завантаження деталей…». Живі GitHub/GitLab репозиторії в цьому середовищі відповіли «не знайдено» — картки перевірені на засіяних рядках Pinia.

## Decisions
- apply-complete: усі 15 задач `[x]`; lint зелений; tests skipped (user policy)
- overlay-keep-verified: повторне завантаження того самого проєкту з уже наявними рядками не показує оверлей і не чистить картки

## Blocked
none

## Next command
`/opsx:archive polish-analysis-details-layout`

## Next role
Archiver

## Attach
- `openspec/changes/polish-analysis-details-layout/tasks.md`
- `openspec/changes/polish-analysis-details-layout/apply-notes.md`
- `openspec/changes/polish-analysis-details-layout/review.md`
- `src/stores/analysis.js`
- `src/components/AnalysisLoadingOverlay.vue`
- `src/views/AnalysisView.vue`
- `src/views/AnalysisDetailsView.vue`
- `src/components/AnalysisDetailsModal.vue`
- `src/components/ProjectDetailPanel.vue`
- `src/styles.css`

## Subagents to spawn
- archive: `npx agent-orchestrator-kit archive polish-analysis-details-layout` — без субагента (`spec-archiver` лише якщо CLI впав)
- `code-reviewer` — optional before PR/MR
- `session-handoff` — persist at exit if CLI fails (Amp: isolated `subagent-session-handoff`)

## Constraints
- language: uk
- do not mix phases
- do not start archive in this chat
- tests skipped unless operator asks (user policy)
- do not overlay board 60s poll
- do not delete pending from parser/CSV
- do not convert Amp credits to USD
- no Quasar; Vue 3 + Pinia + Axios
- Design: none
- do not restore Agents/Platforms columns on the analysis list
- after archive: підчистити «таблиця» у головних спеках (неблокуюча note з review)
- status: apply-complete
- tasks: 15/15
- review: APPROVE

## Runtime
- runtime: local
- agent_id: none

## Metrics
- platform: cursor
- model: cursor-grok-4.6
- input_tokens: unknown
- output_tokens: unknown
- cost_usd: unknown
- amp_credits: unknown
- spend_source: unknown

## Prompt

```text
/opsx:archive polish-analysis-details-layout

Ти — conductor наступної рольової сесії для зміни `polish-analysis-details-layout`.
Мова відповіді: українська (`project.agent_language: uk`).
НЕ змішуй фази. НЕ починай наступну роль у цьому ж чаті, доки ця фаза не закрита за HARD STOP.

## Хто ти і що робити
- Команда цієї сесії: `/opsx:archive polish-analysis-details-layout`
- Наступна роль / субагент фази: `spec-archiver`
- Amp: заспавни isolated skill `subagent-spec-archiver` зі свіжим контекстом. Виконувати тіло спеціаліста в головному треді Amp — порушення протоколу.
- Cursor / Claude: заспавни `.cursor/agents/spec-archiver.md` / `.claude/agents/spec-archiver.md`.
- Батьківська сесія — лише conductor: перевіряє звіт, не виконує роботу спеціаліста.

## Обов'язковий старт (до будь-якої роботи спеціаліста)
1. Виконай pasted-команду `/opsx:archive polish-analysis-details-layout` і оголоси роль.
2. `npx agent-orchestrator-kit status`
3. `npx agent-orchestrator-kit handoff polish-analysis-details-layout --restore`
4. Прочитай Memory MCP: `Change:polish-analysis-details-layout`, `Handoff:polish-analysis-details-layout`, `Decision:*`.
5. Якщо Memory порожнє або MCP недоступний — прочитай `openspec/changes/polish-analysis-details-layout/handoff.md`. Відсутність Memory НЕ блокує сесію, коли є файл.
6. Заспавни `session-handoff` у режимі restore, якщо брифінг неповний (Amp: isolated `subagent-session-handoff`).
7. Лише після цього заспавни субагента фази. Free-form «продовжуй» / «далі» при одній активній зміні = `Handoff.next_command`.

## Повний контекст попередньої сесії (самодостатній — не покладайся лише на Memory)
- Закрита роль: Implementer (conductor) — apply complete, 15/15
- Зміна: - name: polish-analysis-details-layout
- status: apply-complete
- tasks: 15/15
- review: APPROVE
- last_role: Implementer
- Зроблено:
Conductor заспавнив спеціалістів, перевірив Done-when, позначив `tasks.md`. Код писали субагенти, не батьківський тред.

Keep-flag у `loadAnalysis`: той самий `projectId` не обнуляє рядки; порожній успіх замінює; повний збій при `keep` лишає старі. Оверлей `AnalysisLoadingOverlay` (z-index 30, без Quasar) лише коли немає рядків для рендеру. Список аналізу — стек `.analysis-change-card` (без таблиці, без колонок «Агенти»/«Платформи»). Деталі — `.analysis-metric-card` / `.analysis-session-card` / `.analysis-journal-card`; pending-підписи hide-when-empty; `runtime` як середовище. Шухляда — `.board-detail-card`, вердикт/blocked/`nextRole` бейджами. Тести оновлені під картки/оверлей. `npm run lint` — exit 0. Тести не ганялись (user policy).

Браузер (localhost:5174): холодний аналіз показує оверлей «Завантаження аналізу…»; при вже наявних рядках оверлей не з’являється на повторному завантаженні; картки списку й деталей без H-scroll; шухляда `role="dialog"` / «Закрити» / «Завантаження деталей…». Живі GitHub/GitLab репозиторії в цьому середовищі відповіли «не знайдено» — картки перевірені на засіяних рядках Pinia.
- Рішення:
- apply-complete: усі 15 задач `[x]`; lint зелений; tests skipped (user policy)
- overlay-keep-verified: повторне завантаження того самого проєкту з уже наявними рядками не показує оверлей і не чистить картки
- Блокери:
none
- Attach:
- `openspec/changes/polish-analysis-details-layout/tasks.md`
- `openspec/changes/polish-analysis-details-layout/apply-notes.md`
- `openspec/changes/polish-analysis-details-layout/review.md`
- `src/stores/analysis.js`
- `src/components/AnalysisLoadingOverlay.vue`
- `src/views/AnalysisView.vue`
- `src/views/AnalysisDetailsView.vue`
- `src/components/AnalysisDetailsModal.vue`
- `src/components/ProjectDetailPanel.vue`
- `src/styles.css`
- Субагенти цієї сесії:
- archive: `npx agent-orchestrator-kit archive polish-analysis-details-layout` — без субагента (`spec-archiver` лише якщо CLI впав)
- `code-reviewer` — optional before PR/MR
- `session-handoff` — persist at exit if CLI fails (Amp: isolated `subagent-session-handoff`)
- Обмеження:
- language: uk
- do not mix phases
- do not start archive in this chat
- tests skipped unless operator asks (user policy)
- do not overlay board 60s poll
- do not delete pending from parser/CSV
- do not convert Amp credits to USD
- no Quasar; Vue 3 + Pinia + Axios
- Design: none
- do not restore Agents/Platforms columns on the analysis list
- after archive: підчистити «таблиця» у головних спеках (неблокуюча note з review)
- status: apply-complete
- tasks: 15/15
- review: APPROVE
- status: spec-approved
- tasks: 15/15
- review: APPROVE

## HARD STOP на виході (ти НЕ закінчив, поки це не виконано)
1. Заспавни `session-handoff` у режимі persist (Amp: isolated `subagent-session-handoff`). Якщо spawn недоступний — зроби persist сам, ніколи не пропускай.
2. Запиши `openspec/changes/polish-analysis-details-layout/handoff.md` з усіма секціями шаблону.
3. `npx agent-orchestrator-kit handoff polish-analysis-details-layout` — exit 0 обов'язковий. CLI записує Memory JSON абсолютним шляхом і друкує розширений промпт у stdout.
4. Якщо Memory MCP живий — онови `Change:polish-analysis-details-layout`, `Handoff:polish-analysis-details-layout`, `Decision:*` відповідно до файлу.
5. Встав stdout CLI у чат одним fenced-блоком. Не скорочуй. Без службового ярлика. Перший рядок — `/opsx:…`.
6. Зупинись. Наступна роль починається в НОВОМУ чаті з цим промптом.

OpenSpec-файли — source of truth для вимог і тасків. Memory і handoff.md — індекс фази. Цей промпт — повний операційний бриф наступного треду, навіть якщо Amp проігнорує Memory MCP.
```
