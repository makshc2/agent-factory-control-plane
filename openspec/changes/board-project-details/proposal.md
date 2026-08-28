# Proposal: board-project-details

## Why

Оператор бачить лише тонку таблицю активних змін: розпарсений `nextRole` прихований, додаткові артефакти (proposal, decisions, повний список задач, текст рев’ю) не завантажуються, а заглибитися в один підключений проєкт «якщо захочу» ніде. Потрібен огляд на весь екран із більшою операційною інформацією та деталями проєкту за явним запитом, без роздування 60-секундного полінгу.

## What Changes

- Огляд борду стає fluid master-view на весь viewport: KPI-смуга, клієнтські фільтри, колонки з `nextRole`, прогрес-баром задач, кольоровим вердиктом і відносною датою; візуальне групування рядків за проєктом.
- Додається панель деталей проєкту (drawer справа з оверлеєм) на тому ж `BoardView` (`/`): відкривається кліком по комірці проєкту або «Деталі», закривається оверлеєм, Escape і кнопкою закриття.
- Заголовок панелі береться з уже опитаного стану реєстру/борду; збагачення (head гілки + `proposal.md` / `decisions.md` / повний `tasks.md` / уривки `review.md` / `handoff.md`) завантажується **лише коли панель відкрита**.
- Клієнти GitHub/GitLab отримують `fetchBranchHead`; наявний `fetchArtifact` перевикористовується для додаткових файлів. Парсери додають структурований список задач і уривки proposal/decisions.
- Полер і `refreshProject` / `refreshAll` MUST NOT викликати завантаження детальних артефактів.

**Design: none** — `require_design_brief: false`, Figma немає; UI фіксується в `design.md`.

## Non-goals

- Власний бекенд або проксі.
- Запис у віддалені репозиторії.
- Облік токенів / spend з Cursor або Amp vendor API, локального Amp ledger чи Cursor billing (оператор користується обома IDE; витрати не в git; відкладається на окрему зміну з телеметрійним контрактом kit).
- Зміна handoff Runtime у agent-orchestrator-kit з `local|cloud` на `cursor|amp|cloud`.
- Hydra SSO і multi-tenant.
- Заміна таблиці на cards-only.
- Пагінація понад чинне `per_page=100`.
- Завантаження додаткових артефактів на кожному циклі полінгу.
- Лістинг архівних змін (`openspec/changes/archive`) у цій зміні.

## Capabilities

### New Capabilities

- `project-detail`: панель деталей одного проєкту на борді — відкриття/закриття, заголовок з уже опитаного стану, on-demand збагачення з окремим loading/error, порожній стан «панель не показана», доступність (focus close, `aria-modal`).

### Modified Capabilities

- `factory-board`: огляд на весь екран, KPI, фільтри, колонки (`nextRole`, прогрес задач, кольоровий вердикт, відносна дата, «Деталі»), групування за проєктом.
- `artifact-ingestion`: on-demand читання `proposal.md`, `decisions.md` (опційно `design.md`), head коміта гілки та структурований список чекбоксів `tasks.md`; 404 додаткових файлів і head → порожня секція / `null`, не помилка проєкту полінгу.
- `board-polling`: цикл опитування MUST NOT завантажувати детальні артефакти (proposal, decisions, design, branch head, повний список задач окремо від прогресу n/m).

## Acceptance criteria

- Огляд борду займає весь viewport (fluid master-view без обмеження ширини на кшталт `max-width: 72rem`): KPI-смуга (проєкти, активні зміни, blocked, помилки) з уже наявного стану без HTTP; клієнтські фільтри (пошук за repo/зміною, провайдер, Blocked, Помилка) без запитів до провайдера; нуль збігів показує «Немає рядків за фільтром.»
- Таблиця групує рядки за проєктом; колонки показують видимий `nextRole` (`nextCommand` — другорядний текст або tooltip), прогрес задач `n/m` з індикатором, кольоровий вердикт (APPROVE — зелений, REQUEST CHANGES — янтарний, REJECT — червоний) і відносну дату оновлення з точним часом у tooltip.
- Панель деталей — drawer справа з затемненим оверлеєм на тому ж `BoardView` (`/`), без нового маршруту Vue Router і без query `?project=`; відкривається кліком по комірці проєкту (підпис repo) або кнопкою «Деталі»; закривається кліком по оверлею, Escape і кнопкою закриття.
- Заголовок панелі показується одразу з уже опитаного стану реєстру/борду; збагачення (head гілки + `proposal.md` / `decisions.md` / повний `tasks.md` / уривки `review.md` / `handoff.md`) завантажується лише коли панель відкрита.
- Полер, `refreshProject` і `refreshAll` MUST NOT завантажувати детальні артефакти (`proposal.md`, `decisions.md`, `design.md`, branch head, окремий список задач понад прогрес n/m).
- Відсутність extra-файлу або head гілки (404 / порожня відповідь) дає порожню секцію / `null` і MUST NOT фіксуватися як помилка полінгу проєкту.
- `npm run lint`, `npm test` та `npm run build` завершуються без помилок.

## Impact

- Код: `src/views/BoardView.vue`, `src/components/BoardTable.vue`, новий `src/components/ProjectDetailPanel.vue`, `src/stores/board.js`, `src/api/github.js`, `src/api/gitlab.js`, `src/utils/openspecParsers.js`, `src/styles.css`, `src/composables/usePoller.js` (лише гарантія, що callback лишається `refreshAll`), тести Vitest/VTU.
- API: додаткові GET GitHub ` /repos/{repo}/commits/{branch}` і GitLab `/projects/{id}/repository/commits?ref_name={branch}&per_page=1` плюс повторне `fetchArtifact` для extra-файлів — лише з `loadProjectDetails`.
- Залежності: нові npm-пакети не потрібні.
- Роутер: новий маршрут не потрібен; query `?project=<id>` не обов’язковий.
- Безпека: ті самі read-only токени, що у v1; більше запитів лише на відкритий проєкт.
