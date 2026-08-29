# Design: add-change-metrics

## Context

Мотивація — див. `proposal.md` → Why. Вимоги — delta-спеки `change-metrics`, `artifact-ingestion`, `board-polling`, `factory-board`.

Поточний стан після `board-project-details` (код на `main`, delta ще не в `openspec/specs/`): два Pinia-стори (`registry`, `board`), клієнти GitHub/GitLab, полер 60 с, таблиця + KPI + drawer деталей на `BoardView` (`/`). Полінг тягне лише `handoff.md`, `tasks.md`, `review.md` активних змін. Деталі проєкту — on-demand, без архіву.

Чинні факти коду, які ця зміна **не переглядає і не суперечить**:

- `listChanges` уже пропускає `archive`: `src/api/github.js` рядок 22 (`item.name !== 'archive'`), `src/api/gitlab.js` рядок 24 (`item.name !== 'archive'`).
- `fetchArtifact` читає лише `openspec/changes/${changeName}/${fileName}` (`github.js` / `gitlab.js`).
- `updatedAt` у моделі борду — `Date.now()` моменту полінгу, не час коміта (`src/stores/board.js`).
- Callback полера — лише `refreshAll` (`src/views/BoardView.vue`: `usePoller(() => boardStore.refreshAll(registryStore.projects))`).
- Ключ реєстру `factory-board.projects.v1` без змін.
- Єдиний маршрут сьогодні — `/` у `src/router/index.js`.

Чинні рішення v1 / details, які **не переглядаються**: Axios `createHttp` (без `fetch` у api-модулях); 404 артефакту → `null`; `per_page=100`; нормалізація помилок per-project; полер-guard; без UI-бібліотек; без ETag; без власного бекенда; сигнатури `listChanges`, `fetchArtifact`, `fetchBranchHead`, `parseHandoff`, `parseTasksProgress`, `parseReviewVerdict` заморожені.

Design-brief / Figma: немає (`require_design_brief: false`). UI фіксується нижче.

## Goals / Non-Goals

**Goals:**

- Окрема поверхня `/analysis` з git-derived метриками активних **і** архівних змін.
- Чесні `null` замість вигаданих нулів; overlay `metrics.json` як єдина точка spend.
- Ізоляція HTTP аналізу від полера і від `loadProjectDetails`.
- CSV для зовнішніх таблиць.

**Non-Goals (дизайн-рівень, на додачу до proposal):**

- Поля аналізу в сторі `board` (див. D2).
- Зміна `getProviderClient` / `src/api/providers.js` (нові імена — named export модулів).
- Пагінація комітів >100; ETag; vendor API.
- Перейменування kit Runtime.
- Запис `metrics.json` з UI.
- 5-й KPI / колонка spend на живому борді.

## Decisions

### D1. Чисті функції в `src/utils/changeMetrics.js`, не в `openspecParsers.js`

Новий модуль (без коментарів, JavaScript). Існуючі експорти `openspecParsers.js` не змінюють сигнатури. `buildChangeMetrics` імпортує `parseReviewVerdict`, `parseTasksProgress`, `parseHandoff` з `openspecParsers.js`.

Експорти:

- `parseArchiveFolderName(folder)` → `{ changeName, archivedAt }`. Регекс `/^(\d{4}-\d{2}-\d{2})-(.+)$/`; без збігу `{ changeName: folder, archivedAt: null }`.
- `spanFromCommits(commits)`: `commits` — масив `{ sha, date, message }`. Порожньо / не масив → `{ startedAt: null, endedAt: null, durationMs: null, commitCount: 0, source: 'git-commits' }`. Інакше `startedAt` = min ISO `date`, `endedAt` = max, `durationMs` = `Date.parse(endedAt) - Date.parse(startedAt)` (може бути `0`), `commitCount` = кількість елементів після фільтра валідних дат; елементи без `date` ігноруються для min/max, але входять у `commitCount` лише якщо є `sha` або `date`. Практичне правило для імплементації: рахувати довжину вхідного масиву як `commitCount`; якщо жодна дата не парситься — дати й `durationMs` `null`.
- `mergeSpans(spans)`: ігнорує `null`/`undefined`. `startedAt` = найраніша ненульова, `endedAt` = найпізніша, `commitCount` = сума, `durationMs` з min/max якщо обидві дати є, інакше `null`, `source: 'git-commits'`. Якщо всі порожні — як порожній `spanFromCommits`.
- `parseMetricsFile(text)` → spend-об’єкт. `null`/порожньо / `JSON.parse` кидок / не-об’єкт / масив → усі числа `null`, `source: 'unknown'`. Інакше читати `obj.spend` якщо це об’єкт; поле числове лише коли `typeof === 'number'` і `Number.isFinite`. `source: 'metrics-file'`, якщо ≥1 таке поле, інакше `'unknown'`. Інші ключі ігнорувати.
- `parseReviewLoops(text)` → `(String(text).match(/request[ _-]?changes/gi) || []).length`; `null`/порожньо → `0`.
- `hasAcceptanceCriteria(proposalText)` → булеве `/^##\s*Acceptance criteria\b/im` на тексті; без тексту → `false`.
- `countDecisionLines(decisionsText)` → кількість збігів `/^- \d{4}-\d{2}-\d{2}\b/gm`; без тексту → `0`.
- `parseHandoffAgents(handoffText)`:
  - `runtime`: перший збіг `/runtime\**:?\s*(local|cloud)\b/i`, група 1 у нижньому регістрі; інакше `null`.
  - `roles`: унікальні, порядок збережено. (1) `parseHandoff(text).nextRole` якщо не `null`. (2) Closed role: тіло після `/^##\s*Closed role\b/im` до наступного `/^##\s/m`; перший непорожній рядок; прибрати обгортку backticks; обрізати по першому `\s+[—–]\s+` або `\s+-\s+` або ` (` ; trim; порожнє пропустити.
  - `subagents`: тіло `/^##\s*Subagents to spawn\b/im` до наступного heading; рядки `/^\s*[-*]\s+(.+)$/gm`; ім’я = група до `\s+[—–]\s+` або `\s+-\s+`; прибрати backticks; порожні пропустити.
- `buildChangeMetrics(input)` — без HTTP. Вхід:

```text
{
  project: { id, repo, provider },
  changeName,
  archived,
  archiveFolder,
  archivedAt,
  artifacts: { tasks, review, handoff, proposal, decisions, metrics },
  commits: { spec, review, apply, change }
}
```

Кожен `artifacts.*` — `string | null`. Кожен `commits.*` — масив комітів (для `spec` уже унікалізований за `sha` викликачем). Вихід — повна view-model. `verdict = parseReviewVerdict(review)`; задачі з `parseTasksProgress`; span-поля через `spanFromCommits`.

- `metricsToCsv(rows)` → рядок. Перший рядок — точні англійські заголовки з proposal. Далі по рядку view-model. `project` = `repo`; `change` = `changeName`; `archived` = `true`/`false`; булеві `true`/`false`; числа як десятковий літерал; `null` → порожня клітинка; години = `Math.round(durationMs / 3600000 * 10) / 10` (якщо `durationMs == null` — порожньо); `roles`/`subagents` join `'|'`. Якщо значення містить кому, лапки або перенос — обгорнути в `"`, внутрішні `"` подвоїти. Без BOM у цій функції (BOM додає UI).

**Чому не `openspecParsers.js`:** модуль уже містить парсери деталей; метрики — окремий контракт схеми `factory-board.change-metrics.v1`. Менший ризик зламати заморожені сигнатури.

### D2. Окремий стор `useAnalysisStore`, не поля `board`

Файл `src/stores/analysis.js`, setup-стор Pinia, id `'analysis'`.

Стан:

- `rows` — масив view-model
- `loading` — boolean
- `error` — об’єкт за `project.id` → `{ code, message }` від `normalizeProviderError` (порожній об’єкт, якщо помилок немає)
- `lastLoadedAt` — `number | null`

`loadAnalysis(projects)`:

1. `loading = true`.
2. `Promise.allSettled(projects.map(loadProject))`.
3. Успішні проєкти: конкатенація рядків у порядку реєстру (спочатку всі активні імена проєкту, потім архівні теки).
4. Відхилений проєкт: `error[id] = normalizeProviderError(reason)`; рядки цього проєкту в цьому циклі не додаються.
5. Успішний проєкт: ключ `error[id]` видалити.
6. `rows` замінити повністю результатом успішних проєктів.
7. `lastLoadedAt = Date.now()` після `allSettled` (навіть якщо частина failed).
8. `finally`: `loading = false`.

`loadProject(project)`:

1. `client = getProviderClient(project.provider)`.
2. Паралельно `listChanges(project)` і `listArchivedChanges(project)`.
3. Для кожного активного імені — `loadChange(..., archived: false, archiveFolder: null, archivedAt: null, fetch = fetchArtifact)`.
4. Для кожного архіву — `parseArchiveFolderName` уже в клієнті; `loadChange` з `fetchArchivedArtifact(project, folder, fileName)`.
5. Помилка будь-якого не-404 запиту проєкту прокидається нагору (проєкт failed). 404 файлу → `null`; 404 комітів → `[]`.

`loadChange`:

Паралельно:

- артефакти: `tasks.md`, `review.md`, `handoff.md`, `proposal.md`, `decisions.md`, `metrics.json`
- коміти: чотири групи шляхів (префікс `openspec/changes/${name}/` або `openspec/changes/archive/${folder}/`):
  - spec: три виклики `listCommitsByPath` для `proposal.md`, `design.md`, `specs` (без завершального слеша); конкатенація; унікалізація за `sha` (перша поява); якщо `sha` відсутній — лишити всі
  - review: `review.md`
  - apply: `tasks.md`
  - change: префікс теки без файлу (`openspec/changes/${name}` або `openspec/changes/archive/${folder}`)

Потім `buildChangeMetrics`.

`src/stores/board.js` MUST NOT імпортувати `useAnalysisStore` і MUST NOT викликати `loadAnalysis`. `refreshProject` / `refreshAll` без нових викликів API.

**Альтернатива (поля в `board`)** відхилена: аналіз важчий за poll, інший життєвий цикл, ізоляція полера простіша окремим стором (на відміну від details у D2 `board-project-details`, які є волатильним станом того ж огляду).

### D3. Нові експорти провайдерів, сигнатури старих заморожені

HTTP лише через наявний `createHttp`. Символ `fetch` у `github.js` / `gitlab.js` відсутній. Стиль імпорту кожного файлу не уніфікувати.

**GitHub** (`src/api/github.js`):

- `listArchivedChanges(project)`: `GET /repos/${project.repo}/contents/openspec/changes/archive` `params: { ref: project.branch }`. Успіх: якщо `data` не масив → `[]`; інакше `filter type === 'dir'`, map через `parseArchiveFolderName` + `folder: item.name`. 404: той самий патерн, що `listChanges` — перевірити `GET /repos/${project.repo}/branches/${project.branch}`; успіх гілки → `[]`; 404 гілки → throw оригінальної помилки; інший checkError → throw checkError. Інші статуси archive-запиту — throw.
- `fetchArchivedArtifact(project, archiveFolder, fileName)`: ті самі заголовки, що `fetchArtifact` (`Accept: application/vnd.github.raw+json`); шлях `openspec/changes/archive/${archiveFolder}/${fileName}`; 404 → `null`.
- `listCommitsByPath(project, path)`: `GET /repos/${project.repo}/commits` `params: { sha: project.branch, path, per_page: 100 }`. Мапінг: `{ sha: item.sha, date: item.commit?.author?.date ?? null, message: перший рядок item.commit?.message }`. Порожній масив, 404 → `[]`. Інші статуси — throw.

**GitLab** (`src/api/gitlab.js`):

- `listArchivedChanges`: `GET /api/v4/projects/${encodeURIComponent(project.repo)}/repository/tree` `params: { path: 'openspec/changes/archive', ref: project.branch, per_page: 100 }`. Фільтр `type === 'tree'`. 404 + перевірка гілки як у `listChanges` (`/repository/branches/${encodeURIComponent(project.branch)}`) → `[]` якщо гілка існує.
- `fetchArchivedArtifact`: `filePath = encodeURIComponent(\`openspec/changes/archive/${archiveFolder}/${fileName}\`)`; raw як `fetchArtifact`; 404 → `null`.
- `listCommitsByPath`: `GET /api/v4/projects/${id}/repository/commits` `params: { ref_name: project.branch, path, per_page: 100 }`. Мапінг: `{ sha: item.id, date: item.authored_date || item.created_at, message: item.title || перший рядок item.message }`. 404 або порожній масив → `[]`.

`listChanges` / `fetchArtifact` / `fetchBranchHead` не змінювати (тіло можна не чіпати). `providers.js` не змінювати.

### D4. Маршрут `/analysis` і навігація

`src/router/index.js`: додати `{ path: '/analysis', name: 'analysis', component: AnalysisView }` поряд із `/`.

`BoardView`: у `.board-toolbar` `RouterLink` з `to="{ name: 'analysis' }"` (або `to="/analysis"`) і текстом `Аналіз`. Не прибирати «Оновити» / «Додати проєкт». Полер без змін.

`App.spec.js`: маршрути тестового роутера мають включати `/analysis` (заглушка або `AnalysisView`), щоб `/` і далі показував `Factory board`.

`BoardView.spec.js`: `global.stubs.RouterLink` з `props: ['to']` і шаблоном `<a><slot /></a>`, щоб наявні тести не вимагали vue-router; розширити кейс полінгу: `listArchivedChanges`, `listCommitsByPath` не викликані, `fetchArtifact` без `'metrics.json'`. Додати ці методи в `createClient` як `vi.fn().mockResolvedValue([])`.

### D5. `AnalysisView`

Новий SFC `<script setup>`, без Options API, без коментарів.

- На `onMounted`: `analysisStore.loadAnalysis(registryStore.projects)`.
- Не викликати `usePoller`, `refreshAll`, `loadProjectDetails`.
- Заголовок `h1`: «Аналіз змін».
- Тулбар: `RouterLink` «Борд» → `/`; кнопка «Оновити» → `loadAnalysis(registryStore.projects)`; кнопка «Експорт CSV» `:disabled="rows.length === 0"`.
- CSV: `'\uFEFF' + metricsToCsv(analysisStore.rows)`; `Blob` `text/csv;charset=utf-8`; `download = 'factory-board-analysis.csv'`; `URL.createObjectURL` / `revokeObjectURL`.
- Якщо `loading` — текст «Завантаження аналізу…».
- Банер: для кожного ключа `error` показати `message`.
- Якщо `registry.projects.length === 0` — «Немає зареєстрованих проєктів.» (пріоритет над порожніми рядками).
- Інакше якщо `!loading && rows.length === 0` — «Немає даних для аналізу.»
- Фільтри (локальний стан, без HTTP): `input` пошуку (підрядок без регістру в `repo` або `changeName`); `select` значення `'' | 'active' | 'archived'` з підписами «усі» / «активні» / «архів». Нуль збігів при непорожніх `rows` — «Немає рядків за фільтром.»
- Таблиця `.analysis-table` (ті самі токени, що `.board-table`): колонки як у spec. Архів: `так` + пробіл + `archivedAt` якщо не null, інакше `так`; для активних `ні`. Задачі: `${tasksDone}/${tasksTotal}`. Тривалість: якщо `durationMs == null` → `—`, інакше `${(durationMs / 3600000).toFixed(1)} год`. `title` на комірках Спека/Рев’ю/Apply/Усього: `${startedAt ?? '—'}–${endedAt ?? '—'}, комітів: ${commitCount}, інтервал комітів файлів, не wall-clock сесії`. Токени: `totalTokens == null` → `—`, інакше число. Вартість: `costUsd == null` → `—`, інакше `$${costUsd.toFixed(2)}`. Агенти: `[runtime, ...roles].filter(Boolean).join(' · ')` або `—`.
- Розкриття: `<details>` з `<summary>Деталі метрик</summary>`: `spend.source`, список `subagents` або «немає», acceptance criteria так/ні, `decisionsCount`, чотири span з сирими ISO. Без балу 1–5.

Корінь: `<main class="board analysis">` щоб успадкувати padding/flex.

### D6. Стилі

У `src/styles.css` (без нової UI-бібліотеки):

- `.board-toolbar a` — візуально як вторинна кнопка тулбару (бордер, padding, радіус).
- `.analysis-table` — як `.board-table` (`width: 100%`, `min-width: 64rem`).
- `.analysis-banner-error` — як наявний `.badge-error` / червоний текст помилки борду.
- `.analysis-row-details` — дрібний текст, `color: #64748b`.

Не змінювати `.board-kpis` (лишається 4 колонки).

### D7. Чесність git-span у продукті

Інтервал — min/max `commit.author.date` (GitHub) / `authored_date||created_at` (GitLab) по файлах групи, не тривалість сесії Cursor/Amp. Це свідомо грубіше за wall-clock і **точніше**, ніж вигадка. Підпис у tooltip обов’язковий. `updatedAt` борду надалі `Date.now()` полінгу і не використовується в аналізі.

**Альтернатива (чекати kit telemetry)** відхилена оператором: корабель git-now, `metrics.json` — extension point.

### D8. CSV з BOM, експорт усіх завантажених рядків

Фільтри лише для екрана. CSV = `metricsToCsv(store.rows)` після успішного/часткового load, не відфільтрований піднабір. BOM лише в blob, не в чистій функції (щоб тести порівнювали заголовки без `\uFEFF`).

## Risks / Trade-offs

- [Багато HTTP: 6 файлів + до 6 commit-path на зміну × (активні+архів) × проєкти] → лише екран аналізу / «Оновити»; `Promise.allSettled` по проєктах; `per_page=100` без пагінації (non-goal).
- [Git-span ≠ час сесії агента] → чесний tooltip; не показувати як wall-clock.
- [Spend майже завжди `unknown`, доки репо не має `metrics.json`] → UI `—`, не `$0`; борд не пише файл.
- [Два активні OpenSpec-changes у репо (`board-project-details` Complete)] → оператор наказав створити цю зміну; archive чужої зміни не входить у цей дизайн.
- [GitHub contents 404 на archive vs на весь repo] → branch-check як у `listChanges`, щоб не ховати справжній not-found репо.
- [Подвійний підрахунок комітів spec] → унікалізація за `sha` у сторі перед `spanFromCommits`; `mergeSpans` лишається допоміжним.

## Migration Plan

Схема localStorage не змінюється. Нових env-змінних немає. Відкат — revert коміта; маршрут `/analysis` зникне, борд `/` без змін контракту полінгу. Файл `metrics.json` у репозиторіях-споживачах опційний і створюється поза цим продуктом.

## Open Questions

Немає — рішення оператора зафіксовані (accuracy over completeness, без vendor API, без rename Runtime, архіви на аналізі, ізоляція полера, заморожені сигнатури, без 5-го KPI, без нових npm, CSV).
