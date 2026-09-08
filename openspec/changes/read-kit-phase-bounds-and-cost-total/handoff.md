# Session Handoff

## Closed role
Implementer (apply) — parent-driven; ізольовані `code-writer` ×3 і `test-writer`

## Change
- name: read-kit-phase-bounds-and-cost-total
- status: applied — 14/14, review APPROVE, ready to archive
- tasks: 14/14
- review: APPROVE (раунд 3)
- last_role: Implementer (apply)

## Done
Conductor: `/opsx:apply read-kit-phase-bounds-and-cost-total`. Старт: `npx agent-orchestrator-kit status` (0/14, review APPROVE, memory MCP ok), `handoff --restore` (✓ handoff.md + decisions.md; Memory JSON CLI сказав empty, вузли `Change:`/`Handoff:`/`Decision:*` прочитані з `.cursor/memory.json`). Memory MCP tools у цій Cursor-сесії відсутні — fallback `session-handoff` restore не потрібен (файл повний). Створено `apply-notes.md` (перший крок apply).

**Реалізація production:** `git diff --stat HEAD -- src/` на вході порожній. Три ізольовані `code-writer` (без Vitest у паралелі): `changeMetrics.js` 1.1–1.5 PASS (`costUsdTotal` ×13, spans/kit-span/resolveDisplayedCost/CSV); `AnalysisView.vue` 2.1–2.2 PASS (літерал kit-span, en-dash U+2013, `разом (costUsdTotal)`); `AnalysisDetailsModal.vue` 3.1–3.3 PASS (три рядки вартості, інтервали, Початок/Кінець/Lead time). Файли production не змінювались.

**Verify-only:** `src/stores/analysis.spec.js:466` досі вимагає `listCommitsByPath` рівно 2 аргументи без since/until; `src/api/github.js` і `src/api/gitlab.js` — підпис `(project, path)`. «Картковий макет» — сітка на місці, коду не треба.

**Тести:** `test-writer` дописав відсутні кейси в `src/utils/changeMetrics.spec.js` (порожній журнал, `spanFromJournal`, fallback без журналу, рядок `costUsdTotal` → null, journal-walk `source: 'total'`) і `src/components/AnalysisDetailsModal.spec.js` (окремий git-span). `AnalysisView.spec.js` без змін. Conductor: RAM 20306 MiB, loadavg 1m 1.16 / nproc 12 → `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js src/views/AnalysisView.spec.js src/components/AnalysisDetailsModal.spec.js --maxWorkers=1` → **101 passed / 3 files**, exit 0. En-dash у `AnalysisView.vue:175` = `0x2013`.

**5.1:** eslint шести Files — exit 0; `vite build` — exit 0, `dist/index.html` є; `grep -rq "USD_PER_MILLION\|estimateCostFromTokens" src/` — порожньо. `npx agent-orchestrator-kit status` → 14/14, ready to archive.

Чекбокси `tasks.md` поставив лише conductor після Done-when. `code-reviewer` не спавнився: PR у цій сесії немає.

## Decisions
- 2026-09-08 Apply = верифікація HEAD + вузькі тести: production `src/` не змінювався; єдиний код-диф — дописані кейси в `changeMetrics.spec.js` і `AnalysisDetailsModal.spec.js`.
- 2026-09-08 N1/N3/N4 раунду 3 прийняті як редакційні (не правились delta/proposal у apply). N5/N6 лишаються поза скоупом.
- 2026-09-08 Verify-only вимоги («Заборона since/until», «Картковий макет») підтверджені без нового коду.

## Blocked
- none

## Next command
`/opsx:archive read-kit-phase-bounds-and-cost-total`

## Next role
Archiver (CLI `npx agent-orchestrator-kit archive`; субагент `spec-archiver` лише якщо CLI недоступний)

## Attach
- `openspec/changes/read-kit-phase-bounds-and-cost-total/apply-notes.md`
- `openspec/changes/read-kit-phase-bounds-and-cost-total/tasks.md`
- `openspec/changes/read-kit-phase-bounds-and-cost-total/review.md`
- `src/utils/changeMetrics.spec.js`
- `src/components/AnalysisDetailsModal.spec.js`

## Subagents to spawn
- Archive — CLI, без обов’язкового субагента. `spec-archiver` лише як fallback, якщо `npx agent-orchestrator-kit archive` недоступний або впав з екологічної причини.

## Constraints
- Не стартувати archive в чаті apply (вже закрито). Новий чат: `npx agent-orchestrator-kit archive read-kit-phase-bounds-and-cost-total [--sync | --no-sync --force]`. `--sync` рекомендований (є delta `specs/change-metrics/spec.md`).
- Перед archive запитати оператора: мерджити delta в головну спеку (`--sync`) чи архівувати без мерджу.
- Незакомічені apply-артефакти: `apply-notes.md`, `tasks.md` 14/14, `handoff.md`, плюс тестовий диф двох spec-файлів. Production `src/` (js/vue) чистий відносно HEAD.
- Головна спека не редагується руками — лише через archive `--sync`.
- Один активний change. CLI лише через `npx`.
- N1 (`комітів: <commitCount>` vs `commitCount` у delta `:99`/`:110`) і N3 (`platformHasSignal` + `costUsdTotal` не в What Changes) лишаються прийнятими; не блокують archive.
- `archive_after_merge: true` у orchestrator.yaml — оператор може спочатку закомітити/змерджити PR, потім archive.

## Runtime
- runtime: local
- agent_id: none

## Metrics
- platform: cursor
- model: cursor-grok-4.6-xhigh-fast
- input_tokens: unknown
- output_tokens: unknown
- cost_usd: unknown
- amp_credits: unknown
- spend_source: cursor-env

## Prompt

```text
/opsx:archive read-kit-phase-bounds-and-cost-total

Ти — conductor наступної рольової сесії для зміни `read-kit-phase-bounds-and-cost-total`.
Мова відповіді: українська (`project.agent_language: uk`).
НЕ змішуй фази. НЕ починай наступну роль у цьому ж чаті, доки ця фаза не закрита за HARD STOP.

## Хто ти і що робити
- Команда цієї сесії: `/opsx:archive read-kit-phase-bounds-and-cost-total`
- Наступна роль / субагент фази: `spec-archiver`
- Amp: заспавни isolated skill `subagent-spec-archiver` зі свіжим контекстом. Виконувати тіло спеціаліста в головному треді Amp — порушення протоколу.
- Cursor / Claude: заспавни `.cursor/agents/spec-archiver.md` / `.claude/agents/spec-archiver.md`.
- Батьківська сесія — лише conductor: перевіряє звіт, не виконує роботу спеціаліста.

## Обов'язковий старт (до будь-якої роботи спеціаліста)
1. Виконай pasted-команду `/opsx:archive read-kit-phase-bounds-and-cost-total` і оголоси роль.
2. `npx agent-orchestrator-kit status`
3. `npx agent-orchestrator-kit handoff read-kit-phase-bounds-and-cost-total --restore`
4. Прочитай Memory MCP: `Change:read-kit-phase-bounds-and-cost-total`, `Handoff:read-kit-phase-bounds-and-cost-total`, `Decision:*`.
5. Якщо Memory порожнє або MCP недоступний — прочитай `openspec/changes/read-kit-phase-bounds-and-cost-total/handoff.md`. Відсутність Memory НЕ блокує сесію, коли є файл.
6. Заспавни `session-handoff` у режимі restore, якщо брифінг неповний (Amp: isolated `subagent-session-handoff`).
7. Лише після цього заспавни субагента фази. Free-form «продовжуй» / «далі» при одній активній зміні = `Handoff.next_command`.

## Повний контекст попередньої сесії (самодостатній — не покладайся лише на Memory)
- Закрита роль: Implementer (apply) — parent-driven; ізольовані `code-writer` ×3 і `test-writer`
- Зміна: - name: read-kit-phase-bounds-and-cost-total
- status: applied — 14/14, review APPROVE, ready to archive
- tasks: 14/14
- review: APPROVE (раунд 3)
- last_role: Implementer (apply)
- Зроблено:
Conductor: `/opsx:apply read-kit-phase-bounds-and-cost-total`. Старт: `npx agent-orchestrator-kit status` (0/14, review APPROVE, memory MCP ok), `handoff --restore` (✓ handoff.md + decisions.md; Memory JSON CLI сказав empty, вузли `Change:`/`Handoff:`/`Decision:*` прочитані з `.cursor/memory.json`). Memory MCP tools у цій Cursor-сесії відсутні — fallback `session-handoff` restore не потрібен (файл повний). Створено `apply-notes.md` (перший крок apply).

**Реалізація production:** `git diff --stat HEAD -- src/` на вході порожній. Три ізольовані `code-writer` (без Vitest у паралелі): `changeMetrics.js` 1.1–1.5 PASS (`costUsdTotal` ×13, spans/kit-span/resolveDisplayedCost/CSV); `AnalysisView.vue` 2.1–2.2 PASS (літерал kit-span, en-dash U+2013, `разом (costUsdTotal)`); `AnalysisDetailsModal.vue` 3.1–3.3 PASS (три рядки вартості, інтервали, Початок/Кінець/Lead time). Файли production не змінювались.

**Verify-only:** `src/stores/analysis.spec.js:466` досі вимагає `listCommitsByPath` рівно 2 аргументи без since/until; `src/api/github.js` і `src/api/gitlab.js` — підпис `(project, path)`. «Картковий макет» — сітка на місці, коду не треба.

**Тести:** `test-writer` дописав відсутні кейси в `src/utils/changeMetrics.spec.js` (порожній журнал, `spanFromJournal`, fallback без журналу, рядок `costUsdTotal` → null, journal-walk `source: 'total'`) і `src/components/AnalysisDetailsModal.spec.js` (окремий git-span). `AnalysisView.spec.js` без змін. Conductor: RAM 20306 MiB, loadavg 1m 1.16 / nproc 12 → `./node_modules/.bin/vitest run src/utils/changeMetrics.spec.js src/views/AnalysisView.spec.js src/components/AnalysisDetailsModal.spec.js --maxWorkers=1` → **101 passed / 3 files**, exit 0. En-dash у `AnalysisView.vue:175` = `0x2013`.

**5.1:** eslint шести Files — exit 0; `vite build` — exit 0, `dist/index.html` є; `grep -rq "USD_PER_MILLION\|estimateCostFromTokens" src/` — порожньо. `npx agent-orchestrator-kit status` → 14/14, ready to archive.

Чекбокси `tasks.md` поставив лише conductor після Done-when. `code-reviewer` не спавнився: PR у цій сесії немає.
- Рішення:
- 2026-09-08 Apply = верифікація HEAD + вузькі тести: production `src/` не змінювався; єдиний код-диф — дописані кейси в `changeMetrics.spec.js` і `AnalysisDetailsModal.spec.js`.
- 2026-09-08 N1/N3/N4 раунду 3 прийняті як редакційні (не правились delta/proposal у apply). N5/N6 лишаються поза скоупом.
- 2026-09-08 Verify-only вимоги («Заборона since/until», «Картковий макет») підтверджені без нового коду.
- Блокери:
- none
- Attach:
- `openspec/changes/read-kit-phase-bounds-and-cost-total/apply-notes.md`
- `openspec/changes/read-kit-phase-bounds-and-cost-total/tasks.md`
- `openspec/changes/read-kit-phase-bounds-and-cost-total/review.md`
- `src/utils/changeMetrics.spec.js`
- `src/components/AnalysisDetailsModal.spec.js`
- Субагенти цієї сесії:
- Archive — CLI, без обов’язкового субагента. `spec-archiver` лише як fallback, якщо `npx agent-orchestrator-kit archive` недоступний або впав з екологічної причини.
- Обмеження:
- Не стартувати archive в чаті apply (вже закрито). Новий чат: `npx agent-orchestrator-kit archive read-kit-phase-bounds-and-cost-total [--sync | --no-sync --force]`. `--sync` рекомендований (є delta `specs/change-metrics/spec.md`).
- Перед archive запитати оператора: мерджити delta в головну спеку (`--sync`) чи архівувати без мерджу.
- Незакомічені apply-артефакти: `apply-notes.md`, `tasks.md` 14/14, `handoff.md`, плюс тестовий диф двох spec-файлів. Production `src/` (js/vue) чистий відносно HEAD.
- Головна спека не редагується руками — лише через archive `--sync`.
- Один активний change. CLI лише через `npx`.
- N1 (`комітів: <commitCount>` vs `commitCount` у delta `:99`/`:110`) і N3 (`platformHasSignal` + `costUsdTotal` не в What Changes) лишаються прийнятими; не блокують archive.
- `archive_after_merge: true` у orchestrator.yaml — оператор може спочатку закомітити/змерджити PR, потім archive.
- status: spec-approved
- tasks: 14/14
- review: APPROVE

## HARD STOP на виході (ти НЕ закінчив, поки це не виконано)
1. Заспавни `session-handoff` у режимі persist (Amp: isolated `subagent-session-handoff`). Якщо spawn недоступний — зроби persist сам, ніколи не пропускай.
2. Запиши `openspec/changes/read-kit-phase-bounds-and-cost-total/handoff.md` з усіма секціями шаблону.
3. `npx agent-orchestrator-kit handoff read-kit-phase-bounds-and-cost-total` — exit 0 обов'язковий. CLI записує Memory JSON абсолютним шляхом і друкує розширений промпт у stdout.
4. Якщо Memory MCP живий — онови `Change:read-kit-phase-bounds-and-cost-total`, `Handoff:read-kit-phase-bounds-and-cost-total`, `Decision:*` відповідно до файлу.
5. Встав stdout CLI у чат одним fenced-блоком. Не скорочуй. Без службового ярлика. Перший рядок — `/opsx:…`.
6. Зупинись. Наступна роль починається в НОВОМУ чаті з цим промптом.

OpenSpec-файли — source of truth для вимог і тасків. Memory і handoff.md — індекс фази. Цей промпт — повний операційний бриф наступного треду, навіть якщо Amp проігнорує Memory MCP.
```
