# Spec Review

**Change:** board-project-details
**Date:** 2026-08-28
**Verdict:** APPROVE

## Source

Tier 1 (`npx agent-orchestrator-kit gate-check --review board-project-details`) — пройдено (exit 0). Додатково в цій сесії: `npx openspec validate board-project-details --strict --type change` — valid; `npx agent-orchestrator-kit gate-check --tasks board-project-details` — усі 16 тасків відповідають контракту Files/Do/Done-when. Tier 2 (spec-reviewer, LLM-рев'ю змісту) виконано повторно після фіксу Architect.

## Checklist summary

- Proposal: ✓ (Why / What Changes / Non-goals / Capabilities / Acceptance criteria / Impact узгоджені; scope creep відсутній)
- Design: ✓ (D1–D7 відповідають зафіксованим рішенням у `decisions.md`; дрейф D2 ↔ таск 3.1 усунуто)
- Delta specs: ✓ (кожна SHALL-вимога і сценарій мають покриття в tasks; конфліктів із `openspec/specs/` немає)
- Tasks: ✓ (16 тасків самодостатні для «сліпого» імплементера; Done-when перевірні — lint/test/build з кодом 0 плюс конкретні експорти/класи)

## Закриття Issue 1 попереднього review (повернення фокуса)

Вимога `specs/project-detail/spec.md` → «Доступність панелі» / сценарій «Фокус після закриття» збережена (SHALL не знято) і тепер повністю покрита ланцюжком тасків:

- **4.1** (`BoardTable.vue`): `tabindex="-1"` на `span.board-table__repo`; у `@click` кнопки «Деталі» і span — `event.currentTarget.focus()` і лише тоді `emit('details', projectId)` (payload — лише id, без DOM-вузла); тест перевіряє `tabindex="-1"`.
- **7.1** (`BoardView.vue`): `detailsTriggerEl = document.activeElement` на `@details`; єдина `closePanel` після `selectedProjectId = null` у `nextTick` викликає `focus()` на збереженому елементі, якщо він `isConnected`; overlay / Escape / «Закрити» йдуть лише через `@close="closePanel"`; зміна проєкту при відкритій панелі MUST NOT викликати `closePanel` (перезапис тригера + заміна id).
- **7.2** (`BoardView.spec.js`): окремий кейс «Деталі» → «Закрити» → `document.activeElement === trigger` з монтуванням `attachTo: document.body` і очищенням `document.body.innerHTML` в `afterEach`.
- Фокус при відкритті лишається покритим 6.1/6.2 (`onMounted` → `focus()` на «Закрити», перевірка `document.activeElement` після mount).

`design.md` § D1 описує той самий механізм — дрейфу design ↔ tasks немає.

## Закриття non-blocking дрейфу D2 ↔ 3.1

`design.md` § D2 крок 2 більше не містить fallback `listChanges`: «порожній або відсутній масив → `changes: {}` без виклику `listChanges` … extra HTTP — лише `fetchBranchHead` і `fetchArtifact` для вже відомих імен». `Do` таска 3.1 дзеркальний: «порожній або відсутній `statuses[id]` → `changes: {}` і все одно викликати `fetchBranchHead(project)`; MUST NOT викликати `listChanges` з `loadProjectDetails`». Тексти узгоджені.

## Перевірені пункти

- Кожна вимога delta-спек має таски: fluid-лейаут (5.1), KPI і фільтри (7.1 + 5.1), групування і колонки таблиці (4.1), відкриття/закриття панелі та доступність (4.1, 6.1, 6.2, 7.1, 7.2), заголовок без extra-запитів (6.1, 7.1), on-demand збагачення з окремими loading/error (3.1, 3.2, 6.1), 404 → порожня секція / `null` (2.1, 2.2, 3.1, 3.2, 6.2), полер без extra-артефактів (3.1, 3.2, 7.2), парсери та відносний час (1.1–1.3).
- Конфліктів із головними специфікаціями немає: MODIFIED «Таблиця активних змін» точно відповідає назві вимоги в `openspec/specs/factory-board/spec.md` і лише розширює її; delta `board-polling` не суперечить guard проти накладання циклів і ручному оновленню; delta `artifact-ingestion` перевикористовує механізм `fetchArtifact` (404 → `null`) і зберігає виключення `archive`.
- Посилання тасків на репозиторій реальні: `isFirstRowOfProject`, `statuses`, `normalizeProviderError`, `getProviderClient`, `createClient` (мок у тестах) існують у `src/`.
- Рішення з `decisions.md` не порушені: drawer + оверлей, деталі в сторі `board`, без роутера і `?project=`, extra HTTP лише при відкритій панелі, полер не тягне деталі, повернення фокуса через таски.
- Non-goals дотримані: немає тасків на split pane, роутер, архів, токен-акаунтинг, нові npm-залежності.

## Notes (non-blocking)

- `design.md` § D6 описує один prop `header` («зміни з `statuses`, `lastUpdated`, poll `error`»), а таск 6.1 розбиває його на `headerChanges` / `lastUpdated` / `pollError`. Семантика ідентична; для імплементера канонічний контракт — таск 6.1. Дрейф косметичний, не блокує.
- Для `designExcerpt` перевикористано `parseReviewExcerpt` як обрізання до 500 символів (таск 3.1) — свідомий reuse, окрема функція не потрібна.
- Робоче дерево вже містить експериментальні правки `src/components/BoardTable.vue` і `src/styles.css` (зокрема зняте `max-width: 72rem`); `design.md` Context це фіксує. Імплементер має реалізувати повний обсяг тасків 4.1/5.1, а не вважати наявний diff готовим.

## Verdict

**APPROVE** — артефакти реалізовні без суттєвих здогадок; `apply-notes.md` записано.
