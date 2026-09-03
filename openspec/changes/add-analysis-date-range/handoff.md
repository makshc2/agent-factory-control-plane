# Session Handoff

## Closed role
Implementer (complete)

## Change
- name: add-analysis-date-range
- status: applying
- tasks: 14/14
- review: APPROVE
- last_role: Implementer

## Done
`/opsx:apply add-analysis-date-range` закрито. Conductor виконав Session Start (`status`, `handoff --restore`); Memory JSON є (Change/Handoff/Decision:*), CLI-брифінг повний — `session-handoff` restore не спавнився. Memory MCP tools у цій сесії недоступні; файл `.cursor/memory.json` прочитано напряму.

Conductor заспавнив `code-writer` ([code-writer](3ef48c28-3530-4e22-ba04-3684146d61eb)); батько код не писав. Після звіту conductor перевірив Done-when. Один кейс 4.1 упав (`capturedBlob.text is not a function` у jsdom). Conductor заспавнив `test-writer` ([test-writer](4ef9f7a4-0bf5-4f81-a45c-a7781e62ae35)) — фікс лише spec. Батько знову перевірив і позначив `tasks.md` 14/14.

Реалізовано:
- `src/utils/analysisPeriod.js` + spec — Київ, 7 днів, inclusive skip, шість експортів
- `src/stores/analysis.js` + spec — період, `hasFreshAnalysis`, skip архівів, keep/`loadedPeriodKey`, коміти з 2 аргументами
- `src/views/AnalysisView.vue` + `src/styles.css` + spec — native `type="date"`, «весь час», два watch (один load на mount), CSV з `rows`, guard from>to
- `src/views/AnalysisDetailsView.vue` + spec — skip через `hasFreshAnalysis`; «Зміну не знайдено.» поза вікном; чинний кейс рядків виставляє `loadedPeriodKey`

Верифікація conductor:
- `npm run lint` — exit 0
- `npm run build` — exit 0
- `./node_modules/.bin/vitest run src/utils/analysisPeriod.spec.js src/stores/analysis.spec.js src/views/AnalysisView.spec.js src/views/AnalysisDetailsView.spec.js --maxWorkers=1` — 47/47
- `git diff` порожній для `github.js`, `gitlab.js`, `board.js`, `usePoller.js`, `changeMetrics.js`, `BoardView.vue`, `http.js`, `package.json`

Design: none — `design-implementer` не спавнився. `code-reviewer` не спавнився (немає PR у цій сесії). Коміт/PR не створювались.

## Decisions
- csv-jsdom-blob: текст CSV у тесті читати з частин конструктора `Blob`, не `blob.text()` — у jsdom немає `Blob.text()`
- apply-complete: 14/14 задач імплементовано й перевірено (lint/build/47 tests); заборонені файли не змінювались

## Blocked
none

## Next command
`/opsx:archive add-analysis-date-range`

## Next role
Archiver

## Attach
- `openspec/changes/add-analysis-date-range/tasks.md`
- `openspec/changes/add-analysis-date-range/apply-notes.md`
- `openspec/changes/add-analysis-date-range/review.md`
- `openspec/changes/add-analysis-date-range/proposal.md`
- `openspec/changes/add-analysis-date-range/design.md`
- `openspec/changes/add-analysis-date-range/specs/change-metrics/spec.md`
- `openspec/changes/add-analysis-date-range/decisions.md`
- `src/utils/analysisPeriod.js`
- `src/stores/analysis.js`
- `src/views/AnalysisView.vue`
- `src/views/AnalysisDetailsView.vue`

## Subagents to spawn
- archive — `npx agent-orchestrator-kit archive add-analysis-date-range` (CLI; phase subagent forbidden; `spec-archiver` = CLI-failure fallback only)
- `code-reviewer` — optional перед PR/MR
- `session-handoff` — restore only if CLI+handoff.md failed (Amp: isolated `subagent-session-handoff`)

## Constraints
- language: uk
- do not mix phases
- do not start archive in the apply chat
- archive only after PR merge + CI green
- require_spec_review: true — Verdict APPROVE already in review.md
- require_design_brief: false (Design: none)
- stack: Vue 3 Composition API, script setup, Pinia, Axios, JavaScript (no TypeScript)
- do not edit github.js / gitlab.js if signature is already (project, path)
- do not touch board.js, usePoller.js, BoardView.vue, changeMetrics.js formulas, http.js, package.json
- commit/PR not created in apply session
- status: applying
- tasks: 14/14
- review: APPROVE

## Runtime
- runtime: local
- agent_id: none

## Metrics
- platform: unknown
- model: unknown
- input_tokens: unknown
- output_tokens: unknown
- cost_usd: unknown
- amp_credits: unknown
- spend_source: unknown

## Prompt

```text
/opsx:archive add-analysis-date-range

Ти — conductor наступної рольової сесії для зміни `add-analysis-date-range`.
Мова відповіді: українська (`project.agent_language: uk`).
НЕ змішуй фази. НЕ починай наступну роль у цьому ж чаті, доки ця фаза не закрита за HARD STOP.

## Хто ти і що робити
- Команда цієї сесії: `/opsx:archive add-analysis-date-range`
- Наступна роль / субагент фази: `spec-archiver`
- Amp: заспавни isolated skill `subagent-spec-archiver` зі свіжим контекстом. Виконувати тіло спеціаліста в головному треді Amp — порушення протоколу.
- Cursor / Claude: заспавни `.cursor/agents/spec-archiver.md` / `.claude/agents/spec-archiver.md`.
- Батьківська сесія — лише conductor: перевіряє звіт, не виконує роботу спеціаліста.

## Обов'язковий старт (до будь-якої роботи спеціаліста)
1. Виконай pasted-команду `/opsx:archive add-analysis-date-range` і оголоси роль.
2. `npx agent-orchestrator-kit status`
3. `npx agent-orchestrator-kit handoff add-analysis-date-range --restore`
4. Прочитай Memory MCP: `Change:add-analysis-date-range`, `Handoff:add-analysis-date-range`, `Decision:*`.
5. Якщо Memory порожнє або MCP недоступний — прочитай `openspec/changes/add-analysis-date-range/handoff.md`. Відсутність Memory НЕ блокує сесію, коли є файл.
6. Заспавни `session-handoff` у режимі restore, якщо брифінг неповний (Amp: isolated `subagent-session-handoff`).
7. Лише після цього заспавни субагента фази. Free-form «продовжуй» / «далі» при одній активній зміні = `Handoff.next_command`.

## Повний контекст попередньої сесії (самодостатній — не покладайся лише на Memory)
- Закрита роль: Implementer (complete)
- Зміна: - name: add-analysis-date-range
- status: applying
- tasks: 14/14
- review: APPROVE
- last_role: Implementer
- Зроблено:
`/opsx:apply add-analysis-date-range` закрито. Conductor виконав Session Start (`status`, `handoff --restore`); Memory JSON є (Change/Handoff/Decision:*), CLI-брифінг повний — `session-handoff` restore не спавнився. Memory MCP tools у цій сесії недоступні; файл `.cursor/memory.json` прочитано напряму.

Conductor заспавнив `code-writer` ([code-writer](3ef48c28-3530-4e22-ba04-3684146d61eb)); батько код не писав. Після звіту conductor перевірив Done-when. Один кейс 4.1 упав (`capturedBlob.text is not a function` у jsdom). Conductor заспавнив `test-writer` ([test-writer](4ef9f7a4-0bf5-4f81-a45c-a7781e62ae35)) — фікс лише spec. Батько знову перевірив і позначив `tasks.md` 14/14.

Реалізовано:
- `src/utils/analysisPeriod.js` + spec — Київ, 7 днів, inclusive skip, шість експортів
- `src/stores/analysis.js` + spec — період, `hasFreshAnalysis`, skip архівів, keep/`loadedPeriodKey`, коміти з 2 аргументами
- `src/views/AnalysisView.vue` + `src/styles.css` + spec — native `type="date"`, «весь час», два watch (один load на mount), CSV з `rows`, guard from>to
- `src/views/AnalysisDetailsView.vue` + spec — skip через `hasFreshAnalysis`; «Зміну не знайдено.» поза вікном; чинний кейс рядків виставляє `loadedPeriodKey`

Верифікація conductor:
- `npm run lint` — exit 0
- `npm run build` — exit 0
- `./node_modules/.bin/vitest run src/utils/analysisPeriod.spec.js src/stores/analysis.spec.js src/views/AnalysisView.spec.js src/views/AnalysisDetailsView.spec.js --maxWorkers=1` — 47/47
- `git diff` порожній для `github.js`, `gitlab.js`, `board.js`, `usePoller.js`, `changeMetrics.js`, `BoardView.vue`, `http.js`, `package.json`

Design: none — `design-implementer` не спавнився. `code-reviewer` не спавнився (немає PR у цій сесії). Коміт/PR не створювались.
- Рішення:
- csv-jsdom-blob: текст CSV у тесті читати з частин конструктора `Blob`, не `blob.text()` — у jsdom немає `Blob.text()`
- apply-complete: 14/14 задач імплементовано й перевірено (lint/build/47 tests); заборонені файли не змінювались
- Блокери:
none
- Attach:
- `openspec/changes/add-analysis-date-range/tasks.md`
- `openspec/changes/add-analysis-date-range/apply-notes.md`
- `openspec/changes/add-analysis-date-range/review.md`
- `openspec/changes/add-analysis-date-range/proposal.md`
- `openspec/changes/add-analysis-date-range/design.md`
- `openspec/changes/add-analysis-date-range/specs/change-metrics/spec.md`
- `openspec/changes/add-analysis-date-range/decisions.md`
- `src/utils/analysisPeriod.js`
- `src/stores/analysis.js`
- `src/views/AnalysisView.vue`
- `src/views/AnalysisDetailsView.vue`
- Субагенти цієї сесії:
- archive — `npx agent-orchestrator-kit archive add-analysis-date-range` (CLI; phase subagent forbidden; `spec-archiver` = CLI-failure fallback only)
- `code-reviewer` — optional перед PR/MR
- `session-handoff` — restore only if CLI+handoff.md failed (Amp: isolated `subagent-session-handoff`)
- Обмеження:
- language: uk
- do not mix phases
- do not start archive in the apply chat
- archive only after PR merge + CI green
- require_spec_review: true — Verdict APPROVE already in review.md
- require_design_brief: false (Design: none)
- stack: Vue 3 Composition API, script setup, Pinia, Axios, JavaScript (no TypeScript)
- do not edit github.js / gitlab.js if signature is already (project, path)
- do not touch board.js, usePoller.js, BoardView.vue, changeMetrics.js formulas, http.js, package.json
- commit/PR not created in apply session
- status: applying
- tasks: 14/14
- review: APPROVE
- status: spec-approved
- tasks: 14/14
- review: APPROVE

## HARD STOP на виході (ти НЕ закінчив, поки це не виконано)
1. Заспавни `session-handoff` у режимі persist (Amp: isolated `subagent-session-handoff`). Якщо spawn недоступний — зроби persist сам, ніколи не пропускай.
2. Запиши `openspec/changes/add-analysis-date-range/handoff.md` з усіма секціями шаблону.
3. `npx agent-orchestrator-kit handoff add-analysis-date-range` — exit 0 обов'язковий. CLI записує Memory JSON абсолютним шляхом і друкує розширений промпт у stdout.
4. Якщо Memory MCP живий — онови `Change:add-analysis-date-range`, `Handoff:add-analysis-date-range`, `Decision:*` відповідно до файлу.
5. Встав stdout CLI у чат одним fenced-блоком. Не скорочуй. Без службового ярлика. Перший рядок — `/opsx:…`.
6. Зупинись. Наступна роль починається в НОВОМУ чаті з цим промптом.

OpenSpec-файли — source of truth для вимог і тасків. Memory і handoff.md — індекс фази. Цей промпт — повний операційний бриф наступного треду, навіть якщо Amp проігнорує Memory MCP.
```
