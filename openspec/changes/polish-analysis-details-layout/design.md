## Context

Мотивація — `proposal.md` → Why. Контракт — delta `specs/change-metrics/spec.md`, `specs/project-detail/spec.md`, `specs/factory-board/spec.md`. Design-brief / Figma: немає (`require_design_brief: false`).

Чинний код (не вигадувати інший):

- `src/stores/analysis.js` — `loadAnalysis` завжди ставить `loading.value = true` і `rows.value = []`, далі дописує рядки по проєктах.
- `src/views/AnalysisDetailsView.vue` — skip fetch, якщо `rows.some(projectId)`; інакше `loadAnalysis`. Показує `<p>Завантаження аналізу…</p>`.
- `src/views/AnalysisView.vue` — `watch` на `projectId` завжди викликає `loadAnalysis`; список у `.board-table-wrap` + `.analysis-table`; колонок «Агенти» / «Платформи» немає (лише «Моделі» + кнопка «Деталі метрик»).
- `src/components/AnalysisDetailsModal.vue` — full-page вміст (не `role="dialog"`): таблиця «Показник»/«Значення»; п’ять `.analysis-journal-scroll` таблиць; `detailRows` завжди має шість pending-рядків (`статус` = «немає» + п’ять `—`, коли `pending === null`).
- `src/styles.css` — `.analysis-journal-scroll { overflow-x: auto }`, `.analysis-journal-table { width: max-content }` + `th/td { white-space: nowrap }`.
- `src/components/ProjectDetailPanel.vue` — drawer на `/`: заголовок і збагачення як стіна `<p>`/`<h3>`/`<h4>`; `.badge` уже є на провайдері.
- `src/stores/board.js`, `src/composables/usePoller.js`, `src/components/BoardTable.vue` — полер і «оновлюється…»; не чіпати для оверлею аналізу.
- Стек: Vue 3 `<script setup>`, Pinia, JavaScript. Без Options API, без коментарів, без TypeScript, без Quasar, без нових npm.

## Goals / Non-Goals

**Goals:**

- Оверлей лише коли немає що показати; зберегти рядки того самого `projectId`.
- Картки замість H-scroll таблиць на аналізі та деталях.
- Pending hide-when-empty в деталях; бейдж списку / CSV / парсер без змін схеми.
- Шухляда борду: секції/картки/бейджі, той самий контент і a11y-контракт.

**Non-Goals:**

- Оверлей на полер `/` або на «Завантаження деталей…» шухляди.
- Видалення `pending` з `parseKitMetrics` / `metricsToCsv`.
- Конвертація Amp credits; зміна billed/`≈` резолюції.
- Перейменування файлу `AnalysisDetailsModal.vue` або нові маршрути.
- Відновлення колонок «Агенти»/«Платформи» на списку (лишаються в деталях).
- Редагування `src/utils/changeMetrics.js` окрім випадкової потреби UI-форматерів, яких там уже немає.

## Decisions

### D1. `loadAnalysis` не чистить рядки того самого проєкту

У `src/stores/analysis.js`:

- Перед запитом обчислити `keep = projects.length === 1 && rows.value.some((row) => row.projectId === projects[0].id)`.
- Завжди `loading.value = true`.
- Якщо `!keep` — `rows.value = []` (інший проєкт, F5, порожній стор).
- Якщо `keep` — не обнуляти `rows`. Збирати нові рядки в локальний масив і присвоїти `rows.value = collected` лише після успішного `loadProject` цього проєкту (не дописувати в кінець старих рядків — інакше дублікати).
- `error[id]` як зараз: успіх видаляє ключ, catch пише `normalizeProviderError`.
- `finally`: `loading.value = false`.
- Не експортувати новий прапорець, якщо UI може вивести `showOverlay = loading && !hasRowsForRoute`.

**Чому не `loading = false` під час фонового refresh:** кнопка «Оновити» лишається disabled; оверлей все одно сховано через наявність рядків.

**Альтернатива (окремий `refreshing`)** відхилена: зайвий стан; продукт вимагає «немає що показати», не окремий індикатор refresh.

Не змінювати HTTP: `listChanges` / `listArchivedChanges` / `fetchArtifact` / коміти — як зараз. Не імпортувати `usePoller`.

### D2. Оверлей — спільний SFC без Quasar

Новий файл `src/components/AnalysisLoadingOverlay.vue` (`<script setup>`, без коментарів):

- prop `visible: Boolean`
- `v-if="visible"` на корінь
- класи `analysis-loading-overlay` (fixed `inset: 0`, напівпрозорий фон, z-index вище контенту аналізу, нижче тостів якщо конфлікт — тости вже в `App.vue` поверх `RouterView`)
- CSS-спінер (border animation) + текст «Завантаження аналізу…»
- `role="status"` і `aria-live="polite"`
- MUST NOT імпортувати quasar, MUST NOT рендерити `QSpinner`

Підключення:

- `AnalysisView.vue`: `visible = analysisStore.loading && !analysisStore.rows.some((row) => row.projectId === route.params.projectId)` (при відсутності проєкту в реєстрі оверлей не потрібен — лишаються тексти «не знайдено» / порожній реєстр).
- `AnalysisDetailsView.vue`: `visible = analysisStore.loading && row == null` (і проєкт існує). Skip fetch D1 не ламати.
- Прибрати `<p v-if="analysisStore.loading">Завантаження аналізу…</p>` з обох view.
- `BoardView.vue` / `ProjectDetailPanel.vue` / `usePoller.js` / `board.js` не імпортують цей компонент.

**Альтернатива (оверлей у `App.vue`)** відхилена: легко випадково накрити борд.

### D3. Список аналізу — картки, не `.board-table-wrap`

`AnalysisView.vue`: замінити `<table class="analysis-table">` на стек `<article class="analysis-change-card">` (один на `filteredRows`). Поля картки: проєкт, зміна + `.analysis-pending` «триває», архів, вердикт, задачі `n/m`, цикли рев’ю, Спека/Рев’ю/Apply/Усього з тими самими `preferDuration` / `title`, сесії, lead, токени, вартість (`costLabel` / `costTitle` без зміни формул), моделі (стек імен, не ролі), кнопка `aria-label="Деталі метрик"` → чинний `openDetails`. Фільтри, CSV, «Оновити», «Борд» без зміни контракту. Не додавати колонки «Агенти»/«Платформи».

CSS у `src/styles.css`: `.analysis-change-card` як біла картка з бордером/радіусом на кшталт `.board-kpi`; підписи дрібні; значення з `overflow-wrap: anywhere`. Видалити залежність списку від `.board-table-wrap` / `.analysis-table` (мертві colgroup-правила прибрати, якщо більше ніде не використовуються).

Тести `AnalysisView.spec.js`: замінити очікування `thead th` / `analysis-table__stack-cell` / `columnText` на текст карток; лишити фільтр архіву, «триває», `≈` вартості, навігацію на details, `not.toContain('Агенти')` / `'Платформи'` як заголовки колонок таблиці (карток це не ламає, якщо не додавати ці підписи). Додати кейс: після `flushPromises` є картка, повторний `loadAnalysis` того самого id не ховає картку під оверлей (стор можна заповнити заздалегідь).

### D4. Деталі — картки журналу, pending v-if, сесії за полями

`AnalysisDetailsModal.vue` лишається іменем файлу (не перейменовувати). Прибрати таблицю `.analysis-details-table` «Показник»/«Значення»: зведення — одна (або кілька логічних) карток із підписаними рядками. `detailRows` MUST НЕ містити шести pending-ключів, коли `journal.pending == null`; коли pending є — показати блок із тими самими українськими підписами, що зараз.

Сесії: `v-for` по `sessionRows` → `<article class="analysis-session-card">`:

1. роль (`overflow-wrap: anywhere`) + фаза
2. `model · platform · env`
3. `startedAt → endedAt · duration`
4. `tokens · cost · amp · spendSource` (підпис джерела як зараз: адаптер/самозвіт/…)
5. thread — `v-if` непорожній `threadId`
6. tasks — `v-if` непорожній `tasks`

Платформи (завжди cursor/claude/amp), моделі, фази, sources — стек карток або підписаних блоків; порожні моделі/сесії/sources — «немає». Вартість через чинний `costLabel`. Дати Київ. Без балу 1–5. Без `role="dialog"`.

У `src/styles.css`: **змінити** `.analysis-journal-scroll` / `.analysis-journal-table` так, щоб вони більше не вимагали H-scroll (`overflow-x: auto` + `nowrap` + `max-content` прибрати). Якщо класи лишаються для сумісності тестів — вони MUST NOT зберігати той контракт; тести мають шукати картки, не `toHaveLength(5)` scroll-обгорток.

`AnalysisDetailsView.vue`: оверлей D2; не показувати `<p>Завантаження…</p>`; контент модалки як зараз через `v-else-if="row"`.

### D5. Шухляда — картки без зміни UX-контракту

Лише `ProjectDetailPanel.vue` + CSS. Не змінювати props/emits (`close`, `refresh-details`), Escape, overlay click, фокус на «Закрити», `role="dialog"`. Не читати `metrics.json`. Не ставити оверлей аналізу.

Макет:

- заголовок: `.badge` провайдера (вже є); бейджі вердикту/blocked/фази для змін у списку заголовка (класи `.badge-verdict-*` / `.badge-blocked` з борду)
- `article.board-detail-card` (візуально як `.board-kpi`) для head коміта
- `article.board-detail-card` на кожну активну зміну: `h3` імені; секції Задачі (чекбокси), Handoff, Review, Proposal, Decisions, Design
- порожні поля лишають `немає файлу` / «Немає даних про коміт»

«Завантаження деталей…» лишається `<p>` у панелі.

### D6. Ізоляція борду

Не редагувати: `src/stores/board.js`, `src/composables/usePoller.js`, `src/components/BoardTable.vue`, `src/views/BoardView.vue` (окрім випадкового імпорту — його не робити), api-клієнти. `.board-table-wrap` на борді лишає H-scroll. KPI на 4 колонки без змін.

### D7. Тести (файли; прогін — за політикою apply)

Оновити, не видаляючи кейси вартості/дат/CSV/ізоляції полера:

- `src/stores/analysis.spec.js` — keep rows while loading same project; clear rows when other project; `loading` true/false як зараз
- `src/views/AnalysisView.spec.js` — картки, оверлей відсутній після завантажених рядків, немає `.board-table-wrap` як H-scroll списку
- `src/views/AnalysisDetailsView.spec.js` — оверлей на холодному deep-link (deferred `listChanges`); skip overlay якщо рядки вже в сторі
- `src/components/AnalysisDetailsModal.spec.js` — прибрати `findAll('.analysis-journal-scroll')).toHaveLength(5)`; `pending === null` → немає підписів pending; pending-об’єкт → підписи є; сесія без thread не показує порожній thread-рядок
- `src/components/ProjectDetailPanel.spec.js` — картки/бейджі; чинні close/Escape/dialog/empty/loading

Не чіпати `src/utils/changeMetrics.spec.js` і `src/stores/board.spec.js`, якщо парсер і полер не змінюються.

## Risks / Trade-offs

- [Фоновий `loadAnalysis` лишає застарілі картки до відповіді] → прийнятно; краще ніж порожній спалах. Помилка проєкту після keep: банер + старі рядки (не чистити успішні дані).
- [Тести списку зав’язані на `thead` / `columnText`] → оновити в тому ж apply; інакше червоні сьюти без зміни продукту.
- [Залишити `.analysis-journal-scroll` «для класів»] → ризик знову включити H-scroll; тести мають ловити відсутність overflow-контракту.
- [Картки довші за таблицю по вертикалі] → прийнятний trade-off проти нечитабельного H-scroll.
- [Шухляда вузька `min(32rem, 100vw)`] → картки всередині з wrap; не розширювати drawer у цій зміні.

## Migration Plan

Немає зміни localStorage / env / реєстру / CSV-заголовків. Відкат — revert Vue/CSS/store: знову таблиці й обнулення рядків. `metrics.json` не пишеться бордом.

## Open Questions

Немає — рішення оператора зафіксовані в `decisions.md`.
