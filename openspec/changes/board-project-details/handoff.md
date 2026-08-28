# Session Handoff

## Closed role
Archiver (`/opsx:archive`) — **не виконано**. Landing на `origin/main` є (`7746c26`), але гейт `pipeline.archive_after_merge: true` вимагає ще зеленого CI; статус `agent-verify` для цього SHA **не підтверджено**. CLI `archive` **не викликався**. `spec-archiver` не спавнився. `code-reviewer` у цій сесії **не** спавнився.

## Change
- name: board-project-details
- status: applying (tasks complete; landed on main; blocked on CI)
- tasks: 16/16
- review: APPROVE
- last_role: archiver (refused — CI unverified)

## Done
Conductor: оголошено роль Archiver. `npx agent-orchestrator-kit status` — tasks 16/16, review APPROVE, kit знову друкує «ready to archive» (це лише tasks+review). `npx agent-orchestrator-kit handoff board-project-details --restore` exit 0; Memory JSON порожній/відсутній; брифінг з CLI/`handoff.md` повний — `session-handoff` restore не потрібен. Memory MCP tools у каталозі цієї Cursor-сесії немає.

Заспавнено isolated [openspec-guide](f9dc3588-d75f-41e4-af06-bb8df85deed3) на archive-readiness. Conductor звірив git і спробував GitHub Actions API.

Оновлений факт git (попередній handoff зі `9522c22` + uncommitted **застарів**):
- `main` = `origin/main` = `7746c26` (`v.1.0`, parent `9522c22`, прямий коміт, **не** merge-коміт). Feature-гілки немає.
- `src/` + `openspec/changes/board-project-details/` **у HEAD** (27 файлів у `7746c26`).
- PR немає (прямий push у `main`). `spec-verify.yml` (лише `pull_request` + `src/**`) для цього лендінгу не запускався.
- `agent-verify.yml` мав би стартувати на push `main` — результат **невідомий**.
- Брудний індекс-залишок `add-factory-board`: 12 файлів staged A vs WT delete; архів уже в `openspec/changes/archive/2026-08-28-add-factory-board/`. Не комітити цей індекс; оператор: `git restore --staged openspec/changes/add-factory-board`.
- `gh` не встановлений. `GITHUB_TOKEN`/`GH_TOKEN` у середовищі порожні.
- Локальний GitHub PAT автентифікує `makshc2`, але `GET /repos/makshc2/agent-factory-control-plane` і Actions API → **404** (немає доступу до цього приватного репо). CI не вигадувати.

Delta-спеки ще не в main specs: `artifact-ingestion` ADDED, `board-polling` ADDED, `factory-board` ADDED+MODIFIED, `project-detail` ADDED (немає `openspec/specs/project-detail/`). Коли archive дозволений — обов’язково `--sync`.

Попередній apply (16/16, lint/test/build зелені) лишається чинним; `review.md` / `apply-notes.md` не чіпались.

## Decisions
- Archive 2026-08-28 (друга спроба) відхилено: зміна вже на `origin/main` як `7746c26`, але CI `agent-verify` для цього SHA не підтверджено; kit «ready to archive» і далі ігнорує merge/CI.
- Прямий push у `main` замінює вимогу окремого PR/merge-коміта; залишковий гейт — зелений `agent-verify` на `7746c26`. `spec-verify` на цей лендінг не очікувати (workflow лише `pull_request`).
- Не комітити staged-залишок `openspec/changes/add-factory-board` (AD vs WT delete) — це воскресить уже заархівовану зміну.
- Локальний GitHub PAT не читає цей приватний репо (API 404) — не вважати це доказом, що CI червоний або зелений.

## Blocked
- **CI gate:** статус workflow `agent-verify` для `7746c26` недоступний (`gh` немає, GitHub API репо 404, локальних `artifacts/` немає). Archive CLI заборонений, доки оператор не підтвердить зелений CI.
- Memory MCP tools у цій Cursor-сесії недоступні; persist CLI upsert абсолютним шляхом — не блокує restore/persist.
- Брудний індекс `add-factory-board` лишається в working tree (не частина цієї зміни).

## Next command
`/opsx:archive board-project-details`

## Next role
Archiver — **лише після** підтвердженого зеленого `agent-verify` на `7746c26`. Якщо CI все ще невідомий або червоний — знову відмовити й не викликати `archive` CLI. При дозволеному archive: `npx agent-orchestrator-kit archive board-project-details --sync` (рішення `--sync` уже прийняте; не `--no-sync`). Зараз оператор поза OpenSpec-фазою: відкрити Actions для `7746c26` у GitHub UI; `git restore --staged` на `openspec/changes/add-factory-board`. `code-reviewer` у archive-сесії не спавнити.

## Attach
- `openspec/changes/board-project-details/tasks.md`
- `openspec/changes/board-project-details/apply-notes.md`
- `openspec/changes/board-project-details/specs/project-detail/spec.md`
- `src/views/BoardView.vue`
- `src/components/ProjectDetailPanel.vue`
- `src/stores/board.js`
- `.github/workflows/agent-verify.yml`

## Subagents to spawn
- archive — CLI: `npx agent-orchestrator-kit archive board-project-details --sync` (після зеленого CI); субагент фази **заборонений**
- `openspec-guide` — якщо CI/landing неочевидні
- `spec-archiver` — лише fallback, якщо archive CLI недоступний або впав environmental
- `session-handoff` — лише якщо restore/persist CLI впав
- `code-reviewer` — **не** спавнити в `/opsx:archive`

## Constraints
- language: uk
- do not mix phases
- не викликати `archive` CLI, доки `agent-verify` для `7746c26` не зелений
- після дозволу: `--sync`, не `--no-sync`
- `review.md` / `apply-notes.md` не редагувати
- не чіпати сигнатури `parseTasksProgress` / `parseHandoff` / `parseReviewVerdict`; `listChanges`/`fetchArtifact`; ключ `factory-board.projects.v1`; callback `usePoller` = `refreshAll`
- не комітити індекс-залишок `add-factory-board`

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
- Закрита роль: Archiver (`/opsx:archive`) — **не виконано**. Landing на `origin/main` є (`7746c26`), але гейт `pipeline.archive_after_merge: true` вимагає ще зеленого CI; статус `agent-verify` для цього SHA **не підтверджено**. CLI `archive` **не викликався**. `spec-archiver` не спавнився. `code-reviewer` у цій сесії **не** спавнився.
- Зміна: - name: board-project-details
- status: applying (tasks complete; landed on main; blocked on CI)
- tasks: 16/16
- review: APPROVE
- last_role: archiver (refused — CI unverified)
- Зроблено:
Conductor: оголошено роль Archiver. `npx agent-orchestrator-kit status` — tasks 16/16, review APPROVE, kit знову друкує «ready to archive» (це лише tasks+review). `npx agent-orchestrator-kit handoff board-project-details --restore` exit 0; Memory JSON порожній/відсутній; брифінг з CLI/`handoff.md` повний — `session-handoff` restore не потрібен. Memory MCP tools у каталозі цієї Cursor-сесії немає.

Заспавнено isolated [openspec-guide](f9dc3588-d75f-41e4-af06-bb8df85deed3) на archive-readiness. Conductor звірив git і спробував GitHub Actions API.

Оновлений факт git (попередній handoff зі `9522c22` + uncommitted **застарів**):
- `main` = `origin/main` = `7746c26` (`v.1.0`, parent `9522c22`, прямий коміт, **не** merge-коміт). Feature-гілки немає.
- `src/` + `openspec/changes/board-project-details/` **у HEAD** (27 файлів у `7746c26`).
- PR немає (прямий push у `main`). `spec-verify.yml` (лише `pull_request` + `src/**`) для цього лендінгу не запускався.
- `agent-verify.yml` мав би стартувати на push `main` — результат **невідомий**.
- Брудний індекс-залишок `add-factory-board`: 12 файлів staged A vs WT delete; архів уже в `openspec/changes/archive/2026-08-28-add-factory-board/`. Не комітити цей індекс; оператор: `git restore --staged openspec/changes/add-factory-board`.
- `gh` не встановлений. `GITHUB_TOKEN`/`GH_TOKEN` у середовищі порожні.
- Локальний GitHub PAT автентифікує `makshc2`, але `GET /repos/makshc2/agent-factory-control-plane` і Actions API → **404** (немає доступу до цього приватного репо). CI не вигадувати.

Delta-спеки ще не в main specs: `artifact-ingestion` ADDED, `board-polling` ADDED, `factory-board` ADDED+MODIFIED, `project-detail` ADDED (немає `openspec/specs/project-detail/`). Коли archive дозволений — обов’язково `--sync`.

Попередній apply (16/16, lint/test/build зелені) лишається чинним; `review.md` / `apply-notes.md` не чіпались.
- Рішення:
- Archive 2026-08-28 (друга спроба) відхилено: зміна вже на `origin/main` як `7746c26`, але CI `agent-verify` для цього SHA не підтверджено; kit «ready to archive» і далі ігнорує merge/CI.
- Прямий push у `main` замінює вимогу окремого PR/merge-коміта; залишковий гейт — зелений `agent-verify` на `7746c26`. `spec-verify` на цей лендінг не очікувати (workflow лише `pull_request`).
- Не комітити staged-залишок `openspec/changes/add-factory-board` (AD vs WT delete) — це воскресить уже заархівовану зміну.
- Локальний GitHub PAT не читає цей приватний репо (API 404) — не вважати це доказом, що CI червоний або зелений.
- Блокери:
- **CI gate:** статус workflow `agent-verify` для `7746c26` недоступний (`gh` немає, GitHub API репо 404, локальних `artifacts/` немає). Archive CLI заборонений, доки оператор не підтвердить зелений CI.
- Memory MCP tools у цій Cursor-сесії недоступні; persist CLI upsert абсолютним шляхом — не блокує restore/persist.
- Брудний індекс `add-factory-board` лишається в working tree (не частина цієї зміни).
- Attach:
- `openspec/changes/board-project-details/tasks.md`
- `openspec/changes/board-project-details/apply-notes.md`
- `openspec/changes/board-project-details/specs/project-detail/spec.md`
- `src/views/BoardView.vue`
- `src/components/ProjectDetailPanel.vue`
- `src/stores/board.js`
- `.github/workflows/agent-verify.yml`
- Субагенти цієї сесії:
- archive — CLI: `npx agent-orchestrator-kit archive board-project-details --sync` (після зеленого CI); субагент фази **заборонений**
- `openspec-guide` — якщо CI/landing неочевидні
- `spec-archiver` — лише fallback, якщо archive CLI недоступний або впав environmental
- `session-handoff` — лише якщо restore/persist CLI впав
- `code-reviewer` — **не** спавнити в `/opsx:archive`
- Обмеження:
- language: uk
- do not mix phases
- не викликати `archive` CLI, доки `agent-verify` для `7746c26` не зелений
- після дозволу: `--sync`, не `--no-sync`
- `review.md` / `apply-notes.md` не редагувати
- не чіпати сигнатури `parseTasksProgress` / `parseHandoff` / `parseReviewVerdict`; `listChanges`/`fetchArtifact`; ключ `factory-board.projects.v1`; callback `usePoller` = `refreshAll`
- не комітити індекс-залишок `add-factory-board`
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
