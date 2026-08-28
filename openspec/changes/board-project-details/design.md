# Design: board-project-details

## Context

Мотивація — див. `proposal.md` → Why. Вимоги — delta-спеки `factory-board`, `artifact-ingestion`, `board-polling`, `project-detail`.

Поточний стан після v1 (`add-factory-board`): два Pinia-стори (`registry`, `board`), клієнти GitHub/GitLab зі спільним інтерфейсом `listChanges` + `fetchArtifact`, полер 60 с, таблиця в `BoardView`. `nextRole` уже парситься в `refreshProject`, але в таблиці не показується. Полінг тягне лише `handoff.md`, `tasks.md`, `review.md`. CSS у робочому дереві вже експериментально прибрав `.board { max-width: 72rem }` — apply MUST закріпити fluid-лейаут і добити KPI, фільтри та панель.

Чинні рішення v1, які ця зміна **не переглядає**: два стори; ключ `factory-board.projects.v1`; Axios `createHttp` (без `fetch`); 404 артефакту → `null`; `archive` виключений з `listChanges`; `per_page=100`; нормалізація помилок полінгу per-project; полер-guard проти накладання циклів; без UI-бібліотек; без ETag; без власного бекенда.

Design-brief / Figma: немає (`require_design_brief: false`). UI фіксується нижче.

## Goals / Non-Goals

**Goals:**

- Master–detail на одному `BoardView` (`/`): огляд = fluid таблиця; деталі = явне відкриття.
- On-demand HTTP лише для відкритого проєкту, ізольований від 60 с полінгу.
- Тестовані парсери, дія стора деталей, open/close панелі, гарантія «extra-файли не йдуть, доки панель закрита».

**Non-Goals (дизайн-рівень, на додачу до proposal):**

- Окремий Pinia-стор `details` (див. D2).
- Query `?project=<id>` (дозволено брифом, не беремо — без роутера).
- Split-pane від 1200px (див. D1).
- Автооновлення відносного часу щосекунди.
- Лістинг `openspec/changes/archive`.
- Нові npm-залежності (date-fns тощо).

## Decisions

### D1. Панель = drawer справа з оверлеєм (не split pane)

Один патерн на всі viewport: фіксований оверлей (`position: fixed; inset: 0`) із затемненням і панель справа (`width: min(32rem, 100vw)`, `height: 100%`, `overflow: auto`). Клік по оверлею, Escape і кнопка «Закрити» закривають панель. `role="dialog"` + `aria-modal="true"`. При відкритті фокус на кнопку закриття; при закритті — повернення на тригер. Тригер зберігає `BoardView`: на `@details` записує `document.activeElement`; усі шляхи закриття йдуть через одну `closePanel`, яка після `selectedProjectId = null` у `nextTick` викликає `focus()` на збереженому елементі, якщо він ще в документі.

**Чому не split pane ≥1200px:** бриф вимагає закриття кліком по оверлею; два лейаути подвоюють CSS і тести; drawer працює на вузькому екрані без другої гілки.

Рендер: `ProjectDetailPanel` через `Teleport` на `body`, щоб `overflow` таблиці не кліпав панель. Стан відкриття живе в `BoardView`: `selectedProjectId` (`null` = закрито).

### D2. Деталі в сторі `board`, не окремий стор

Розширити `src/stores/board.js`:

- `details` — об’єкт за `project.id`
- `detailsLoading` — об’єкт за `project.id`
- `detailsError` — об’єкт за `project.id`
- дія `loadProjectDetails(project)`

Модель `details[id]`:

```text
{
  branchHead: { sha, message, author, date, url } | null,
  changes: {
    [changeName]: {
      taskList: { text: string, done: boolean }[],
      handoff: { nextCommand, nextRole, blocked, done },
      reviewExcerpt: string | null,
      proposal: { title: string | null, why: string | null },
      decisionsExcerpt: string | null,
      designExcerpt: string | null
    }
  }
}
```

`loadProjectDetails`:

1. Ставить `detailsLoading[id] = true`, у `finally` — `false`.
2. Бере список активних змін з `statuses[id]` (імена `changeName`); порожній або відсутній масив → `changes: {}` без виклику `listChanges` (панель відкривається після полінгу; extra HTTP — лише `fetchBranchHead` і `fetchArtifact` для вже відомих імен).
3. Паралельно: `fetchBranchHead(project)` + для кожної зміни `fetchArtifact` для `tasks.md`, `handoff.md`, `review.md`, `proposal.md`, `decisions.md`, `design.md`.
4. Успіх → запис `details[id]`, очищення `detailsError[id]`.
5. Помилка (не 404) → `detailsError[id] = normalizeProviderError(e)`; попередній `details[id]` не затирати. MUST NOT писати в `errors[id]` / `loading[id]` таблиці.

`refreshProject` / `refreshAll` / callback `usePoller` MUST NOT викликати `loadProjectDetails`.

Перше відкриття панелі для проєкту без кешу → `loadProjectDetails`. Якщо кеш є — показати одразу. «Оновити деталі» завжди викликає `loadProjectDetails`.

**Альтернатива (окремий стор)** відхилена: деталі — волатильний стан того ж борду; другий стор додає wiring без ізоляції персистенції.

### D3. Провайдер-клієнти: `fetchBranchHead`, reuse `fetchArtifact`

Інтерфейс `src/api/github.js` і `src/api/gitlab.js` доповнюється `fetchBranchHead(project)` → `{ sha, message, author, date, url } | null`. Усі HTTP — Axios `createHttp`, без `fetch`. `getProviderClient` лишається диспетчером модулів.

**GitHub:** `GET /repos/{project.repo}/commits/{branch}` (branch у path, URL-encode). Мапінг: `sha`; `commit.message` — перший рядок; `commit.author.name`; `commit.author.date`; `html_url`. 404 і 409 (порожній репозиторій) → `null`. Інші статуси — throw.

**GitLab:** `GET /api/v4/projects/{id}/repository/commits?ref_name={branch}&per_page=1`. Порожній масив або 404 → `null`. Інакше перший елемент: `id` → `sha`; `title` або перший рядок `message`; `author_name`; `authored_date` або `created_at`; `web_url` → `url`.

`fetchArtifact` без змін контракту: 404 → `null`. Extra-файли: `proposal.md`, `decisions.md`, `design.md` (і повторне читання `tasks.md` / `handoff.md` / `review.md` для повного тексту в панелі — полінг уже має прогрес/вердикт/роль, але сирий Done і чекбокси потребують повного тексту; повторне читання лише в `loadProjectDetails`).

### D4. Парсери — чисті функції поруч із v1

Файл `src/utils/openspecParsers.js`, без зміни `parseTasksProgress` / `parseHandoff` / `parseReviewVerdict`:

- `parseTaskList(text)` → `{ text, done }[]`. Рядки `/^\s*- \[([ xX])\]\s*(.*)$/gm`; `done` якщо маркер `x`/`X`; `text` — решта рядка trim. `null`/порожньо → `[]`.
- `parseProposalExcerpt(text)` → `{ title, why }`. `title` — перший ATX-heading (`/^#\s+(.+)/m`) або перший непорожній рядок. `why` — тіло після heading `/^##\s*Why\b/i` до наступного `^##\s`, обрізати до 500 символів. Немає Why → `why: null`.
- `parseDecisionsExcerpt(text)` → `string | null`. Текст без першого H1, обрізати до 500 символів; порожньо → `null`.
- `parseReviewExcerpt(text)` → `string | null`. Перші 500 символів trim; порожньо/`null` → `null`.
- `parseHandoffDetails(text)` → `{ ...parseHandoff(text), done }`. `done`: однорядкове поле `/done\**:?\s*(.+)/i` (як next command) або секція після `/^##?\s*Done\b/im` до наступного heading, trim, порожнє/`none`/`немає`/`-` → `null`.

Усі функції стійкі до `null`.

### D5. UI огляду

Структура `.board` (flex-колонка, `width: 100%`, `max-width: none`, `min-height: 100dvh`):

1. Заголовок `Factory board` + тулбар (Оновити, Додати проєкт).
2. **KPI** `.board-kpis`: чотири картки — Проєкти, Активні зміни, Blocked, Помилки. Computed з `registry.projects`, `board.statuses` (рядки з непорожнім `changeName`), `blocked`, `board.errors`. Без HTTP. Фільтри таблиці KPI не змінюють.
3. **Фільтри** `.board-filters`: `input` пошуку (реєстр `repo` + `changeName`, без урахування регістру); `select` провайдера (`усі` / `github` / `gitlab`); чіпи-кнопки «Blocked» і «Помилка» (toggle). Нуль збігів → текст «Немає рядків за фільтром.»
4. `ProjectForm` як зараз.
5. `.board-table-wrap`: `flex: 1`, `width: 100%`, `overflow: auto`. `.board-table`: `width: 100%`, `min-width: 56rem`, `table-layout: auto`. Компактні колонки (`tasks`, `verdict`, `updated`, `actions`): `width: 1%; white-space: nowrap`. Проєкт / зміна / фаза / статус — залишок ширини.

Колонки таблиці (`BoardTable.vue`):

| Колонка | Вміст |
|---|---|
| Проєкт | Підпис repo лише на першому рядку групи (`tabindex="-1"`); клік відкриває деталі |
| Зміна | назва або «немає активних змін» |
| Фаза | видимий `nextRole`; `nextCommand` другим рядком дрібнішим текстом або `title` tooltip |
| Задачі | `n/m` + `<progress :max="total" :value="done">` (max=0 → не рендерити bar) |
| Вердикт | бейдж: APPROVE `.badge-verdict-approve` (зелений), REQUEST CHANGES `.badge-verdict-changes` (янтар), REJECT `.badge-verdict-reject` (червоний) |
| Оновлено | відносний час українською (чиста `formatRelativeTime(ts, now)` у модулі таблиці або `src/utils/formatRelativeTime.js`); `title` = точний `toLocaleString()` |
| Статус | як v1 (loading / blocked / error / ok) |
| Дії | перший рядок групи: «Деталі», Редагувати, Видалити |

Еміти `BoardTable`: наявні `edit`/`remove` + новий `details` з `projectId`. Перед emit обробники кліку «Деталі» і span repo викликають `event.currentTarget.focus()`, щоб `document.activeElement` у `BoardView` був тригером.

Групування: наявна `isFirstRowOfProject`.

Відносний час перераховується при ре-рендері (після полінгу), без інтервалу 1 с.

### D6. UI панелі

`src/components/ProjectDetailPanel.vue`:

- Props: `project` (запис реєстру), `header` (зміни з `statuses`, `lastUpdated`, poll `error`), `details`, `detailsLoading`, `detailsError`.
- Emits: `close`, `refresh-details`.
- Заголовок одразу з props (провайдер-бейдж, repo, branch, час полінгу, помилка полінгу, список змін: ім’я, nextRole, n/m, вердикт, blocked).
- Блок збагачення: спінер «Завантаження деталей…»; банер `detailsError.message`; інакше секції:
  - Останній коміт: короткий sha (7), message, author, date, посилання `url` (`target="_blank" rel="noopener"`). Якщо `branchHead === null` — секція «Немає даних про коміт».
  - На кожну активну зміну: список чекбоксів (`<ul>` з done/pending), handoff (nextCommand, nextRole, Done, Blocked), уривок review, proposal title+Why, decisions, design. Порожній файл — заголовок секції + «немає файлу», без банера помилки.
- Кнопки: «Закрити», «Оновити деталі».

Оверлей і панель не монтуються, коли `selectedProjectId == null`.

### D7. Відносний час без бібліотек

`formatRelativeTime(isoOrMs, now = Date.now())`: різниця в секундах; пороги хв/год/дні; рядки українською («щойно», «N хв тому», «N год тому», «N дн. тому»). Майбутнє або NaN → `—`.

## Risks / Trade-offs

- [Проєкт із багатьма активними змінами: 1 head + до 6 файлів × N змін за одне відкриття] → лише відкритий проєкт, без архіву, без полінгу extra; кеш до «Оновити деталі».
- [Повторне читання `tasks.md`/`handoff.md`/`review.md` у деталях дублює полінг] → прийнято: панель потребує повний текст; не зберігаємо сирі файли в статусах таблиці.
- [Архівні зміни невидимі] → non-goal; майбутня зміна може додати count з listing `openspec/changes/archive` без читання файлів.
- [CORS / rate-limit на деталях] → `detailsError` окремо від рядка таблиці; оператор бачить обидва стани.
- [Експериментальний CSS уже без max-width] → spec і задачі вимагають повний лейаут (KPI, фільтри, панель), не лише зняття max-width.

## Migration Plan

Схема localStorage не змінюється. Відкат — revert коміта. Нових env-змінних немає.

## Open Questions

Немає — рішення брифу зафіксовані (drawer, без нового маршруту, без архіву, без токен-акаунтингу).
