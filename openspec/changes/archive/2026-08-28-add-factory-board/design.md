# Design: add-factory-board

## Context

Мотивація — див. `proposal.md` → Why. Поточний стан: скелет Vite + Vue 3 (`src/main.js`, `src/App.vue`, роут `/` → `src/views/BoardView.vue`-заглушка), голий Axios-інстанс у `src/api/http.js`, Pinia підключена в `main.js`, але сторів немає. Бекенда немає і не буде у v1: браузер оператора напряму викликає REST API GitHub/GitLab. Обмеження стеку: Vue 3 Composition API `<script setup>`, Pinia, Axios, чистий JavaScript, без коментарів у коді.

## Goals / Non-Goals

**Goals:**

- Мінімальна архітектура: два Pinia-стори, два провайдер-клієнти зі спільним інтерфейсом, чисті функції-парсери, один composable-полер.
- Кожен шар тестується ізольовано (парсери й стори — юніт-тести Vitest із замоканими клієнтами).
- Помилки провайдера нормалізуються в один формат і живуть у стані проєкту, а не в глобальному стані.

**Non-Goals:**

- Кешування через ETag/conditional requests, пагінація понад 100 елементів дерева — відкладено.
- Роутинг на детальні сторінки зміни/проєкту — v1 має один вигляд.
- Шифрування токенів у localStorage — прийняте обмеження single-operator.

## Decisions

### D1. Два стори: `registry` і `board`

`src/stores/registry.js` — CRUD записів проєктів і персистенція; `src/stores/board.js` — стани опитування (`statuses`, `loading`, `errors`, `lastUpdated` per project) і дії `refreshProject` / `refreshAll`. Альтернатива — один стор — відхилена: реєстр змінюється рідко й персиститься, стан борду — волатильний і персистенції не потребує.

### D2. Модель запису проєкту та персистенція

Запис: `{ id, provider: 'github'|'gitlab', repo: 'owner/repo', branch, token?, baseUrl? }`; `id` — `crypto.randomUUID()`. Ключ localStorage: `factory-board.projects.v1` (JSON-масив). Читання при ініціалізації стора обгорнуте в `try/catch`: битий JSON → порожній масив. Дублікат = збіг `provider + repo + branch`.

### D3. Env-змінні

- `VITE_GITHUB_TOKEN` — токен GitHub за замовчуванням.
- `VITE_GITLAB_TOKEN` — токен GitLab за замовчуванням.
- `VITE_GITLAB_BASE_URL` — база GitLab, дефолт `https://gitlab.com` (self-hosted перекривається тут або полем `baseUrl` запису).
- `VITE_POLL_INTERVAL_MS` — інтервал полінгу, дефолт `60000`.

Пріоритет токена: `project.token` → env-токен провайдера → без автентифікації. Пріоритет бази GitLab: `project.baseUrl` → `VITE_GITLAB_BASE_URL` → `https://gitlab.com`.

### D4. Провайдер-клієнти зі спільним інтерфейсом

`src/api/github.js` і `src/api/gitlab.js` експортують однаковий інтерфейс: `listChanges(project)` → `[changeName]`, `fetchArtifact(project, changeName, fileName)` → рядок або `null` при 404. `src/api/providers.js` віддає клієнт за `project.provider` і нормалізує помилки. `src/api/http.js` розширюється фабрикою `createHttp({ baseURL, headers })` (той самий timeout 30 000), default export лишається.

**GitHub** (`https://api.github.com`, заголовок `Authorization: Bearer <token>`):

- Список змін: `GET /repos/{owner}/{repo}/contents/openspec/changes?ref={branch}` → елементи з `type === 'dir'`, ім'я `archive` виключити.
- Файл: `GET /repos/{owner}/{repo}/contents/openspec/changes/{change}/{file}?ref={branch}` із заголовком `Accept: application/vnd.github.raw+json` → сирий текст.

**GitLab** (`{base}/api/v4`, заголовок `PRIVATE-TOKEN: <token>`, id проєкту — `encodeURIComponent('owner/repo')`):

- Список змін: `GET /projects/{id}/repository/tree?path=openspec/changes&ref={branch}&per_page=100` → елементи з `type === 'tree'`, крім `archive`.
- Файл: `GET /projects/{id}/repository/files/{encodeURIComponent(path)}/raw?ref={branch}` → сирий текст.

Альтернатива — GraphQL GitHub — відхилена: REST простіший, однаковий патерн для обох провайдерів, достатній для v1.

### D5. Нормалізація помилок

`normalizeProviderError(error)` → `{ code: 'auth'|'rate-limit'|'not-found'|'network', message }`: 401 → `auth`; 403/429 → `rate-limit` (для GitHub 403 перевіряється заголовок `x-ratelimit-remaining: 0`, інакше `auth`); 404 → `not-found`; без відповіді → `network`. Розрізнення 404: при 404 на листингу змін клієнт виконує одну перевірку існування гілки (GitHub `GET /repos/{owner}/{repo}/branches/{branch}`, GitLab `GET /projects/{id}/repository/branches/{branch}`); перевірка успішна → репозиторій і гілка існують, відсутній лише шлях `openspec/changes` → порожній список без помилки; перевірка теж повертає 404 → репозиторій або гілку не знайдено → клієнт кидає первинну помилку листингу, яка нормалізується в `not-found` рівня проєкту; інша помилка перевірки кидається як є. 404 на окремому файлі артефакту — не помилка проєкту (`null`). Альтернатива — беззастережний 404 → порожній список — відхилена: одрук у `owner/repo` чи гілці виглядав би як «немає активних змін» без жодного сигналу оператору.

### D6. Парсери артефактів — чисті функції

`src/utils/openspecParsers.js`:

- `parseTasksProgress(text)` → `{ done, total }`: total — збіги `/^\s*- \[[ xX]\]/gm`, done — `/^\s*- \[[xX]\]/gm`; порожній/`null` текст → `{ done: 0, total: 0 }`.
- `parseHandoff(text)` → `{ nextCommand, nextRole, blocked }`: лояльні регекси по рядках, напр. `/next command:?\**:?\s*(.+)/i`, `/next role:?\**:?\s*(.+)/i`, `/blocked:?\**:?\s*(.+)/i`; значення `none`/`немає`/`-`/порожнє для blocked → `null`; нерозпізнані поля → `null`.
- `parseReviewVerdict(text)` → `'APPROVE' | 'REQUEST CHANGES' | 'REJECT' | null`: перший збіг регексів `/approved?/i`, `/request[ _-]?changes/i`, `/reject(ed)?/i` у пріоритеті REJECT → REQUEST CHANGES → APPROVE (жорсткіший вердикт виграє, бо звіти часто містять слово approve у тексті критеріїв).

Модель стану зміни: `{ project, changeName, nextCommand, nextRole, blocked, tasksDone, tasksTotal, verdict, updatedAt }`; `updatedAt` — час завершення успішного фетчу (`Date.now()`), а не дата коміта: без додаткових запитів до API комітів.

### D7. Полер — composable `usePoller`

`src/composables/usePoller.js`: `usePoller(callback, intervalMs)` → `{ start, stop, refresh, isRunning }` на `setInterval` + guard-прапорець проти накладання циклів (якщо `callback` ще виконується — тік пропускається). `BoardView` викликає `start()` в `onMounted` і `stop()` в `onUnmounted`. Альтернатива — `setTimeout`-ланцюжок — не потрібна: guard дає той самий ефект простіше.

### D8. Композиція UI

`BoardView.vue` — контейнер: підключає стори, полер, кнопку «Оновити», форму і таблицю. `src/components/ProjectForm.vue` — форма додавання/редагування (`v-model`-поля, події `save`/`cancel`). `src/components/BoardTable.vue` — презентаційна таблиця (props: рядки, стани проєктів; події `edit`/`remove`). Стилі — доповнення `src/styles.css` (таблиця, бейджі статусів, форма); без UI-бібліотек.

## Risks / Trade-offs

- [Rate limit GitHub без токена — 60 запитів/год, а цикл робить 1 + 3×changes запитів на проєкт] → дефолтний інтервал 60 с, токени в `.env`, помилка `rate-limit` видима в рядку проєкту; ETag-кешування — кандидат на v1.1.
- [Токени в localStorage читаються будь-яким JS на сторінці] → прийнято для single-operator; рекомендація в `.env.example` — використовувати fine-grained/read-only токени.
- [Формат `handoff.md`/`review.md` не жорстко стандартизований між версіями kit] → лояльні регекси, нерозпізнане поле → `null` і `—` в UI замість помилки.
- [CORS: self-hosted GitLab може не дозволяти запити з браузера] → задокументовано в `.env.example`; gitlab.com і api.github.com віддають CORS-заголовки для REST API.
- [`per_page=100` без пагінації] → 100+ активних змін на проєкт поза реалістичним v1-сценарієм; зафіксовано як обмеження.

## Migration Plan

Нова функціональність без міграцій даних і зовнішніх контрактів. Розгортання — звичайний `npm run build`; відкат — revert коміта. Ключ localStorage версіонований (`.v1`), майбутня зміна схеми запису — новий ключ `.v2` з одноразовою конвертацією.
