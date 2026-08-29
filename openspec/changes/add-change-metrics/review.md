# Review: add-change-metrics

Tier 1: `gate-check --review add-change-metrics` пройдено (exit 0); `openspec validate add-change-metrics --strict --type change` зелений після propose. Tier 2 нижче — семантика, консистентність, посилання на репозиторій.

## Verdict: APPROVE

## Перевірено

- **proposal ↔ design ↔ tasks**: без суперечностей. Acceptance criteria proposal покриті вимогами delta-спек і тасками 1.1–6.3; кожне рішення D1–D8 має відповідний таск; Non-goals не порушені жодним таском (немає vendor API, бекенда, 5-го KPI, колонки spend на борді, зміни `providers.js`, пагінації, ETag).
- **Посилання на код — усі фактично точні**: `src/api/github.js:22` і `src/api/gitlab.js:24` дійсно фільтрують `item.name !== 'archive'`; branch-check 404-патерн у `listChanges` існує і коректно скопійований у D3; `normalizeProviderError` повертає `{ code, message }` з `code === 'auth'` для 401; `getProviderClient` — мапа named-експортів модулів, тому нові експорти `listArchivedChanges` / `fetchArchivedArtifact` / `listCommitsByPath` доступні без змін `providers.js`.
- **Заморожені сигнатури**: `listChanges`, `fetchArtifact`, `fetchBranchHead` (обидва клієнти), `parseHandoff`, `parseTasksProgress`, `parseReviewVerdict` — жоден таск їх не змінює; таски 1.1, 2.1, 2.2 явно забороняють правки, Done-when перевіряють збереження експортів.
- **Конфлікти з основними спеками**: немає. Дельти board-polling / factory-board / artifact-ingestion — ADDED-вимоги, що не переписують чинні; «Полер не завантажує аналіз…» розширює наявну «Полер не завантажує детальні артефакти» без суперечності; «Живий огляд без spend» узгоджений з чинною KPI-вимогою (4 лічильники) і з `BoardView.vue` (рівно 4 `article`); деталі проєкту лишаються на `/` — узгоджено з «Відкриття деталей проєкту з огляду».
- **Формат дельт**: кожна вимога має ≥1 сценарій WHEN/THEN; сценарії перевірювані й відповідають Done-when тестових тасків.
- **Самодостатність тасків**: сліпий виконавець може виконати кожен таск лише з Files/Do/Done-when — регекси, шляхи API, мапінги, точний рядок CSV-заголовків, тексти UI та очікування тестів наведені дослівно в тасках, без потреби в design.md.
- **Тестові посилання валідні**: `board.spec.js` має `createClient`-фабрику і кейс `does not fetch branch head or extra artifacts during refreshProject` (рядок 223); `BoardView.spec.js` має `mountBoard` і кейс полінгу; `App.spec.js` відповідає опису таска 5.2; ключ `factory-board.projects.v1` — фактичний `STORAGE_KEY` реєстру; скрипти `lint` / `test` / `build` існують у `package.json`.
- **Чесність null vs 0**: вимоги, D1/D7, таски 1.1/1.2/4.2/4.3 послідовні: порожній span → `durationMs === null` → `—`; один коміт → `0` → `0.0 год`; `costUsd === 0` з файлу → `$0.00` показується (тест 1.2 фіксує `source === 'metrics-file'`).

## Зауваження (не блокують)

1. **design.md D1 (косметика)**: «точні англійські заголовки з proposal» — насправді канонічний перелік заголовків CSV зафіксований у delta-спеці `change-metrics` (вимога «Експорт CSV») і дослівно в таску 1.1, а не в proposal.md. На імплементацію не впливає — таск самодостатній.
2. **design.md D1 `spanFromCommits`**: проміжне формулювання про `commitCount` («входять лише якщо є sha або date») заплутане, але одразу зняте «практичним правилом» (`commitCount = commits.length`), яке й перенесене в таск 1.1. Виконавцю слідувати таску.
3. **CSS-ризик у 5.3**: `.board-toolbar button:first-child` дає primary-синій «Оновити». Якщо `RouterLink` «Аналіз» вставити першим елементом тулбару, селектор перестане матчитися і «Оновити» втратить primary-стиль. Розмістити посилання після кнопок (див. apply-notes).
4. **artifact-ingestion (контекст)**: чинна вимога «On-demand артефакти деталей проєкту» містить «MUST NOT читати вміст файлів під `openspec/changes/archive/`» — вона скопована до потоку деталей і лишається в силі: архів читає лише стор аналізу, `loadProjectDetails` не чіпати.
5. **`reviewLoops` семантика**: регекс рахує і сам рядок вердикту `REQUEST CHANGES`, тобто «цикли» = кількість згадок, не кількість ітерацій мінус фінальний APPROVE. Це свідомо зафіксовано сценарієм («дві згадки → 2») — не міняти під час apply.

## Обґрунтування

Артефакти імплементовані без матеріального вгадування: усі регекси, ендпоінти, мапінги відповідей, тексти UI і очікування тестів задані дослівно; посилання на існуючий код перевірені і точні; рішення оператора (null-чесність, без vendor API, ізоляція полера, заморожені сигнатури, без 5-го KPI, git-span ≠ wall-clock, факти замість балу 1–5) послідовно відображені в proposal, design, дельтах і тасках.
