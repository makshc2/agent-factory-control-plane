# Session Handoff

## Closed role
Implementer (`/opsx:apply add-change-metrics`) — 16/16 tasks `[x]`. Lint, test, build зелені.

## Change
- name: add-change-metrics
- status: applying
- tasks: 16/16
- review: APPROVE
- last_role: Implementer

## Done
- Оголошено роль conductor фази apply. `npx agent-orchestrator-kit status` — `add-change-metrics` 0/16, review APPROVE. `handoff --restore` — брифінг повний; Memory JSON порожній; fallback `session-handoff` restore не знадобився. Memory MCP у сесії недоступний (не блокує).
- Parent не писав прод-код і тести; маркував `tasks.md` лише після перевірки звітів і Done-when.
- Хвилі isolated спеціалістів (без спільних файлів у хвилі):
  - [code-writer 1.1](e98bbf7e-a7d2-432e-884e-005bd386b69d) `src/utils/changeMetrics.js`
  - [code-writer 4.1](5a6714ad-abda-426c-ac54-1db7ce314806) `src/styles.css` (`.board-toolbar a`, `.analysis-table`, `.analysis-banner-error`, `.analysis-row-details`; KPI лишились 4 колонки)
  - [test-writer 1.2](b27807bc-7dc0-4dcb-b71d-4df7a68135dd) `src/utils/changeMetrics.spec.js` (18 кейсів)
  - [code-writer 2.1](4c51159d-e263-4f27-83f4-db7d3208f6ca) `src/api/github.js` — `listArchivedChanges` / `fetchArchivedArtifact` / `listCommitsByPath`; без `fetch(`
  - [code-writer 2.2](64200697-479f-421e-9276-423df61d978a) `src/api/gitlab.js` — ті самі експорти; `providers.js` не чіпали
  - [code-writer 3.1](a09179fd-bb6a-4f8e-bdc5-724405b1dd42) `src/stores/analysis.js` (`useAnalysisStore`); `board.js` без `useAnalysisStore`/`loadAnalysis`
  - [test-writer 3.3](7dbcf2ec-189d-4973-920c-b2ee970d22d6) `src/stores/board.spec.js` — полер не тягне архів / path-коміти / `metrics.json`
  - [test-writer 3.2](b4ca44c0-7588-4513-9e9d-91b9a227f103) `src/stores/analysis.spec.js`
  - [code-writer 4.2](d93cca75-9535-4970-afaa-fb705e53aeef) `src/views/AnalysisView.vue`
  - [test-writer 5.2](94d5d7b0-918e-4300-841c-4a7d7bc7f85a) `src/App.spec.js` — stub `/analysis`
  - [code-writer 5.1](a27aa5dd-c518-480a-9210-0b1390ae4d9f) `src/router/index.js` — `name: 'analysis'`
  - [test-writer 4.3](62c16383-8a2c-476d-a791-b0d75af5c4f2) `src/views/AnalysisView.spec.js`
  - [code-writer 5.3](b94c2a41-44ed-46d7-ad4d-c5e9c2f2dbb2) `BoardView.vue` RouterLink «Аналіз» ПІСЛЯ кнопок + тести полера
- Верифікація parent: `npm run lint` exit 0; `npm test` 90/90 exit 0; `npm run build` exit 0.
- Браузер (існуючий Vite `:5174`): `/` — «Оновити» primary, «Аналіз» після кнопок, 4 KPI, порожній реєстр; клік «Аналіз» → `/analysis` («Аналіз змін», CSV disabled, «Немає зареєстрованих проєктів.»); «Борд» повертає на `/`; форма «Додати проєкт» жива.
- Заморожені файли без diff: `openspecParsers.js`, `providers.js`, `board.js`, `usePoller`. Ключ `factory-board.projects.v1` не змінювали. `design-implementer` не спавнився (`Design: none`). `code-reviewer` не спавнився (немає PR у цій сесії).
- `board-project-details` не архівували в цій сесії. Staged-залишок `openspec/changes/add-factory-board` не комітили.

## Decisions
- Apply виконано хвилями isolated `code-writer`/`test-writer` за незалежними файлами; parent лише перевіряв звіти й маркував чекбокси.
- RouterLink «Аналіз» стоїть після «Оновити»/«Додати проєкт» — підтверджено в браузері: `button:first-child` лишає «Оновити» primary.
- `reviewLoops` лишили як у спеці (усі згадки `request changes`, включно з рядком вердикту).

## Blocked
none. Archive / PR — наступна сесія. На диску лишаються `add-factory-board` (staged leftover) і `openspec/changes/archive/2026-08-28-board-project-details/` (окремий гейт). Не комітити їх у сесії archive цієї зміни, якщо оператор не попросить.

## Next command
`/opsx:archive add-change-metrics`

## Next role
Archive (`npx agent-orchestrator-kit archive add-change-metrics`)

## Attach
- `openspec/changes/add-change-metrics/tasks.md`
- `openspec/changes/add-change-metrics/apply-notes.md`
- `openspec/changes/add-change-metrics/review.md`
- `src/utils/changeMetrics.js`
- `src/stores/analysis.js`
- `src/views/AnalysisView.vue`
- `src/api/github.js`
- `src/api/gitlab.js`
- `src/router/index.js`
- `src/views/BoardView.vue`

## Subagents to spawn
- archive — CLI `npx agent-orchestrator-kit archive add-change-metrics` (phase subagent forbidden; `spec-archiver` лише якщо CLI впав)
- `session-handoff` — restore лише якщо `handoff --restore` і `handoff.md` недоступні
- `code-reviewer` — опційно перед PR, не в archive-сесії

## Constraints
- language: uk
- do not mix phases
- не починати archive в чаті apply
- не архівувати `board-project-details` замість `add-change-metrics`
- не комітити staged-залишок `openspec/changes/add-factory-board` без явного запиту
- заморожені сигнатури лишаються; не чіпати `providers.js`, `usePoller`, `refreshProject`/`refreshAll`/`loadProjectDetails`, `.board-kpis`, ключ `factory-board.projects.v1`

## Runtime
- runtime: local
- agent_id: none

## Prompt

```text
/opsx:archive add-change-metrics

Ти — conductor наступної рольової сесії для зміни `add-change-metrics`.
Мова відповіді: українська (`project.agent_language: uk`).
НЕ змішуй фази. НЕ починай наступну роль у цьому ж чаті, доки ця фаза не закрита за HARD STOP.

## Хто ти і що робити
- Команда цієї сесії: `/opsx:archive add-change-metrics`
- Наступна роль / субагент фази: `spec-archiver`
- Amp: заспавни isolated skill `subagent-spec-archiver` зі свіжим контекстом. Виконувати тіло спеціаліста в головному треді Amp — порушення протоколу.
- Cursor / Claude: заспавни `.cursor/agents/spec-archiver.md` / `.claude/agents/spec-archiver.md`.
- Батьківська сесія — лише conductor: перевіряє звіт, не виконує роботу спеціаліста.

## Обов'язковий старт (до будь-якої роботи спеціаліста)
1. Виконай pasted-команду `/opsx:archive add-change-metrics` і оголоси роль.
2. `npx agent-orchestrator-kit status`
3. `npx agent-orchestrator-kit handoff add-change-metrics --restore`
4. Прочитай Memory MCP: `Change:add-change-metrics`, `Handoff:add-change-metrics`, `Decision:*`.
5. Якщо Memory порожнє або MCP недоступний — прочитай `openspec/changes/add-change-metrics/handoff.md`. Відсутність Memory НЕ блокує сесію, коли є файл.
6. Заспавни `session-handoff` у режимі restore, якщо брифінг неповний (Amp: isolated `subagent-session-handoff`).
7. Лише після цього заспавни субагента фази. Free-form «продовжуй» / «далі» при одній активній зміні = `Handoff.next_command`.

## Повний контекст попередньої сесії (самодостатній — не покладайся лише на Memory)
- Закрита роль: Implementer (`/opsx:apply add-change-metrics`) — 16/16 tasks `[x]`. Lint, test, build зелені.
- Зміна: - name: add-change-metrics
- status: applying
- tasks: 16/16
- review: APPROVE
- last_role: Implementer
- Зроблено:
- Оголошено роль conductor фази apply. `npx agent-orchestrator-kit status` — `add-change-metrics` 0/16, review APPROVE. `handoff --restore` — брифінг повний; Memory JSON порожній; fallback `session-handoff` restore не знадобився. Memory MCP у сесії недоступний (не блокує).
- Parent не писав прод-код і тести; маркував `tasks.md` лише після перевірки звітів і Done-when.
- Хвилі isolated спеціалістів (без спільних файлів у хвилі):
  - [code-writer 1.1](e98bbf7e-a7d2-432e-884e-005bd386b69d) `src/utils/changeMetrics.js`
  - [code-writer 4.1](5a6714ad-abda-426c-ac54-1db7ce314806) `src/styles.css` (`.board-toolbar a`, `.analysis-table`, `.analysis-banner-error`, `.analysis-row-details`; KPI лишились 4 колонки)
  - [test-writer 1.2](b27807bc-7dc0-4dcb-b71d-4df7a68135dd) `src/utils/changeMetrics.spec.js` (18 кейсів)
  - [code-writer 2.1](4c51159d-e263-4f27-83f4-db7d3208f6ca) `src/api/github.js` — `listArchivedChanges` / `fetchArchivedArtifact` / `listCommitsByPath`; без `fetch(`
  - [code-writer 2.2](64200697-479f-421e-9276-423df61d978a) `src/api/gitlab.js` — ті самі експорти; `providers.js` не чіпали
  - [code-writer 3.1](a09179fd-bb6a-4f8e-bdc5-724405b1dd42) `src/stores/analysis.js` (`useAnalysisStore`); `board.js` без `useAnalysisStore`/`loadAnalysis`
  - [test-writer 3.3](7dbcf2ec-189d-4973-920c-b2ee970d22d6) `src/stores/board.spec.js` — полер не тягне архів / path-коміти / `metrics.json`
  - [test-writer 3.2](b4ca44c0-7588-4513-9e9d-91b9a227f103) `src/stores/analysis.spec.js`
  - [code-writer 4.2](d93cca75-9535-4970-afaa-fb705e53aeef) `src/views/AnalysisView.vue`
  - [test-writer 5.2](94d5d7b0-918e-4300-841c-4a7d7bc7f85a) `src/App.spec.js` — stub `/analysis`
  - [code-writer 5.1](a27aa5dd-c518-480a-9210-0b1390ae4d9f) `src/router/index.js` — `name: 'analysis'`
  - [test-writer 4.3](62c16383-8a2c-476d-a791-b0d75af5c4f2) `src/views/AnalysisView.spec.js`
  - [code-writer 5.3](b94c2a41-44ed-46d7-ad4d-c5e9c2f2dbb2) `BoardView.vue` RouterLink «Аналіз» ПІСЛЯ кнопок + тести полера
- Верифікація parent: `npm run lint` exit 0; `npm test` 90/90 exit 0; `npm run build` exit 0.
- Браузер (існуючий Vite `:5174`): `/` — «Оновити» primary, «Аналіз» після кнопок, 4 KPI, порожній реєстр; клік «Аналіз» → `/analysis` («Аналіз змін», CSV disabled, «Немає зареєстрованих проєктів.»); «Борд» повертає на `/`; форма «Додати проєкт» жива.
- Заморожені файли без diff: `openspecParsers.js`, `providers.js`, `board.js`, `usePoller`. Ключ `factory-board.projects.v1` не змінювали. `design-implementer` не спавнився (`Design: none`). `code-reviewer` не спавнився (немає PR у цій сесії).
- `board-project-details` не архівували в цій сесії. Staged-залишок `openspec/changes/add-factory-board` не комітили.
- Рішення:
- Apply виконано хвилями isolated `code-writer`/`test-writer` за незалежними файлами; parent лише перевіряв звіти й маркував чекбокси.
- RouterLink «Аналіз» стоїть після «Оновити»/«Додати проєкт» — підтверджено в браузері: `button:first-child` лишає «Оновити» primary.
- `reviewLoops` лишили як у спеці (усі згадки `request changes`, включно з рядком вердикту).
- Блокери:
none. Archive / PR — наступна сесія. На диску лишаються `add-factory-board` (staged leftover) і `openspec/changes/archive/2026-08-28-board-project-details/` (окремий гейт). Не комітити їх у сесії archive цієї зміни, якщо оператор не попросить.
- Attach:
- `openspec/changes/add-change-metrics/tasks.md`
- `openspec/changes/add-change-metrics/apply-notes.md`
- `openspec/changes/add-change-metrics/review.md`
- `src/utils/changeMetrics.js`
- `src/stores/analysis.js`
- `src/views/AnalysisView.vue`
- `src/api/github.js`
- `src/api/gitlab.js`
- `src/router/index.js`
- `src/views/BoardView.vue`
- Субагенти цієї сесії:
- archive — CLI `npx agent-orchestrator-kit archive add-change-metrics` (phase subagent forbidden; `spec-archiver` лише якщо CLI впав)
- `session-handoff` — restore лише якщо `handoff --restore` і `handoff.md` недоступні
- `code-reviewer` — опційно перед PR, не в archive-сесії
- Обмеження:
- language: uk
- do not mix phases
- не починати archive в чаті apply
- не архівувати `board-project-details` замість `add-change-metrics`
- не комітити staged-залишок `openspec/changes/add-factory-board` без явного запиту
- заморожені сигнатури лишаються; не чіпати `providers.js`, `usePoller`, `refreshProject`/`refreshAll`/`loadProjectDetails`, `.board-kpis`, ключ `factory-board.projects.v1`
- status: spec-approved
- tasks: 16/16
- review: APPROVE

## HARD STOP на виході (ти НЕ закінчив, поки це не виконано)
1. Заспавни `session-handoff` у режимі persist (Amp: isolated `subagent-session-handoff`). Якщо spawn недоступний — зроби persist сам, ніколи не пропускай.
2. Запиши `openspec/changes/add-change-metrics/handoff.md` з усіма секціями шаблону.
3. `npx agent-orchestrator-kit handoff add-change-metrics` — exit 0 обов'язковий. CLI записує Memory JSON абсолютним шляхом і друкує розширений промпт у stdout.
4. Якщо Memory MCP живий — онови `Change:add-change-metrics`, `Handoff:add-change-metrics`, `Decision:*` відповідно до файлу.
5. Встав stdout CLI у чат одним fenced-блоком. Не скорочуй. Без службового ярлика. Перший рядок — `/opsx:…`.
6. Зупинись. Наступна роль починається в НОВОМУ чаті з цим промптом.

OpenSpec-файли — source of truth для вимог і тасків. Memory і handoff.md — індекс фази. Цей промпт — повний операційний бриф наступного треду, навіть якщо Amp проігнорує Memory MCP.
```
