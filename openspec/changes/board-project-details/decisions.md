# Decisions — board-project-details

<!-- append-only; пише npx agent-orchestrator-kit handoff <name> з handoff.md ## Decisions -->

- 2026-08-28 Панель деталей: drawer справа з оверлеєм, не split pane — один патерн на всі екрани, закриття кліком по оверлею.
- 2026-08-28 Стан деталей у сторі `board` (`details` / `detailsLoading` / `detailsError` + `loadProjectDetails`), не окремий стор.
- 2026-08-28 Нового Vue Router маршруту і query `?project=` немає.
- 2026-08-28 Extra HTTP лише коли панель відкрита; полер не тягне proposal/decisions/design/branch head.
- 2026-08-28 Облік токенів Cursor/Amp відкладено; архівні зміни не лістяться.
- 2026-08-28 Tier 1 gate-check упав лише структурно (немає `## Acceptance criteria` у proposal.md); Tier 2 не запускався — змістовних претензій до design/tasks/specs не зафіксовано.
- 2026-08-28 Вердикт REQUEST CHANGES лишається в review.md до повного повторного `/opsx:review board-project-details` (Tier 1 + Tier 2); оновити його може лише роль Spec Reviewer.
- 2026-08-28 Acceptance criteria додає Architect у `/opsx:propose board-project-details` за зразком архівної `2026-08-28-add-factory-board/proposal.md` (поведінкові критерії + зелені `npm run lint` / `npm test` / `npm run build`).
- 2026-08-28 Acceptance criteria додано після Capabilities / перед Impact за зразком архівної `2026-08-28-add-factory-board/proposal.md`; інші секції proposal.md не змінювались.
- 2026-08-28 Smoke-test `gate-check --review` після фіксу зелений; повний `/opsx:review board-project-details` (Tier 1 + Tier 2) лишається обов’язковим — Architect не оновлював `review.md`.
- 2026-08-28 Tier 2 review виконано: попередній REQUEST CHANGES через відсутність `## Acceptance criteria` знято як застарілий; новий вердикт REQUEST CHANGES має єдину змістовну причину — незакрита SHALL-вимога доступності в `tasks.md`.
- 2026-08-28 Блокуючий issue: вимога `specs/project-detail/spec.md` → «Доступність панелі» / сценарій «Фокус після закриття» не покрита жодним таском (6.1 — лише `onMounted` focus на «Закрити»; 7.1 — закриття без відновлення тригера; 4.1 — емітер `details` без посилання на тригер; 6.2/7.2 — тестів на повернення фокуса немає).
- 2026-08-28 Фікс належить Architect у `/opsx:propose board-project-details`: у `Do` таска 7.1 — збереження елемента-тригера + `focus()` після `selectedProjectId = null`; у `Do` таска 7.2 (або 6.2) — кейс «після «Деталі» → «Закрити» `document.activeElement` — кнопка «Деталі»». Альтернатива, якщо повернення фокуса свідомо відкидається: прибрати сценарій із `specs/project-detail/spec.md` і `design.md` § D1.
- 2026-08-28 Non-blocking дрейф (Notes у `review.md`, не гейт): `design.md` § D2 крок 2 описує fallback `listChanges`, а `Do` таска 3.1 ітерує лише `statuses[id]` — узгодити один із двох текстів.
- 2026-08-28 Повернення фокуса: SHALL і сценарій «Фокус після закриття» лишаються; покриття через таски, не через зняття вимоги.
- 2026-08-28 Таск 4.1: `tabindex="-1"` на span repo; `@click` «Деталі» і span — `event.currentTarget.focus()` перед `emit('details', projectId)` (payload лише id).
- 2026-08-28 Таск 7.1: `detailsTriggerEl = document.activeElement` на `@details`; єдина `closePanel` після `selectedProjectId = null` у `nextTick` викликає `focus()` якщо елемент `isConnected`; overlay / Escape / «Закрити» лише через `@close="closePanel"`; зміна проєкту при відкритій панелі не викликає `closePanel`.
- 2026-08-28 Таск 7.2: окремий кейс «Деталі» → «Закрити» → `document.activeElement ===` кнопка «Деталі»; `attachTo: document.body`.
- 2026-08-28 D2 / таск 3.1: без fallback `listChanges` у `loadProjectDetails`; порожній `statuses[id]` → `changes: {}` + лише `fetchBranchHead`.
- 2026-08-28 Review 2026-08-28: вердикт APPROVE — усі SHALL-вимоги і сценарії чотирьох delta-спек покриті тасками; конфліктів із `openspec/specs/` немає; apply розблоковано.
- 2026-08-28 Канон props панелі для імплементера — таск 6.1 (`headerChanges` / `lastUpdated` / `pollError`), а не єдиний prop `header` з `design.md` § D6 (косметичний дрейф, non-blocking).
- 2026-08-28 `designExcerpt` — через reuse `parseReviewExcerpt` (обрізання до 500 символів), окрему функцію не додавати.
- 2026-08-28 Наявний частковий diff у `src/components/BoardTable.vue` / `src/styles.css` (зняте `max-width: 72rem`) не вважати готовим — імплементер виконує повний обсяг тасків 4.1/5.1.
- 2026-08-28 Тести панелі/BoardView монтувати з `attachTo: document.body` + очищення `document.body.innerHTML` в `afterEach`, інакше кейс фокуса флейкі.
- 2026-08-28 Chip активного фільтра: клас `.board-filter-chip.is-active` (не BEM `--active`) — так уже стилізує `src/styles.css` після таска 5.1.
- 2026-08-28 Шапка панелі: `.board-detail-header p`/`li` — `display: flex; gap: 0.5rem`, інакше Vue зхлопує пробіли між `<span>` і `repo`+`branch` злипаються візуально.
- 2026-08-28 VTU + `<Teleport to="body">`: «Закрити» шукати через `document.body`, якщо немає в `wrapper.findAll`; Teleport не stub-ити.
- 2026-08-28 Archive 2026-08-28 відхилено: `pipeline.archive_after_merge: true`; рядок kit «ready to archive» = лише tasks+review, не merge/CI.
- 2026-08-28 Коли archive дозволений після merge+зеленого CI: `npx agent-orchestrator-kit archive board-project-details --sync`. Нова capability `project-detail` плюс ADDED/MODIFIED на наявних main specs. Не `--no-sync`.
- 2026-08-28 У сесії `/opsx:archive` не спавнити `code-reviewer` (apply-pre-PR) і не спавнити `spec-archiver`, поки CLI archive не впав з environmental причини.
- 2026-08-28 Archive 2026-08-28 (друга спроба) відхилено: зміна вже на `origin/main` як `7746c26`, але CI `agent-verify` для цього SHA не підтверджено; kit «ready to archive» і далі ігнорує merge/CI.
- 2026-08-28 Прямий push у `main` замінює вимогу окремого PR/merge-коміта; залишковий гейт — зелений `agent-verify` на `7746c26`. `spec-verify` на цей лендінг не очікувати (workflow лише `pull_request`).
- 2026-08-28 Не комітити staged-залишок `openspec/changes/add-factory-board` (AD vs WT delete) — це воскресить уже заархівовану зміну.
- 2026-08-28 Локальний GitHub PAT не читає цей приватний репо (API 404) — не вважати це доказом, що CI червоний або зелений.
