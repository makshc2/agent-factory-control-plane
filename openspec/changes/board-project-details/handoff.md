# Session Handoff

## Closed role
Archiver (`/opsx:archive`) — **не виконано**. Гейт `pipeline.archive_after_merge: true` не виконано: робота не закомічена, PR немає, merge в `main` немає, CI для цієї зміни не існує. CLI `archive` **не викликався**. `spec-archiver` не спавнився. `code-reviewer` у цій сесії **не** спавнився (це apply-pre-PR, змішування з archive заборонене).

## Change
- name: board-project-details
- status: applying (tasks complete; blocked on commit/PR/merge)
- tasks: 16/16
- review: APPROVE
- last_role: archiver (refused — merge gate)

## Done
Conductor: оголошено роль Archiver. `npx agent-orchestrator-kit status` — tasks 16/16, review APPROVE, kit друкує «ready to archive» (це лише tasks+review). `npx agent-orchestrator-kit handoff board-project-details --restore` exit 0; Memory JSON порожній; брифінг з CLI/`handoff.md` повний — `session-handoff` restore не потрібен. Заспавнено isolated [openspec-guide](044f308b-8a6d-4900-b58a-ef6737d6ca21) на archive-readiness.

Факт git: гілка `main` = `origin/main` @ `9522c22` (`v.1.0`). Немає feature-гілки. Немає PR. Diff `board-project-details` (src + `openspec/changes/board-project-details/`) — unstaged/untracked, не в HEAD. Брудний індекс-залишок від уже заархівованої `add-factory-board` (staged add vs working-tree delete; архів уже в `openspec/changes/archive/2026-08-28-add-factory-board/`). `gh` не встановлений.

Delta-спеки ще не в main: `artifact-ingestion` ADDED, `board-polling` ADDED, `factory-board` ADDED+MODIFIED, `project-detail` ADDED (немає `openspec/specs/project-detail/`). Коли archive дозволений — обов’язково `--sync`.

Попередній apply (16/16, lint/test/build зелені) лишається чинним; `review.md` / `apply-notes.md` не чіпались.

## Decisions
- Archive 2026-08-28 відхилено: `pipeline.archive_after_merge: true`; рядок kit «ready to archive» = лише tasks+review, не merge/CI.
- Коли archive дозволений після merge+зеленого CI: `npx agent-orchestrator-kit archive board-project-details --sync`. Нова capability `project-detail` плюс ADDED/MODIFIED на наявних main specs. Не `--no-sync`.
- У сесії `/opsx:archive` не спавнити `code-reviewer` (apply-pre-PR) і не спавнити `spec-archiver`, поки CLI archive не впав з environmental причини.

## Blocked
- **Merge gate:** немає коміту зміни, немає PR, `main` без цього diff, CI для зміни не існує.
- Memory MCP tools у цій Cursor-сесії недоступні (каталог динамічних інструментів без memory); persist CLI upsert абсолютним шляхом — не блокує restore/persist.
- `gh` відсутній — remote PR/CI не підтверджувались окремо; локальний git однозначний.

## Next command
`/opsx:archive board-project-details`

## Next role
Archiver — **лише після** commit + PR + merge в `main` + зеленого CI. Якщо гілка ще не містить змердженої зміни — знову відмовити й не викликати `archive` CLI. При дозволеному archive: запитати підтвердження `--sync` (рекомендовано) і виконати `npx agent-orchestrator-kit archive board-project-details --sync`. Зараз оператор поза OpenSpec-фазою: закомітити `board-project-details` (не комітити брудний індекс `add-factory-board` як нове дерево), відкрити PR, дочекатися merge. Опційний `code-reviewer` — окремий крок **перед** PR, не в archive-сесії.

## Attach
- `openspec/changes/board-project-details/tasks.md`
- `openspec/changes/board-project-details/apply-notes.md`
- `openspec/changes/board-project-details/specs/project-detail/spec.md`
- `src/views/BoardView.vue`
- `src/components/ProjectDetailPanel.vue`
- `src/stores/board.js`

## Subagents to spawn
- archive — CLI: `npx agent-orchestrator-kit archive board-project-details --sync` (після merge); субагент фази **заборонений**
- `openspec-guide` — якщо merge/CI неочевидні
- `spec-archiver` — лише fallback, якщо archive CLI недоступний або впав environmental
- `session-handoff` — лише якщо restore/persist CLI впав
- `code-reviewer` — **не** спавнити в `/opsx:archive`; опційно перед відкриттям PR в окремому кроці apply

## Constraints
- language: uk
- do not mix phases
- не викликати `archive` CLI, доки PR не змерджено в `main` і CI зелений
- після дозволу: `--sync`, не `--no-sync`
- `review.md` / `apply-notes.md` не редагувати
- не чіпати сигнатури `parseTasksProgress` / `parseHandoff` / `parseReviewVerdict`; `listChanges`/`fetchArtifact`; ключ `factory-board.projects.v1`; callback `usePoller` = `refreshAll`

## Runtime
- runtime: local
- agent_id: none

## Prompt

```text
/opsx:archive board-project-details

Ти — conductor наступної рольової сесії для зміни `board-project-details`.
Мова відповіді: українська (`project.agent_language: uk`).
НЕ змішуй фази. НЕ починай наступну роль у цьому ж чаті, доки ця фаза не закрита за HARD STOP.

## Хто ти і що робити
- Команда цієї сесії: `/opsx:archive board-project-details`
- Наступна роль / субагент фази: `openspec-guide`
- Amp: заспавни isolated skill `subagent-openspec-guide` зі свіжим контекстом. Виконувати тіло спеціаліста в головному треді Amp — порушення протоколу.
- Cursor / Claude: заспавни `.cursor/agents/openspec-guide.md` / `.claude/agents/openspec-guide.md`.
- Батьківська сесія — лише conductor: перевіряє звіт, не виконує роботу спеціаліста.

## Обов'язковий старт (до будь-якої роботи спеціаліста)
1. Виконай pasted-команду `/opsx:archive board-project-details` і оголоси роль.
2. `npx agent-orchestrator-kit status`
3. `npx agent-orchestrator-kit handoff board-project-details --restore`
4. Прочитай Memory MCP: `Change:board-project-details`, `Handoff:board-project-details`, `Decision:*`.
5. Якщо Memory порожнє або MCP недоступний — прочитай `openspec/changes/board-project-details/handoff.md`. Відсутність Memory НЕ блокує сесію, коли є файл.
6. Заспавни `session-handoff` у режимі restore, якщо брифінг неповний (Amp: isolated `subagent-session-handoff`).
7. Лише після цього заспавни субагента фази. Free-form «продовжуй» / «далі» при одній активній зміні = `Handoff.next_command`.

## Повний контекст попередньої сесії (самодостатній — не покладайся лише на Memory)
- Закрита роль: Archiver (`/opsx:archive`) — **не виконано**. Гейт `pipeline.archive_after_merge: true` не виконано: робота не закомічена, PR немає, merge в `main` немає, CI для цієї зміни не існує. CLI `archive` **не викликався**. `spec-archiver` не спавнився. `code-reviewer` у цій сесії **не** спавнився (це apply-pre-PR, змішування з archive заборонене).
- Зміна: - name: board-project-details
- status: applying (tasks complete; blocked on commit/PR/merge)
- tasks: 16/16
- review: APPROVE
- last_role: archiver (refused — merge gate)
- Зроблено:
Conductor: оголошено роль Archiver. `npx agent-orchestrator-kit status` — tasks 16/16, review APPROVE, kit друкує «ready to archive» (це лише tasks+review). `npx agent-orchestrator-kit handoff board-project-details --restore` exit 0; Memory JSON порожній; брифінг з CLI/`handoff.md` повний — `session-handoff` restore не потрібен. Заспавнено isolated [openspec-guide](044f308b-8a6d-4900-b58a-ef6737d6ca21) на archive-readiness.

Факт git: гілка `main` = `origin/main` @ `9522c22` (`v.1.0`). Немає feature-гілки. Немає PR. Diff `board-project-details` (src + `openspec/changes/board-project-details/`) — unstaged/untracked, не в HEAD. Брудний індекс-залишок від уже заархівованої `add-factory-board` (staged add vs working-tree delete; архів уже в `openspec/changes/archive/2026-08-28-add-factory-board/`). `gh` не встановлений.

Delta-спеки ще не в main: `artifact-ingestion` ADDED, `board-polling` ADDED, `factory-board` ADDED+MODIFIED, `project-detail` ADDED (немає `openspec/specs/project-detail/`). Коли archive дозволений — обов’язково `--sync`.

Попередній apply (16/16, lint/test/build зелені) лишається чинним; `review.md` / `apply-notes.md` не чіпались.
- Рішення:
- Archive 2026-08-28 відхилено: `pipeline.archive_after_merge: true`; рядок kit «ready to archive» = лише tasks+review, не merge/CI.
- Коли archive дозволений після merge+зеленого CI: `npx agent-orchestrator-kit archive board-project-details --sync`. Нова capability `project-detail` плюс ADDED/MODIFIED на наявних main specs. Не `--no-sync`.
- У сесії `/opsx:archive` не спавнити `code-reviewer` (apply-pre-PR) і не спавнити `spec-archiver`, поки CLI archive не впав з environmental причини.
- Блокери:
- **Merge gate:** немає коміту зміни, немає PR, `main` без цього diff, CI для зміни не існує.
- Memory MCP tools у цій Cursor-сесії недоступні (каталог динамічних інструментів без memory); persist CLI upsert абсолютним шляхом — не блокує restore/persist.
- `gh` відсутній — remote PR/CI не підтверджувались окремо; локальний git однозначний.
- Attach:
- `openspec/changes/board-project-details/tasks.md`
- `openspec/changes/board-project-details/apply-notes.md`
- `openspec/changes/board-project-details/specs/project-detail/spec.md`
- `src/views/BoardView.vue`
- `src/components/ProjectDetailPanel.vue`
- `src/stores/board.js`
- Субагенти цієї сесії:
- archive — CLI: `npx agent-orchestrator-kit archive board-project-details --sync` (після merge); субагент фази **заборонений**
- `openspec-guide` — якщо merge/CI неочевидні
- `spec-archiver` — лише fallback, якщо archive CLI недоступний або впав environmental
- `session-handoff` — лише якщо restore/persist CLI впав
- `code-reviewer` — **не** спавнити в `/opsx:archive`; опційно перед відкриттям PR в окремому кроці apply
- Обмеження:
- language: uk
- do not mix phases
- не викликати `archive` CLI, доки PR не змерджено в `main` і CI зелений
- після дозволу: `--sync`, не `--no-sync`
- `review.md` / `apply-notes.md` не редагувати
- не чіпати сигнатури `parseTasksProgress` / `parseHandoff` / `parseReviewVerdict`; `listChanges`/`fetchArtifact`; ключ `factory-board.projects.v1`; callback `usePoller` = `refreshAll`
- status: spec-approved
- tasks: 16/16
- review: APPROVE

## HARD STOP на виході (ти НЕ закінчив, поки це не виконано)
1. Заспавни `session-handoff` у режимі persist (Amp: isolated `subagent-session-handoff`). Якщо spawn недоступний — зроби persist сам, ніколи не пропускай.
2. Запиши `openspec/changes/board-project-details/handoff.md` з усіма секціями шаблону.
3. `npx agent-orchestrator-kit handoff board-project-details` — exit 0 обов'язковий. CLI записує Memory JSON абсолютним шляхом і друкує розширений промпт у stdout.
4. Якщо Memory MCP живий — онови `Change:board-project-details`, `Handoff:board-project-details`, `Decision:*` відповідно до файлу.
5. Встав stdout CLI у чат одним fenced-блоком. Не скорочуй. Без службового ярлика. Перший рядок — `/opsx:…`.
6. Зупинись. Наступна роль починається в НОВОМУ чаті з цим промптом.

OpenSpec-файли — source of truth для вимог і тасків. Memory і handoff.md — індекс фази. Цей промпт — повний операційний бриф наступного треду, навіть якщо Amp проігнорує Memory MCP.
```
