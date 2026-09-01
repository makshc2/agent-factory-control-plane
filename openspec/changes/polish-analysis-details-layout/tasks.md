# Tasks: polish-analysis-details-layout

## 1. Стор аналізу

- [x] 1.1 Зберегти рядки того самого projectId у `loadAnalysis`
  Files: src/stores/analysis.js
  Do: JavaScript без TypeScript і без коментарів. Не редагувати `src/stores/board.js` і `src/composables/usePoller.js`. На старті `loadAnalysis(projects)` обчислити `keep` як `projects.length === 1 && rows.value.some((row) => row.projectId === projects[0].id)`. Завжди ставити `loading.value = true`. Якщо `keep` хибне — `rows.value = []`; якщо істинне — не обнуляти `rows`. Збирати нові рядки в локальний масив `collected`; у гілці успіху `loadProject` робити `collected.push(...part)` і `delete error[id]`. Якщо `!keep` — після кожного успішного проєкту `rows.value = [...collected]` (як зараз стрім). Після циклу: якщо `keep` і жоден проєкт не завершився успіхом — не присвоювати порожній `collected` (лишити старі рядки); інакше `rows.value = collected`. `lastLoadedAt` і `finally { loading.value = false }` лишити. HTTP `listChanges` / архів / артефакти / коміти не змінювати.
  Done-when: у `src/stores/analysis.js` немає безумовного `rows.value = []` перед циклом проєктів; є перевірка `keep` через `projectId`; `npm run lint` завершується з кодом 0.

- [x] 1.2 Зафіксувати keep/clear у `analysis.spec.js`
  Files: src/stores/analysis.spec.js
  Do: Не видаляти чинні кейси fill rows / 401 / sequential two projects / loading true-then-false. Додати кейс: після успішного `loadAnalysis([project])` з `id: 'proj-1'` замокати відкладений `listChanges`, викликати `loadAnalysis([project])` вдруге — поки проміс висить, `store.loading === true` і `store.rows.length >= 1` (рядки не порожні). Додати кейс: після рядків `proj-1` викликати `loadAnalysis` з іншим `id` і відкладеним `listChanges` — на старті `store.rows.length === 0`. Не імпортувати `usePoller`.
  Done-when: файл містить очікування, що повторний `loadAnalysis` того самого `project.id` не обнуляє `rows` під час pending, і що інший id обнуляє; `npm run lint` завершується з кодом 0.

## 2. Оверлей завантаження

- [x] 2.1 Додати кастомний оверлей без Quasar
  Files: src/styles.css, new file: src/components/AnalysisLoadingOverlay.vue
  Do: Vue 3 `<script setup>` без Options API і коментарів. Prop `visible` типу Boolean. Корінь з `v-if="visible"`, класи `analysis-loading-overlay`, `role="status"`, `aria-live="polite"`, CSS-спінер (елемент з класом `analysis-loading-spinner`) і текст `Завантаження аналізу…`. MUST NOT імпортувати `quasar` і MUST NOT містити `QSpinner`. У `src/styles.css` додати `.analysis-loading-overlay` з `position: fixed; inset: 0; z-index: 30` (нижче `.board-detail-overlay` z-index 40), напівпрозорий фон, центрування спінера й тексту; спінер — CSS `border` animation, не картинка Quasar. Не змінювати `.board-kpis` і `.board-table-wrap` борду.
  Done-when: існує `src/components/AnalysisLoadingOverlay.vue` з текстом `Завантаження аналізу…` і без `QSpinner`; у `src/styles.css` є `.analysis-loading-overlay` і `.analysis-loading-spinner`; `npm run lint` завершується з кодом 0.

- [x] 2.2 Показати оверлей лише коли немає що рендерити
  Files: src/views/AnalysisView.vue, src/views/AnalysisDetailsView.vue
  Do: `<script setup>` без Options API і коментарів. Імпортувати `AnalysisLoadingOverlay` з `@/components/AnalysisLoadingOverlay.vue`. У `AnalysisView.vue` обчислити `showOverlay` як `analysisStore.loading && project.value != null && !analysisStore.rows.some((row) => row.projectId === project.value.id)`; вставити `<AnalysisLoadingOverlay :visible="showOverlay" />`; видалити `<p v-if="analysisStore.loading">Завантаження аналізу…</p>`. У `AnalysisDetailsView.vue` `showOverlay` як `analysisStore.loading && project.value != null && row.value == null`; так само компонент оверлею; видалити абзац «Завантаження аналізу…»; skip fetch `alreadyHasProjectRows` лишити. Не імпортувати оверлей у `BoardView.vue` / `ProjectDetailPanel.vue`.
  Done-when: обидва view містять `AnalysisLoadingOverlay` і не містять `<p v-if="analysisStore.loading">`; `src/views/BoardView.vue` не імпортує `AnalysisLoadingOverlay`; `npm run lint` завершується з кодом 0.

## 3. Картки списку аналізу

- [x] 3.1 Замінити таблицю списку на стек карток
  Files: src/views/AnalysisView.vue
  Do: Прибрати `.board-table-wrap` і `<table class="analysis-table">`. Для кожного `filteredRows` рендерити `<article class="analysis-change-card">` з підписаними полями: проєкт (`projectLabel`), зміна (`changeName`) плюс `<span class="analysis-pending">триває</span>` якщо `row.journal?.pending != null` (tooltip `pendingTitle` без змін), архів (`archiveLabel`), вердикт, задачі `n/m`, цикли рев’ю, Спека/Рев’ю/Apply/Усього з тими самими `preferDuration` / `preferredDurationTitle` / `durationLabel`, сесії, lead, токени, вартість (`costLabel` / `costTitle` без зміни формул), моделі (`modelNames` стеком, не ролі Explorer/Architect), кнопка `aria-label="Деталі метрик"` з чинним SVG і `openDetails(row)`. Довгі назви — `overflow-wrap` через CSS картки, не `nowrap` ellipsis-таблиці. Не додавати підписи-заголовки колонок «Агенти» і «Платформи». Фільтри, CSV, «Оновити», «Борд» не змінювати за контрактом. Не імпортувати `usePoller`.
  Done-when: файл містить `analysis-change-card` і `триває`; не містить `analysis-table` і `board-table-wrap`; є `aria-label="Деталі метрик"`; `npm run lint` завершується з кодом 0.

- [x] 3.2 Стилі карток списку без H-scroll аналізу
  Files: src/styles.css
  Do: Додати `.analysis-change-card` як вертикальний стек (білий фон, бордер, радіус як `.board-kpi`, `overflow-wrap: anywhere`, без `white-space: nowrap` на назві зміни). Видалити правила `.analysis .board-table-wrap`, `.analysis-table` і всі `.analysis-table__*` (список більше їх не використовує). Лишити `.board-table-wrap` / `.board-table` для живої таблиці борду без змін `min-width: 56rem` і `overflow: auto`. Не змінювати `grid-template-columns` KPI.
  Done-when: у `src/styles.css` є `.analysis-change-card` і немає селекторів `.analysis-table`; `.board-table-wrap` і `.board-table` лишаються; `npm run lint` завершується з кодом 0.

## 4. Сторінка деталей метрик

- [x] 4.1 Зведення деталей карткою і hide-when-empty для pending
  Files: src/components/AnalysisDetailsModal.vue
  Do: `<script setup>` без Options API і коментарів. Замінити таблицю `.analysis-details-table` з `<th>Показник</th><th>Значення</th>` на картку `.analysis-metric-card` з підписаними рядками тих самих полів зведення (зміна, архів, журнал джерело/версія/дати, totals, kit work/lead, spend-overlay, git-span, субагенти, критерії, рішення, середовище, ролі, «Як рахується час»). Якщо `journal.pending == null` — не рендерити підписи `Журнал · статус`, `Журнал · роль pending`, `Журнал · pending з`, `Журнал · pending платформа`, `Журнал · pending thread`, `Журнал · pending клієнт`. Якщо pending є об’єктом — показати цей блок із чинними підписами і Київ-датами. Не показувати бал 1–5. Не ставити `role="dialog"`. Не конвертувати Amp credits у USD. Формули `displayedCostLabel` / `costLabel` не змінювати.
  Done-when: файл не містить текстів `Показник` і `Значення` як заголовків колонок таблиці зведення; містить `analysis-metric-card`; pending-підписи рендеряться лише за `journal.pending != null`; `npm run lint` завершується з кодом 0.

- [x] 4.2 Картки сесій журналу
  Files: src/components/AnalysisDetailsModal.vue
  Do: Прибрати таблицю сесій на 14 колонок. Якщо `sessionRows.length === 0` — текст `немає` у секції сесій. Інакше кожна сесія — `<article class="analysis-session-card">` у порядку: роль (клас з wrap) і фаза; рядок `model · platform · runtime`; рядок `startedAt → endedAt · duration`; рядок токени, вартість (`costLabel(session)`), Amp credits, джерело spend (`sessionSpendLabel`); `threadId` лише якщо не `—` і не порожньо; `tasks` лише якщо не `—` і не порожньо. Порожній масив сесій не малює `colspan="14"`.
  Done-when: файл містить `analysis-session-card` і не містить `<th>Thread</th>` у 14-колонковій таблиці сесій; є умовний показ thread/tasks; `npm run lint` завершується з кодом 0.

- [x] 4.3 Картки платформ/моделей/фаз/sources і прибрати H-scroll журналу
  Files: src/components/AnalysisDetailsModal.vue, src/styles.css
  Do: Замінити п’ять обгорток `.analysis-journal-scroll` + таблиць `.analysis-journal-table` на стек карток/блоків `.analysis-journal-card` (платформи cursor/claude/amp з полями вхід/вихід/усього/вартість/Amp credits/джерело; моделі або `немає`; фази; sources або `немає`). Вартість лишає `costLabel`. Amp credits окремим полем. У `src/styles.css` змінити або замінити `.analysis-journal-scroll` / `.analysis-journal-table` так, щоб не лишалось `overflow-x: auto` разом із `width: max-content` і `white-space: nowrap` на комірках журналу; нові картки з `overflow-wrap: anywhere`. Додати `.analysis-session-card` і `.analysis-journal-card` / `.analysis-metric-card` як стек на кшталт `.board-kpi`.
  Done-when: `AnalysisDetailsModal.vue` не містить `analysis-journal-scroll`; у `src/styles.css` немає одночасного контракту `overflow-x: auto` + `nowrap` + `max-content` для журналу аналізу; `npm run lint` завершується з кодом 0.

## 5. Шухляда деталей проєкту

- [x] 5.1 Секції шухляди картками з бейджами
  Files: src/components/ProjectDetailPanel.vue, src/styles.css
  Do: `<script setup>` без Options API і коментарів. Не змінювати props/emits, Escape, клік `.board-detail-overlay`, фокус на «Закрити», `role="dialog"` / `aria-modal="true"`, тексти «Завантаження деталей…» / «немає файлу» / «Немає даних про коміт» / «Оновити деталі». Заголовок: лишити `.badge` провайдера; для кожної зміни в `headerChanges` показати `nextRole`, вердикт (класи `.badge-verdict-approve` / `.badge-verdict-changes` / `.badge-verdict-reject` за значенням) і blocked як `.badge-blocked`. Head коміта обгорнути в `<article class="board-detail-card">`. Кожну активну зміну збагачення — `<article class="board-detail-card">` з `h3` імені та секціями Задачі (disabled чекбокси), Handoff, Review, Proposal, Decisions, Design. У `src/styles.css` додати `.board-detail-card` візуально як `.board-kpi` (падінг, білий фон, бордер, радіус). Не імпортувати `AnalysisLoadingOverlay`. Не читати `metrics.json`.
  Done-when: `ProjectDetailPanel.vue` містить `board-detail-card` і `badge-verdict`; лишає `role="dialog"` і «Завантаження деталей…»; `src/styles.css` містить `.board-detail-card`; `npm run lint` завершується з кодом 0.

## 6. Тести UI

- [x] 6.1 Оновити тести списку аналізу під картки та оверлей
  Files: src/views/AnalysisView.spec.js
  Do: Замінити хелпери `columnText` / `columnTitle`, що читають `thead th` / `tbody td`, на пошук тексту в `.analysis-change-card` (або `wrapper.text()`). Прибрати очікування `analysis-table__stack-cell`. Лишити кейси фільтра архіву, «триває» + tooltip, `≈ $0.42` / billed tooltip, навігацію `aria-label="Деталі метрик"` на `analysis-details`, відсутність заголовків колонок «Агенти» і «Платформи». Додати кейс: після завантаження карток немає `.analysis-loading-overlay` (або `visible` хибне). Не викликати `usePoller`.
  Done-when: файл не читає `thead th` для колонок таблиці аналізу; містить `analysis-change-card` або еквівалентну перевірку карток; `npm run lint` завершується з кодом 0.

- [x] 6.2 Оновити тести модалки деталей під картки та pending
  Files: src/components/AnalysisDetailsModal.spec.js
  Do: Прибрати `expect(wrapper.findAll('.analysis-journal-scroll')).toHaveLength(5)` (обидва місця). Замінити пошук `.analysis-journal-table` на картки/текст. Кейс `pending: null` (unknown journal): текст MUST NOT містити `Журнал · статус`, `Журнал · роль pending`, `Журнал · pending з`, `Журнал · pending платформа`, `Журнал · pending thread`, `Журнал · pending клієнт`; інші підписи журналу й `—` для totals лишаються. Кейс kit 0.8.0 pending: підписи pending, `amp-threads-list`, thread, `адаптер`, `amp-cli` лишаються. Додати кейс сесії без `threadId` і `tasks` — немає окремого порожнього рядка thread. Лишити київські дати, Amp credits, `≈ $0.42`, відсутність `role="dialog"` і `1–5`.
  Done-when: файл не очікує `.analysis-journal-scroll` довжини 5; містить перевірку відсутності pending-підписів при `pending: null`; `npm run lint` завершується з кодом 0.

- [x] 6.3 Покрити оверлей на сторінці деталей
  Files: src/views/AnalysisDetailsView.spec.js
  Do: Лишити кейс full-page «Деталі метрик» / «Назад» / немає `role="dialog"`. Додати кейс: відкладений `listChanges`, mount deep-link — поки pending, є `.analysis-loading-overlay` (або текст «Завантаження аналізу…» всередині оверлею). Додати кейс: попередньо `useAnalysisStore().rows` містить рядок цього `projectId` і `changeRef` — після mount без завершеного нового fetch оверлей відсутній і видно вміст деталей.
  Done-when: файл містить кейс оверлею на холодному deep-link і кейс без оверлею при вже наявних рядках; `npm run lint` завершується з кодом 0.

- [x] 6.4 Оновити тести шухляди під картки
  Files: src/components/ProjectDetailPanel.spec.js
  Do: Не видаляти кейси overlay click, Escape, «Закрити», `role="dialog"`, фокус, «Завантаження деталей…», empty placeholders, «Оновити деталі». Додати кейс зі `headerChanges` з `verdict: 'APPROVE'` і `details.changes['add-login']` з `taskList` — є `.board-detail-card`, `.badge-verdict-approve`, чекбокс задачі, секція `Handoff`.
  Done-when: файл містить `board-detail-card` і `badge-verdict-approve`; чинні close/dialog кейси лишаються; `npm run lint` завершується з кодом 0.

## 7. Перевірка

- [x] 7.1 Лінт змінених файлів
  Files: src/stores/analysis.js, src/stores/analysis.spec.js, src/views/AnalysisView.vue, src/views/AnalysisView.spec.js, src/views/AnalysisDetailsView.vue, src/views/AnalysisDetailsView.spec.js, src/components/AnalysisDetailsModal.vue, src/components/AnalysisDetailsModal.spec.js, src/components/ProjectDetailPanel.vue, src/components/ProjectDetailPanel.spec.js, src/styles.css, new file: src/components/AnalysisLoadingOverlay.vue
  Do: Виконати `npm run lint` і виправити помилки ESLint лише в цих файлах (плюс новий overlay). Не додавати TypeScript і не писати коментарі. Не редагувати `src/stores/board.js`, `src/composables/usePoller.js`, `src/utils/changeMetrics.js`, `src/views/BoardView.vue`.
  Done-when: `npm run lint` завершується з кодом 0; `src/utils/changeMetrics.js` і `src/composables/usePoller.js` без змін цієї задачі.
