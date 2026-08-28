# Tasks: board-project-details

## 1. Парсери та відносний час

- [x] 1.1 Додати парсери уривків і списку задач
  Files: src/utils/openspecParsers.js
  Do: залишити експорти `parseTasksProgress`, `parseHandoff`, `parseReviewVerdict` без зміни сигнатур; додати `parseTaskList(text)` → масив `{ text, done }` з рядків `/^\s*- \[([ xX])\]\s*(.*)$/gm` (`done`, якщо маркер `x` або `X`, `text` — група 2 після trim), `null`/порожній рядок → `[]`; `parseProposalExcerpt(text)` → `{ title, why }`, `title` з першого `/^#\s+(.+)/m` інакше перший непорожній рядок інакше `null`, `why` — текст після `/^##\s*Why\b/im` до наступного `/^##\s/m`, trim, обрізати до 500 символів, немає Why → `why: null`; `parseDecisionsExcerpt(text)` → рядок без першого H1, trim, обрізати до 500, порожньо/`null` → `null`; `parseReviewExcerpt(text)` → trim, обрізати до 500, порожньо/`null` → `null`; `parseHandoffDetails(text)` → `{ nextCommand, nextRole, blocked, done }`, перші три з `parseHandoff(text)`, `done` з однорядкового `/done\**:?\s*(.+)/i` або тіла після `/^##?\s*Done\b/im` до наступного heading, значення `none`/`немає`/`-`/порожнє → `null`.
  Done-when: модуль експортує `parseTaskList`, `parseProposalExcerpt`, `parseDecisionsExcerpt`, `parseReviewExcerpt`, `parseHandoffDetails` на додачу до трьох наявних функцій; `npm run lint` завершується з кодом 0.

- [x] 1.2 Покрити нові парсери тестами
  Files: src/utils/openspecParsers.spec.js
  Do: додати Vitest-кейси: `parseTaskList` для `- [x] first` і `- [ ] second` → `[{ text: 'first', done: true }, { text: 'second', done: false }]`; `null` і `''` → `[]`; `parseProposalExcerpt` з `# Title` і `## Why` абзацом довше 500 символів → `title === 'Title'` і `why.length === 500`; без `## Why` → `why === null`; `parseDecisionsExcerpt` обрізає до 500; `parseReviewExcerpt(null) === null`; `parseHandoffDetails` з `Done: research` і `Blocked: none` → `done === 'research'`, `blocked === null`; наявні тести `parseTasksProgress` / `parseHandoff` / `parseReviewVerdict` не змінювати за змістом очікувань.
  Done-when: `npm test` завершується з кодом 0.

- [x] 1.3 Додати форматування відносного часу
  Files: new file: src/utils/formatRelativeTime.js, new file: src/utils/formatRelativeTime.spec.js
  Do: експортувати `formatRelativeTime(value, now = Date.now())`: невалідна дата/`null` → рядок `—`; різниця `now - ts` < 60 с → `щойно`; < 60 хв → `{n} хв тому`; < 24 год → `{n} год тому`; інакше → `{n} дн. тому` (`n` — ціле від `Math.floor`). Тести: фіксований `now`, різниця 30 с / 5 хв / 3 год / 2 дні / `null`.
  Done-when: `npm test` завершується з кодом 0.

## 2. Клієнти провайдерів

- [x] 2.1 Додати `fetchBranchHead` у клієнт GitHub
  Files: src/api/github.js
  Do: експортувати `fetchBranchHead(project)`: HTTP лише через наявний `createHttp` (символ `fetch` у файлі відсутній); `GET /repos/${project.repo}/commits/${encodeURIComponent(project.branch)}` з тими самими заголовками автентифікації, що й `listChanges`; успіх → `{ sha: data.sha, message: перший рядок data.commit.message, author: data.commit.author.name, date: data.commit.author.date, url: data.html_url }`; статус 404 або 409 → `null`; інші помилки — `throw`. `listChanges` і `fetchArtifact` не змінювати.
  Done-when: модуль експортує `listChanges`, `fetchArtifact`, `fetchBranchHead`; `npm run lint` завершується з кодом 0.

- [x] 2.2 Додати `fetchBranchHead` у клієнт GitLab
  Files: src/api/gitlab.js
  Do: експортувати `fetchBranchHead(project)`: HTTP лише через `createHttp`; `GET /api/v4/projects/${encodeURIComponent(project.repo)}/repository/commits` з `params: { ref_name: project.branch, per_page: 1 }`; порожній масив або статус 404 → `null`; інакше перший елемент `{ sha: item.id, message: item.title || перший рядок item.message, author: item.author_name, date: item.authored_date || item.created_at, url: item.web_url }`; інші помилки — `throw`. `listChanges` і `fetchArtifact` не змінювати.
  Done-when: модуль експортує `listChanges`, `fetchArtifact`, `fetchBranchHead`; `npm run lint` завершується з кодом 0.

## 3. Стор борду

- [x] 3.1 Додати стан і дію деталей проєкту
  Files: src/stores/board.js
  Do: у setup-сторі додати reactive-об’єкти `details`, `detailsLoading`, `detailsError` за `project.id`; додати `loadProjectDetails(project)`: на старті `detailsLoading[id] = true`, у `finally` — `false`; імена змін брати лише з `statuses[id]` (пропустити записи без `changeName`); порожній або відсутній `statuses[id]` → `changes: {}` і все одно викликати `fetchBranchHead(project)`; MUST NOT викликати `listChanges` з `loadProjectDetails`; через `getProviderClient` паралельно викликати `fetchBranchHead(project)` і для кожного `changeName` `fetchArtifact` для `tasks.md`, `handoff.md`, `review.md`, `proposal.md`, `decisions.md`, `design.md`; зібрати `details[id] = { branchHead, changes: { [changeName]: { taskList: parseTaskList(tasks), handoff: parseHandoffDetails(handoff), reviewExcerpt: parseReviewExcerpt(review), proposal: parseProposalExcerpt(proposal), decisionsExcerpt: parseDecisionsExcerpt(decisions), designExcerpt: parseReviewExcerpt(design) } } }` (для `design.md` використати `parseReviewExcerpt` як обрізання до 500 символів); `branchHead === null` не пише `detailsError`; не-404 виняток → `detailsError[id] = normalizeProviderError(e)` без зміни `errors[id]`, `loading[id]`, `statuses[id]`; успіх очищує `detailsError[id]`. `refreshProject` і `refreshAll` MUST NOT викликати `loadProjectDetails`, `fetchBranchHead` і `fetchArtifact` для `proposal.md` / `decisions.md` / `design.md`. Повернути нові поля зі стора.
  Done-when: стор експортує `details`, `detailsLoading`, `detailsError`, `loadProjectDetails`, `refreshProject`, `refreshAll`; `npm run lint` завершується з кодом 0.

- [x] 3.2 Покрити `loadProjectDetails` і ізоляцію від полінгу
  Files: src/stores/board.spec.js
  Do: розширити `createClient` моком `fetchBranchHead: vi.fn().mockResolvedValue({ sha: 'abc1234deadbeef', message: 'fix', author: 'Ada', date: '2026-08-01T00:00:00Z', url: 'https://example.com/commit' })`; кейс: після `refreshProject` викликати `loadProjectDetails` → `details[id].branchHead.sha` задано, `details[id].changes['add-login'].taskList` має 7 елементів, `fetchArtifact` отримав `'proposal.md'`; кейс: `fetchArtifact` для `proposal.md` → `null` → `proposal.title === null`, `detailsError[id]` відсутній; кейс: `fetchBranchHead` → `null` → `branchHead === null`, `detailsError` відсутній; кейс: `fetchBranchHead` reject з `response.status = 401` → `detailsError[id].code === 'auth'`, `errors[id]` не змінений (попередньо виставити `errors[id] = { code: 'network', message: 'x' }`); кейс: після `refreshProject` `fetchBranchHead` не викликано і `fetchArtifact.mock.calls` не містить `proposal.md` / `decisions.md` / `design.md`; кейс loading: deferred `fetchBranchHead` → до резолву `detailsLoading[id] === true`, після — `false`.
  Done-when: `npm test` завершується з кодом 0.

## 4. Таблиця огляду

- [x] 4.1 Оновити колонки `BoardTable` і подію деталей
  Files: src/components/BoardTable.vue, new file: src/components/BoardTable.spec.js
  Do: додати `defineEmits` подію `details`; заголовок колонки команди замінити на `Фаза`; у комірці фази показати `nextRole` або `—`, а `nextCommand` — у `title` комірки і другим рядком з класом `board-table__command-secondary`, якщо значення є; у задачах залишити `n/m` і додати `<progress>` з `:max="row.tasksTotal"` `:value="row.tasksDone"` лише коли `tasksTotal > 0`; вердикт: класи `badge-verdict-approve` / `badge-verdict-changes` / `badge-verdict-reject` для `APPROVE` / `REQUEST CHANGES` / `REJECT`; колонку Оновлено заповнити `formatRelativeTime(...)` з `src/utils/formatRelativeTime.js`, атрибут `title` — точний `toLocaleString()`; на першому рядку групи додати кнопку `Деталі`; на `span.board-table__repo` поставити `tabindex="-1"`; у `@click` кнопки «Деталі» і span викликати `event.currentTarget.focus()` і лише тоді `emit('details', projectId)` (payload — лише id, без DOM-вузла); кнопки Редагувати/Видалити лишити лише на першому рядку групи. Тест VTU: рядок з `nextRole`, `nextCommand`, `tasksDone: 3`, `tasksTotal: 7`, `verdict: 'APPROVE'` показує `Implementer`, `3/7`, `progress`, бейдж APPROVE; клік «Деталі» емітить `details` з id; клік по підпису repo емітить `details`; span repo має `tabindex="-1"`.
  Done-when: `npm test` завершується з кодом 0.

## 5. Стилі огляду та панелі

- [x] 5.1 Закріпити fluid-лейаут і стилі KPI, фільтрів, вердиктів, drawer
  Files: src/styles.css
  Do: `.board` — `display: flex; flex-direction: column; width: 100%; max-width: none; min-height: 100vh; min-height: 100dvh` без правила `max-width: 72rem`; `.board-table-wrap` — `flex: 1 1 auto; width: 100%; min-height: 0; overflow: auto`; `.board-table` — `width: 100%; min-width: 56rem`; колонки `tasks`/`verdict`/`updated`/`actions` — `width: 1%; white-space: nowrap`; додати `.board-kpis` (сітка чотирьох карток), `.board-filters` (рядок пошуку, select, чіпів), `.board-filter-chip` з модифікатором активного стану, `.badge-verdict-approve` фон `#dcfce7` колір `#166534`, `.badge-verdict-changes` фон `#fef3c7` колір `#92400e`, `.badge-verdict-reject` фон `#fee2e2` колір `#991b1b`; `.board-detail-overlay` — `position: fixed; inset: 0; background: rgb(15 23 42 / 0.4); z-index: 40`; `.board-detail-panel` — `position: fixed; top: 0; right: 0; height: 100%; width: min(32rem, 100vw); overflow: auto; z-index: 41; background: #fff`; `.board-detail-progress` для `<progress>` у таблиці.
  Done-when: у `src/styles.css` немає `max-width: 72rem`; присутні класи `.board-kpis`, `.board-filters`, `.board-detail-overlay`, `.board-detail-panel`; `npm run build` завершується з кодом 0.

## 6. Панель деталей

- [x] 6.1 Створити `ProjectDetailPanel`
  Files: new file: src/components/ProjectDetailPanel.vue
  Do: `<script setup>` без Options API і без коментарів; props: `project` (Object, required), `headerChanges` (Array, default `[]`), `lastUpdated` (Number/null), `pollError` (Object/null), `details` (Object/null), `detailsLoading` (Boolean), `detailsError` (Object/null); emits `close`, `refresh-details`; корінь — `div.board-detail-overlay` (@click.self емітить `close`) плюс `aside.board-detail-panel` з `role="dialog"` `aria-modal="true"` `aria-labelledby` на заголовок; кнопка «Закрити» з `ref` і `onMounted` → `focus()`; `onUnmounted` знімає слухач; `window` `keydown` Escape → emit `close`; заголовок: бейдж `project.provider`, `project.repo`, `project.branch`, відносний час `lastUpdated`, текст `pollError.message` якщо є, список `headerChanges` (changeName, nextRole, n/m, verdict, blocked); якщо `detailsLoading` — текст «Завантаження деталей…»; якщо `detailsError` — банер з `detailsError.message`; секція коміта з `details.branchHead` (sha перші 7, message, author, date, посилання `url` з `target="_blank"` `rel="noopener noreferrer"`) або «Немає даних про коміт»; для кожного ключа `details.changes` — чекбокс-список `taskList`, поля handoff (nextCommand, nextRole, done, blocked), `reviewExcerpt`, proposal title/why, `decisionsExcerpt`, `designExcerpt`; порожнє поле — текст «немає файлу» без банера помилки; кнопка «Оновити деталі» емітить `refresh-details`.
  Done-when: `npm run build` завершується з кодом 0.

- [x] 6.2 Покрити панель тестами open/close і порожніх секцій
  Files: new file: src/components/ProjectDetailPanel.spec.js
  Do: VTU `mount` з `attachTo: document.body`; мінімальний `project: { id: 'p1', provider: 'github', repo: 'acme/shop', branch: 'main' }`; клік по overlay (елемент `.board-detail-overlay`) емітить `close`; кнопка «Закрити» емітить `close`; `keydown` Escape на `window` емітить `close`; `aside` має `role="dialog"` і `aria-modal="true"`; після mount `document.activeElement` — кнопка «Закрити»; при `detailsLoading: true` видимий текст «Завантаження деталей…»; при `details: { branchHead: null, changes: { 'add-login': { taskList: [], handoff: { nextCommand: null, nextRole: null, blocked: null, done: null }, reviewExcerpt: null, proposal: { title: null, why: null }, decisionsExcerpt: null, designExcerpt: null } } }` видимий «Немає даних про коміт» і «немає файлу», банер помилки відсутній; клік «Оновити деталі» емітить `refresh-details`.
  Done-when: `npm test` завершується з кодом 0.

## 7. BoardView: KPI, фільтри, деталі

- [x] 7.1 Зібрати KPI, фільтри та панель у `BoardView`
  Files: src/views/BoardView.vue
  Do: зберегти заголовок `Factory board`; додати computed KPI: `projectCount` = довжина `registryStore.projects`, `activeChangeCount` = сума `statuses[id].length` по проєктах (ігнорувати порожні імена), `blockedCount` = кількість моделей зі справжнім `blocked`, `errorCount` = кількість ключів у `boardStore.errors`; відрендерити `.board-kpis` з підписами «Проєкти», «Активні зміни», «Заблоковані», «Помилки»; додати стан фільтрів `searchQuery` (рядок), `providerFilter` (`'' | 'github' | 'gitlab'`), `blockedOnly` і `errorOnly` (boolean); computed `filteredRows` фільтрує `rows` без HTTP: підрядок `searchQuery` (без регістру) у `projectLabel` або `changeName`, провайдер з запису реєстру, `blockedOnly` лишає рядки з `blocked`, `errorOnly` — рядки з `projectStates.errors[projectId]`; KPI рахувати з повного стану, не з `filteredRows`; якщо є проєкти і `filteredRows.length === 0` — показати «Немає рядків за фільтром.» і не монтувати порожню таблицю без цього тексту; передати в `BoardTable` відфільтровані рядки; тригер фокуса — змінна `let detailsTriggerEl = null` у `<script setup>` (не в сторі); обробник `@details`: `detailsTriggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null`, потім `selectedProjectId = id`, якщо `details[id]` відсутній — `boardStore.loadProjectDetails(project)`; єдина функція `closePanel`: `selectedProjectId = null`, далі `nextTick` з `vue` — якщо `detailsTriggerEl instanceof HTMLElement` і `detailsTriggerEl.isConnected` і `typeof detailsTriggerEl.focus === 'function'` викликати `detailsTriggerEl.focus()`, потім `detailsTriggerEl = null`; `@close` панелі MUST викликати лише `closePanel` (клік overlay, Escape і «Закрити» йдуть через цей emit — окремих гілок без `focus()` немає); зміна проєкту при відкритій панелі MUST NOT викликати `closePanel` — перезаписати `detailsTriggerEl` з `document.activeElement`, замінити id і завантажити деталі, якщо кешу немає; `usePoller(() => boardStore.refreshAll(registryStore.projects))` без виклику `loadProjectDetails`; коли `selectedProjectId` не null — `Teleport to="body"` з `ProjectDetailPanel` (project з реєстру, headerChanges зі `statuses`, lastUpdated, pollError, details, detailsLoading, detailsError), `@close="closePanel"`, `@refresh-details` викликає `loadProjectDetails`; фільтри: `input` пошуку (placeholder «Пошук за репозиторієм або зміною»), `select` («Усі» / `github` / `gitlab`), кнопки-чіпи «Blocked» і «Помилка».
  Done-when: `npm run build` завершується з кодом 0.

- [x] 7.2 Тест: extra-артефакти лише після відкриття деталей
  Files: src/views/BoardView.spec.js
  Do: mount `BoardView` з `attachTo: document.body` у кейсах з панеллю; у `createClient` додати `fetchBranchHead: vi.fn().mockResolvedValue(null)`; після mount і `flushPromises` (полінг на `onMounted`) очікувати, що `fetchBranchHead` не викликано і жоден `fetchArtifact` call не має третього аргументу `proposal.md`, `decisions.md` або `design.md`; клік «Деталі» → `flushPromises` → `fetchBranchHead` викликано хоча б раз і `fetchArtifact` викликано з `'proposal.md'`; панель (`.board-detail-panel` або `role="dialog"`) існує після кліку і зникає після кліку «Закрити»; окремий кейс повернення фокуса: `const detailsBtn = wrapper.findAll('button').find((b) => b.text() === 'Деталі')`, `const trigger = detailsBtn.element`, `await detailsBtn.trigger('click')`, `await flushPromises()`, `await wrapper.findAll('button').find((b) => b.text() === 'Закрити').trigger('click')`, `await nextTick()` з `vue` і `await flushPromises()`, очікувати `document.activeElement === trigger`; наявні кейси порожнього реєстру, рядка `add-login` з `3/7`, дубліката і 401 лишити зеленими; у `afterEach` `document.body.innerHTML = ''`.
  Done-when: `npm test` завершується з кодом 0.

## 8. Фінальна перевірка

- [x] 8.1 Лінт усього проєкту
  Files: package.json
  Do: виконати `npm run lint`; виправити всі помилки ESLint у файлах, змінених цією зміною.
  Done-when: `npm run lint` завершується з кодом 0.

- [x] 8.2 Повний прогін тестів
  Files: package.json
  Do: виконати `npm test`; усі сьюти (парсери, formatRelativeTime, стор борду, BoardTable, ProjectDetailPanel, BoardView, наявні App/registry/poller) зелені.
  Done-when: `npm test` завершується з кодом 0.

- [x] 8.3 Продакшн-збірка
  Files: package.json
  Do: виконати `npm run build`; збірка Vite завершується без помилок і без нерозв’язаних імпортів.
  Done-when: `npm run build` завершується з кодом 0.
