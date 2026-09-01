# Decisions — polish-analysis-details-layout

<!-- append-only; пише npx agent-orchestrator-kit handoff <name> з handoff.md ## Decisions -->

- 2026-09-01 preloader-scope: overlay when nothing to show — важкий аналіз і навігація між сторінками, поки дані вантажаться; не на board poll; не flash, якщо рядки цього проєкту вже в store
- 2026-09-01 analysis-layout: cards stacked — сесії, список змін і journal-блоки як картки (блок під блоком), без overflow-x; довгі назви переносяться всередині картки
- 2026-09-01 session-card-fields: role (wrap) + phase; model · platform · env; start → end · duration; tokens · cost · amp · spend source; thread/tasks якщо є
- 2026-09-01 pending-journal-ui: hide-when-empty — не показувати п’ять тире, коли `pending === null`; дані й бейдж списку лишаються
- 2026-09-01 details-drawer: sectioned cards — той самий контент, читабельні секції, не стіна тексту
- 2026-09-01 change-name: polish-analysis-details-layout
- 2026-09-01 design: none — `require_design_brief: false`, немає Figma
- 2026-09-01 overlay-z-index: 30 — нижче `.board-detail-overlay` (40), щоб шухляда борду лишалась поверх
- 2026-09-01 keep-on-total-failure: якщо `keep` і жоден проєкт не успішний — лишити старі рядки, не присвоювати порожній `collected`
- 2026-09-01 analysis-list-fields: не повертати колонки «Агенти»/«Платформи» на список (вже зняті в UI; лишаються в деталях)
- 2026-09-01 spec-scenario-names: імена сценаріїв MODIFIED («модалка», «таблиця», «колонки») лишити як у головній спекі; тіла THEN — картки / full-page
- 2026-09-01 spec-review-verdict: APPROVE — артефакти implementable без матеріальних здогадок; Design: none прийнято
- 2026-09-01 session-env-alias: поле сесії в задачі 4.2 `runtime` ≡ `session.runtime`, підпис «Середовище»
- 2026-09-01 drawer-next-role-badge: `nextRole` у шухляді теж обгорнути в `.badge` / чіп (як вердикт і blocked)
- 2026-09-01 apply-complete: усі 15 задач `[x]`; lint зелений; tests skipped (user policy)
- 2026-09-01 overlay-keep-verified: повторне завантаження того самого проєкту з уже наявними рядками не показує оверлей і не чистить картки
- 2026-09-01 leftover-table-wording: після sync підчищено «таблиця» в головних спеках (Живий огляд, Агенти з handoff, вартість/платформи аналізу)
- 2026-09-01 archive-sync: delta `change-metrics` / `factory-board` / `project-detail` злиті в `openspec/specs/`
- 2026-09-01 tests-skipped: tests skipped (user policy)
