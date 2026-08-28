# Tasks: add-factory-board

## 1. Середовище

- [x] 1.1 Додати env-змінні борду в приклад конфігурації
  Files: .env.example
  Do: додати рядки `VITE_GITHUB_TOKEN=`, `VITE_GITLAB_TOKEN=`, `VITE_GITLAB_BASE_URL=https://gitlab.com`, `VITE_POLL_INTERVAL_MS=60000`; над кожним — однорядковий `#`-коментар із призначенням; для токенів дописати пораду використовувати read-only/fine-grained токени.
  Done-when: `.env.example` містить усі чотири змінні; `npm run build` завершується успішно.

## 2. Парсери артефактів

- [x] 2.1 Створити чисті функції парсингу OpenSpec-артефактів
  Files: new file: src/utils/openspecParsers.js
  Do: експортувати `parseTasksProgress(text)` → `{ done, total }` (total — збіги `/^\s*- \[[ xX]\]/gm`, done — `/^\s*- \[[xX]\]/gm`, `null`/порожній текст → `{ done: 0, total: 0 }`); `parseHandoff(text)` → `{ nextCommand, nextRole, blocked }` лояльними построковими регексами виду `/next command\**:?\s*(.+)/i`, `/next role\**:?\s*(.+)/i`, `/blocked\**:?\s*(.+)/i`, значення blocked `none`/`немає`/`-`/порожнє → `null`, нерозпізнані поля → `null`; `parseReviewVerdict(text)` → `'REJECT' | 'REQUEST CHANGES' | 'APPROVE' | null` за регексами `/reject(ed)?/i`, `/request[ _-]?changes/i`, `/approved?/i` з пріоритетом REJECT → REQUEST CHANGES → APPROVE.
  Done-when: модуль експортує три функції; `npm run lint` проходить без помилок.

- [x] 2.2 Покрити парсери юніт-тестами
  Files: new file: src/utils/openspecParsers.spec.js
  Do: Vitest-тести: tasks-текст із 7 чекбоксів (3 з `[x]`) → `{ done: 3, total: 7 }`; порожній текст і `null` → `{ done: 0, total: 0 }`; handoff із `Next command: /opsx:apply add-login`, `Next role`, `Blocked: чекаємо токен` → відповідні значення; handoff без полів → усі `null`; blocked зі значенням `none` → `null`; окремі тексти з APPROVE / REQUEST CHANGES / REJECT та текст, що містить і APPROVE, і REJECT (очікування `REJECT`); `null` → `null`.
  Done-when: `npm test` зелений.

## 3. API-клієнти провайдерів

- [x] 3.1 Додати фабрику HTTP-інстансів
  Files: src/api/http.js
  Do: додати іменований експорт `createHttp({ baseURL, headers })`, що повертає `axios.create({ baseURL, headers, timeout: 30_000 })`; наявний default export залишити без змін.
  Done-when: `import { createHttp } from '@/api/http'` працює; після виконання 3.2 і 3.3 обидва клієнти провайдерів виконують усі HTTP-запити виключно через `createHttp`; `npm test` не зламаний.

- [x] 3.2 Створити клієнт GitHub
  Files: new file: src/api/github.js
  Do: усі HTTP-запити виконувати через Axios-інстанс `createHttp({ baseURL: 'https://api.github.com', headers })` з `src/api/http.js` — використання `fetch` заборонене; експортувати `listChanges(project)`: `GET /repos/{project.repo}/contents/openspec/changes?ref={project.branch}` → імена елементів із `type === 'dir'` крім `archive`; при 404 на цьому листингу виконати перевірку `GET /repos/{project.repo}/branches/{project.branch}`: успіх перевірки → повернути `[]` (шлях `openspec/changes` відсутній — активних змін немає), 404 перевірки → кинути первинну помилку листингу (репозиторій або гілку не знайдено; нормалізується в `not-found` у 3.4), інша помилка перевірки → кинути її; `fetchArtifact(project, changeName, fileName)`: `GET /repos/{project.repo}/contents/openspec/changes/{changeName}/{fileName}?ref={branch}` із заголовком `Accept: application/vnd.github.raw+json` → текст відповіді, 404 → `null`; додавати заголовок `Authorization: Bearer <token>` коли токен є (`project.token` або `import.meta.env.VITE_GITHUB_TOKEN`).
  Done-when: модуль експортує `listChanges` і `fetchArtifact`; усі запити йдуть через `createHttp`, `fetch` у файлі відсутній; `npm run lint` проходить.

- [x] 3.3 Створити клієнт GitLab
  Files: new file: src/api/gitlab.js
  Do: base = `project.baseUrl || import.meta.env.VITE_GITLAB_BASE_URL || 'https://gitlab.com'`, id = `encodeURIComponent(project.repo)`; усі HTTP-запити виконувати через Axios-інстанс `createHttp({ baseURL: base, headers })` з `src/api/http.js` — використання `fetch` заборонене; `listChanges(project)`: `GET /api/v4/projects/{id}/repository/tree?path=openspec/changes&ref={branch}&per_page=100` → імена елементів із `type === 'tree'` крім `archive`; при 404 на цьому листингу виконати перевірку `GET /api/v4/projects/{id}/repository/branches/{branch}`: успіх перевірки → повернути `[]` (шлях `openspec/changes` відсутній — активних змін немає), 404 перевірки → кинути первинну помилку листингу (проєкт або гілку не знайдено; нормалізується в `not-found` у 3.4), інша помилка перевірки → кинути її; `fetchArtifact(project, changeName, fileName)`: `GET /api/v4/projects/{id}/repository/files/{encodeURIComponent('openspec/changes/'+changeName+'/'+fileName)}/raw?ref={branch}` → текст, 404 → `null`; заголовок `PRIVATE-TOKEN: <token>` коли токен є (`project.token` або `import.meta.env.VITE_GITLAB_TOKEN`).
  Done-when: модуль експортує `listChanges` і `fetchArtifact`; усі запити йдуть через `createHttp`, `fetch` у файлі відсутній; `npm run lint` проходить.

- [x] 3.4 Створити диспетчер провайдерів і нормалізацію помилок
  Files: new file: src/api/providers.js
  Do: експортувати `getProviderClient(provider)` → модуль github або gitlab (інше значення → кидає Error); `normalizeProviderError(error)` → `{ code, message }`: 401 → `auth`; 429 → `rate-limit`; 403 → `rate-limit`, якщо заголовок `x-ratelimit-remaining` дорівнює `'0'`, інакше `auth`; 404 → `not-found`; відсутність `error.response` → `network`; `message` — коротке повідомлення українською для оператора.
  Done-when: модуль експортує обидві функції; `npm run lint` проходить.

## 4. Pinia-стори

- [x] 4.1 Створити стор реєстру проєктів
  Files: new file: src/stores/registry.js
  Do: setup-стор `useRegistryStore`: state `projects` ініціалізується з localStorage за ключем `factory-board.projects.v1` через `try/catch` (битий JSON → `[]`); `addProject(data)` повертає явний результат: успіх → `{ ok: true, project }` (`id` — `crypto.randomUUID()`, запис додано до `projects`); відсутній provider/repo/branch → `{ ok: false, error: { code: 'required', message } }` без мутації списку; збіг `provider + repo + branch` із наявним записом → `{ ok: false, error: { code: 'duplicate', message } }` без мутації списку; `message` — готовий текст українською для показу оператору (для дубліката — повідомлення про дублікат); `updateProject(id, patch)` і `removeProject(id)`; кожна мутація серіалізує `projects` назад у localStorage.
  Done-when: тести 4.3 проходять (`npm test`).

- [x] 4.2 Створити стор стану борду
  Files: new file: src/stores/board.js
  Do: setup-стор `useBoardStore`: state `statuses`, `loading`, `errors`, `lastUpdated` — об'єкти за `project.id`; `refreshProject(project)`: на початку ставить `loading[project.id] = true`, весь цикл оновлення обгорнутий так, що у `finally` — `loading[project.id] = false`; через `getProviderClient` виконує `listChanges`, для кожної зміни тягне `handoff.md`, `tasks.md`, `review.md` і будує модель `{ changeName, nextCommand, nextRole, blocked, tasksDone, tasksTotal, verdict, updatedAt: Date.now() }` функціями з `src/utils/openspecParsers.js`; успіх → перезапис `statuses[id]`, `lastUpdated[id]`, очищення `errors[id]`; помилка → `errors[id] = normalizeProviderError(e)`, попередні `statuses[id]` зберігаються; `refreshAll(projects)` — `Promise.allSettled` по всіх проєктах.
  Done-when: тести 4.4 проходять (`npm test`).

- [x] 4.3 Покрити стор реєстру тестами
  Files: new file: src/stores/registry.spec.js
  Do: Vitest із `setActivePinia(createPinia())` і чищенням localStorage у `beforeEach`: додавання валідного проєкту → результат `{ ok: true }` і запис у `projects`; додавання без repo → `{ ok: false }` з `error.code === 'required'`, список не змінений; дублікат provider+repo+branch → `{ ok: false }` з `error.code === 'duplicate'` і непорожнім `error.message`, список не змінений; після додавання дані є в localStorage і відновлюються новим стором; битий JSON у ключі → стор стартує з порожнім списком.
  Done-when: `npm test` зелений.

- [x] 4.4 Покрити стор борду тестами
  Files: new file: src/stores/board.spec.js
  Do: Vitest із `vi.mock('@/api/providers')`: успішний `refreshProject` наповнює `statuses` моделлю з правильними `tasksDone/tasksTotal/verdict` і ставить `lastUpdated`; кейс loading: замокати `listChanges` незарезолвленим промісом (deferred) → поки проміс висить, `loading[id] === true`, після резолву й завершення `refreshProject` → `loading[id] === false`; помилка 401 → `errors[id].code === 'auth'`, `loading[id] === false` після завершення, попередній `statuses[id]` не затертий; `refreshAll` із двома проєктами, де один падає, оновлює другий.
  Done-when: `npm test` зелений.

## 5. Полер

- [x] 5.1 Створити composable полінгу
  Files: new file: src/composables/usePoller.js
  Do: `usePoller(callback, intervalMs = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 60000)` → `{ start, stop, refresh, isRunning }`: `start` ставить `setInterval`, `stop` його очищує; guard-прапорець: якщо попередній виклик `callback` ще виконується, черговий тік і `refresh` пропускаються; `refresh` запускає `callback` негайно поза розкладом.
  Done-when: тести 5.2 проходять (`npm test`).

- [x] 5.2 Покрити полер тестами
  Files: new file: src/composables/usePoller.spec.js
  Do: Vitest із `vi.useFakeTimers()`: після `start` і спливання інтервалу `callback` викликаний; поки перший виклик не зарезолвлений, наступний тік не запускає другий (лічильник викликів = 1); після `stop` тіки не викликають `callback`; `refresh` викликає `callback` негайно.
  Done-when: `npm test` зелений.

## 6. UI борду

- [x] 6.1 Створити форму проєкту
  Files: new file: src/components/ProjectForm.vue
  Do: `<script setup>`-компонент: поля provider (select `github`/`gitlab`), repo (`owner/repo`), branch (дефолт `main`), token, baseUrl (показувати лише для `gitlab`); prop `project` для режиму редагування; `defineEmits(['save', 'cancel'])`; при сабміті без provider/repo/branch показувати текст помилки біля поля і не емітити `save`.
  Done-when: `npm run build` проходить; у тесті 6.4 сабміт валідної форми емітить `save` з даними.

- [x] 6.2 Створити таблицю борду
  Files: new file: src/components/BoardTable.vue
  Do: презентаційний `<script setup>`-компонент із props `rows` (моделі змін із назвою проєкту) і `projectStates` (`loading`/`errors`/`lastUpdated` за project.id); колонки: Проєкт, Зміна, Наступна команда, Задачі (`n/m`), Вердикт, Оновлено, Статус; коли `projectStates.loading[project.id]` істинний — у колонці Статус рядків цього проєкту показувати індикатор завантаження (текст «оновлюється…»); у колонці Статус — бейдж blocked із причиною або бейдж помилки з `message`; для проєкту без змін — рядок «немає активних змін»; кнопки редагування/видалення проєкту емітять `edit`/`remove` з project.id; невизначені значення показувати як `—`.
  Done-when: `npm run build` проходить; рендеринг рядків, бейджів та індикатора завантаження перевіряється тестом 6.4.

- [x] 6.3 Зібрати BoardView
  Files: src/views/BoardView.vue
  Do: замінити заглушку, зберігши заголовок `Factory board` (його очікує наявний тест src/App.spec.js): підключити `useRegistryStore`, `useBoardStore`, `usePoller(() => boardStore.refreshAll(registryStore.projects))`; `onMounted` → `start()` і перший `refresh()`, `onUnmounted` → `stop()`; кнопка «Оновити» → `refresh()`; кнопка «Додати проєкт» відкриває `ProjectForm` без prop `project`; подія `save` у режимі додавання → `addProject(data)`: при `{ ok: true }` закрити форму і викликати `refresh()`, при `{ ok: false }` форму не закривати і показати `error.message` (зокрема повідомлення про дублікат) поруч із формою; подія `edit` таблиці → відкрити `ProjectForm` із prop `project` (обраний за id запис реєстру); подія `save` у режимі редагування → `updateProject(project.id, patch)`, закрити форму, викликати `refresh()`; `cancel` → закрити форму без змін; подія `remove` → `removeProject(id)`; порожній реєстр → «Немає зареєстрованих проєктів.»; рядки таблиці — computed із `projects` і `statuses`.
  Done-when: тест 6.4 зелений; `npm run build` проходить.

- [x] 6.4 Інтеграційний тест BoardView
  Files: new file: src/views/BoardView.spec.js
  Do: Vitest + @vue/test-utils: mount BoardView з `createPinia()` і `vi.mock('@/api/providers')`; кейс порожнього реєстру → текст «Немає зареєстрованих проєктів.»; кейс: додати проєкт у registry-стор, замокати `listChanges` → `['add-login']` і `fetchArtifact` → фікстури handoff/tasks/review, викликати refresh і дочекатися оновлення → таблиця містить рядок `add-login` із прогресом `3/7` і вердиктом; кейс дубліката: сабміт `ProjectForm` із provider/repo/branch уже зареєстрованого проєкту → повідомлення про дублікат видиме в DOM, проєкт не додано до реєстру; кейс помилки 401 → у рядку проєкту бейдж помилки авторизації.
  Done-when: `npm test` зелений.

- [x] 6.5 Додати стилі борду
  Files: src/styles.css
  Do: додати стилі таблиці (`.board-table`: повна ширина, роздільники рядків, вирівнювання), бейджів статусу (`.badge`, модифікатори blocked/error/verdict із різними кольорами), форми проєкту (`.project-form`: сітка полів, кнопки) і кнопок тулбара борду; лишити чинні базові стилі без змін.
  Done-when: `npm run build` проходить; таблиця, бейджі та форма мають окремі стилі в зібраному CSS.

## 7. Фінальна перевірка

- [x] 7.1 Лінт усього проєкту
  Files: package.json
  Do: виконати `npm run lint`; виправити всі помилки ESLint у доданих і змінених файлах.
  Done-when: `npm run lint` завершується з кодом 0.

- [x] 7.2 Повний прогін тестів
  Files: package.json
  Do: виконати `npm test`; переконатися, що всі сьюти (парсери, стори, полер, BoardView, App) зелені.
  Done-when: `npm test` завершується з кодом 0.

- [x] 7.3 Продакшн-збірка
  Files: package.json
  Do: виконати `npm run build`; переконатися, що збірка Vite завершується без помилок і попереджень про нерозв'язані імпорти.
  Done-when: `npm run build` завершується з кодом 0.
