# Spec Review

**Change:** add-factory-board
**Date:** 2026-08-28
**Cycle:** 2 (повторне рев'ю після виправлення B1–B5)
**Verdict:** APPROVE

## Tier

Tier 1 — детерміністичні перевірки пройдено батьківською сесією: `npx openspec validate "add-factory-board" --strict --type change` (exit 0), `npx agent-orchestrator-kit gate-check --review add-factory-board` (exit 0, «Tier 1 review passed»), `npx agent-orchestrator-kit gate-check --tasks add-factory-board` (exit 0, «all tasks follow the contract»).
Tier 2 — повний змістовий прохід `spec-reviewer`, другий цикл. Правки Architect торкнулися лише `tasks.md` (3.1–3.3, 4.1–4.4, 6.2–6.4) і `design.md` D5; `proposal.md`, delta-специфікації та `src/` не змінювались — звірено при читанні.

## Верифікація закриття блокерів першого циклу

### B1. Контракт відмови `addProject` — ЗАКРИТО

- `tasks.md` 4.1: `addProject(data)` повертає явний результат — успіх `{ ok: true, project }`; відсутній provider/repo/branch → `{ ok: false, error: { code: 'required', message } }` без мутації списку; збіг `provider + repo + branch` → `{ ok: false, error: { code: 'duplicate', message } }` без мутації; `message` — готовий текст українською для оператора.
- `tasks.md` 6.3: подія `save` у режимі додавання → при `{ ok: true }` закрити форму й `refresh()`, при `{ ok: false }` форму **не** закривати і показати `error.message` поруч із формою.
- Тести: 4.3 перевіряє `required` і `duplicate` (непорожній `error.message`, список не змінений); 6.4 має кейс дубліката через `ProjectForm` — «повідомлення про дублікат видиме в DOM, проєкт не додано до реєстру».
- Сценарії спеки `project-registry` «Відхилення неповного запису» і «Відхилення дубліката» тепер мають повний шлях стор → UI → тест.

### B2. Суперечність 404 (`not-found` недосяжний) — ЗАКРИТО

- `design.md` D5 (рядок 58) описує механізм: при 404 на листингу змін клієнт виконує **одну** перевірку існування гілки (GitHub `GET /repos/{owner}/{repo}/branches/{branch}`, GitLab `GET /projects/{id}/repository/branches/{branch}`); успіх → порожній список без помилки; 404 перевірки → кидається первинна помилка листингу → `not-found` рівня проєкту; інша помилка перевірки — кидається як є. Відхилена альтернатива («беззастережний 404 → порожній список») зафіксована.
- `tasks.md` 3.2 і 3.3 містять ту саму логіку слово-в-слово в `Do`, з посиланням на нормалізацію в 3.4; `fetchArtifact` 404 → `null` (окремий файл — не помилка проєкту).
- Узгодженість зі специфікаціями: `artifact-ingestion` («Якщо тека `openspec/changes/` відсутня — MUST NOT трактувати як помилку проєкту», сценарій «Тека змін відсутня») виконується гілкою «перевірка успішна → `[]`»; acceptance criterion `proposal.md` рядок 41 із `not-found` став досяжним; гілка `404 → not-found` у 3.4 більше не мертвий код.
- Нових суперечностей правка D5 не внесла: `proposal.md`, delta-специфікації та `decisions.md` (рядок 25 фіксує вибір варіанта A) з нею узгоджені.

### B3. Виставлення `loading` — ЗАКРИТО

- `tasks.md` 4.2: `refreshProject(project)` на початку ставить `loading[project.id] = true`, весь цикл обгорнутий так, що у `finally` — `loading[project.id] = false`.
- `tasks.md` 6.2: коли `projectStates.loading[project.id]` істинний — у колонці Статус рядків цього проєкту показувати індикатор «оновлюється…»; `Done-when` 6.2 включає перевірку індикатора тестом 6.4.
- `tasks.md` 4.4: deferred-мок — «замокати `listChanges` незарезолвленим промісом → поки проміс висить, `loading[id] === true`, після завершення → `false`»; кейс 401 також перевіряє `loading[id] === false`.
- Вимога `board-polling` «Стан оновлення проєкту» (loading + lastUpdated) покрита повністю.

### B4. HTTP лише через Axios-фабрику — ЗАКРИТО

- `tasks.md` 3.2 `Do`: «усі HTTP-запити виконувати через Axios-інстанс `createHttp({ baseURL: 'https://api.github.com', headers })` з `src/api/http.js` — використання `fetch` заборонене»; `Done-when`: «усі запити йдуть через `createHttp`, `fetch` у файлі відсутній».
- `tasks.md` 3.3 — те саме для GitLab із `baseURL: base`.
- `tasks.md` 3.1 `Done-when` доповнено: «після виконання 3.2 і 3.3 обидва клієнти провайдерів виконують усі HTTP-запити виключно через `createHttp`».
- Інфраструктура існує і сумісна: `src/api/http.js` містить `axios.create({ timeout: 30_000 })` і default export, який 3.1 зобов'язує зберегти; іменованого `createHttp` ще немає — його додає саме 3.1, тож посилання коректне.

### B5. Потік редагування проєкту — ЗАКРИТО

- `tasks.md` 6.3: подія `edit` таблиці → відкрити `ProjectForm` із prop `project` (обраний за id запис реєстру); `save` у режимі редагування → `updateProject(project.id, patch)` → закрити форму → `refresh()`; окремо описані режим додавання (без prop `project`), `cancel` (закрити без змін) і `remove`.
- Узгоджено з 6.1 (prop `project` для режиму редагування, емісії `save`/`cancel`) і зі сценарієм `project-registry` «Редагування гілки».

## Попутно закриті non-blocking першого циклу

- `resolveToken` більше не дублюється: 4.1 не згадує розв'язання токена; пріоритет `project.token` → env-токен лишився лише в клієнтах 3.2/3.3 і в `design.md` D3 — узгоджено з вимогою `project-registry` «Джерело токена доступу».
- 6.3 явно зобов'язує зберегти заголовок `Factory board` із посиланням на наявний `src/App.spec.js`.

## Консистентність (перевірено, претензій немає)

- `proposal.md` ↔ `design.md` ↔ `tasks.md` ↔ delta-специфікації узгоджені щодо сторів (`registry`, `board`), ключа localStorage `factory-board.projects.v1`, env-змінних (`VITE_GITHUB_TOKEN`, `VITE_GITLAB_TOKEN`, `VITE_GITLAB_BASE_URL`, `VITE_POLL_INTERVAL_MS`), ендпоінтів GitHub contents / GitLab tree + files/raw, моделі стану зміни та структури каталогів `src/api`, `src/stores`, `src/composables`, `src/components`, `src/utils`.
- Non-goals `proposal.md` не порушені: жодна задача не додає бекенд/проксі, запис у віддалені репозиторії, пагінацію понад `per_page=100`, ETag-кешування чи багатокористувацький режим. Скоуп-кріпу правки другого циклу не внесли — додано лише одну перевірку існування гілки в уже наявній 404-гілці.
- Задач-сиріт немає: усі 21 задача відображаються у вимоги спек; жодна галочка не проставлена.
- Стек-чеклист (`openspec/config.yaml`): `<script setup>`, Composition API, стан лише в Pinia setup-сторах, Axios як єдиний транспорт (B4), JavaScript без TypeScript, коментарі згадані лише для `.env.example`.
- Acceptance criteria перевіряються `npm run lint`, `npm test`, `npm run build` — збігається з `verifier` у `.agents/orchestrator.yaml`; критерій із `not-found` після B2 став перевірюваним.
- Самодостатність задач: `Files`/`Do`/`Done-when` дотичних задач (3.1–3.3, 4.1–4.4, 6.2–6.4) дають виконавцеві однозначні контракти без читання `design.md`.

## Non-blocking (не блокують apply; прибрати при дотику)

1. **`src/App.spec.js` і Pinia.** Після 6.3 `BoardView` викликає `useRegistryStore()`/`useBoardStore()` у setup, а наявний `src/App.spec.js` монтує `App` лише з плагіном роутера (`vite.config.js` не має `setupFiles`, глобальної Pinia немає). Заголовок `Factory board` збережено, але сюїта App упаде на відсутній активній Pinia; жодна задача не має `src/App.spec.js` у `Files`, хоча 7.2 вимагає зелену сюїту App. Виправлення однозначне (додати `createPinia()` до `global.plugins` у цьому тесті) і зафіксоване в `apply-notes.md` — тому не блокер.
2. 404-гілка з перевіркою існування гілки не покрита автотестом: задачі 3.2/3.3 не мають тестових задач, а 6.4 тестує лише 401. Достатньо для v1, але `not-found` перевірятиметься вручну.
3. Дрейф регексів: `design.md` D6 (рядок 65) — `/next command:?\**:?\s*(.+)/i`, `tasks.md` 2.1 (рядок 14) — `/next command\**:?\s*(.+)/i`. Джерело істини — задача.
4. `design.md` D4 описує базу GitLab як `{base}/api/v4`, а `tasks.md` 3.3 ставить `baseURL: base` і префікс `/api/v4` у шляхах — еквівалентно, але формулювання різні.
5. Назва гілки зі слешем (`feature/x`) у GitLab-ендпоінтах вимагала б `encodeURIComponent`; 3.3 цього не уточнює.
6. `nextRole` парситься (2.1) і потрапляє в модель (4.2), але жодна колонка (6.2) його не показує.
7. `per_page=100` у `decisions.md` рядок 7 подано як спільне обмеження, хоча стосується лише GitLab tree.
8. Слабкий `Done-when` у 1.1 (`npm run build` не залежить від `.env.example`).
9. `npm run lint` — це `eslint . --fix` (мутуючий); немутуючий прогін для CI — поза обсягом зміни.

## Наступний крок

`/opsx:apply add-factory-board` — гейт `review_to_apply: explicit_approve` пройдено. Обов'язкові до PR перевірки й ризикові місця — у `openspec/changes/add-factory-board/apply-notes.md`.
