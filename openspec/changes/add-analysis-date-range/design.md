## Context

Мотивація — `proposal.md` → Why. Контракт — delta `specs/change-metrics/spec.md`. Design-brief / Figma: немає (`require_design_brief: false`).

Чинний код (не вигадувати інший):

- `src/stores/analysis.js` — `loadProject` завжди робить `listChanges` + `listArchivedChanges`, далі `loadChange` (listing теки + raw + до 5 `listCommitsByPath`) для **кожної** активної і **кожної** архівної зміни. Keep-рядків: `keep = projects.length === 1 && rows.some(projectId)`. Немає стану періоду.
- `src/views/AnalysisView.vue` — `watch` на `projectId` завжди викликає `loadAnalysis`. `.board-filters`: search + select усі/активні/архів (лише `filteredRows`). CSV = `metricsToCsv(analysisStore.rows)`. Оверлей: `loading && немає рядка цього projectId`.
- `src/views/AnalysisDetailsView.vue` — skip fetch, якщо `rows.some(projectId)`; інакше `loadAnalysis`.
- `src/api/github.js` / `src/api/gitlab.js` — `listCommitsByPath(project, path)` без `since`/`until`; listing архіву без дат.
- `src/utils/changeMetrics.js` — `parseArchiveFolderName`, span/spend. Формули MUST NOT змінювати.
- `src/utils/formatDateTime.js` — `Europe/Kyiv` уже є для відображення дат; календар «сьогодні» для вікна — окремий util.
- `src/stores/board.js`, `src/composables/usePoller.js` — не чіпати.
- Стек: Vue 3 `<script setup>`, Pinia, Axios, JavaScript. Без Options API, без коментарів, без TypeScript, без нової npm.

`:projectId` у маршруті — id проєкту реєстру, не ім’я OpenSpec change.

## Goals / Non-Goals

**Goals:**

- Різати N+1: не викликати `loadChange` для архівів поза вікном.
- Зберегти чесність span/spend (повна історія комітів завантаженої зміни).
- Default 7 днів Київ; «весь час» = чинний повний fetch.
- Native date inputs + «весь час»; період у Pinia; ключ свіжості `projectId`+період.
- Розширити keep/skip-refetch, не ламати оверлей.

**Non-Goals:**

- URL query `from`/`to` (Explorer не вимагав deep-link дат).
- Фільтр активних за датою створення.
- `since`/`until` на комітах; rewrite span/spend.
- Новий backend; VueDatePicker / Quasar date / нова npm.
- Зміна `/`, KPI, полера, формул `changeMetrics.js`.

## Decisions

### D1. Період ріже fetch змін, не метрики рядка

У `loadProject` після listing:

- активні — завжди `loadChange`;
- архів — `loadChange` лише якщо `shouldLoadArchivedChange(archivedAt, period)` (див. D4);
- пропущені архіви MUST NOT потрапляти в `rows`.

Для вже завантаженого рядка `spans` / `spend` / `journal` лишаються повними (усі коміти шляхів, увесь `metrics.json`). Вікно MUST NOT обрізати коміти і MUST NOT перераховувати duration.

**Чому:** чесність `change-metrics` + менше HTTP. Архів поза вікном не потрібен оператору в default 7 днів.

**Альтернатива A (повний fetch + клієнтський фільтр)** — відхилено: N+1 лишається, період лише ховає картки.

**Альтернатива C (`since`/`until` у `listCommitsByPath`)** — відхилено: git-span став би «span у вікні», а не історія зміни.

Обрано гібрид B+C Explorer: listing без дат, skip лише `loadChange` архівів.

### D2. Календарне вікно: Київ, 7 днів, включні кінці

Новий `src/utils/analysisPeriod.js` (без коментарів, JS):

- `KYIV_TZ = 'Europe/Kyiv'`.
- `kyivToday(now = new Date())` → `YYYY-MM-DD` через `Intl.DateTimeFormat` з `timeZone: 'Europe/Kyiv'` (не `getDate()` браузера).
- `shiftIsoDate(iso, deltaDays)` — календарні дні (не 24h UTC), щоб DST не зсунув дату.
- Default: `to = kyivToday()`, `from = shiftIsoDate(to, -6)` (7 днів включно).
- Inclusive: архів з `archivedAt === from` або `=== to` входить.
- Порівняння дат — лексикографічне `YYYY-MM-DD` (`from <= archivedAt && archivedAt <= to`).
- Sentinel «весь час»: `periodMode === 'all'` (рядок ключа `'all'`). У цьому режимі skip архівів немає; `from`/`to` у стейті можуть лишатися останніми валідними для повернення у вікно.
- Валідація вікна: обидва `YYYY-MM-DD` і `from <= to`. Порожній from або to у режимі вікна — невалідно.

Тести util: фіксований `now` (не системний годинник). Приклад: `now` = `2026-09-02T12:00:00+03:00` → `from === '2026-08-27'`, `to === '2026-09-02'`.

### D3. Стан періоду в Pinia, ключ `projectId`+період

У `src/stores/analysis.js` додати (імена можна уточнити, семантика — ні):

- `periodMode`: `'range' | 'all'` (старт `'range'`).
- `periodFrom`, `periodTo`: default D2.
- `loadedPeriodKey`: `null` або рядок ключа останнього **успішного** `loadAnalysis`.
- `periodKey()`: `'all'` або `` `${periodFrom}:${periodTo}` ``.
- `hasFreshAnalysis(projectId)`: є рядок з цим `projectId` **і** `loadedPeriodKey === periodKey()`.
- `setPeriodRange(from, to)` / `setPeriodAllTime()` — лише стейт, без HTTP (HTTP з view).

`loadAnalysis` keep:

```
keep = projects.length === 1
  && rows.some(projectId === projects[0].id)
  && loadedPeriodKey === periodKey()
```

Якщо `!keep` — `rows = []` (як зараз для іншого проєкту). Після успіху — `rows = collected`, `loadedPeriodKey = periodKey()`. Якщо `keep` і жоден проєкт не успішний — не затирати рядки і не змінювати `loadedPeriodKey`.

Період спільний для всіх проєктів у сторі (не per-project). Зміна проєкту все одно `!keep` через інший `projectId`.

**Без URL sync** — період тільки в Pinia; F5 скидає на default 7 днів.

### D4. Правило skip `loadChange`

`shouldLoadChange({ archived, archivedAt, periodMode, from, to })`:

| Умова | Дія |
|---|---|
| `periodMode === 'all'` | load |
| `archived === false` | load (активні завжди) |
| `archived === true` і `archivedAt == null` | load |
| `archived === true` і `from <= archivedAt <= to` | load |
| інакше | skip (немає рядка, немає fan-out) |

`listChanges` і `listArchivedChanges` викликати завжди (API без дат). `parseArchiveFolderName` лишається в `changeMetrics.js`; util лише читає вже розпарсений `archivedAt`.

### D5. Заборона `since`/`until`

`loadChange` і далі викликає `client.listCommitsByPath(project, path)` з **двома** аргументами. MUST NOT передавати третій аргумент і MUST NOT писати `since`/`until` у params axios у `src/api/github.js` / `src/api/gitlab.js`. Ці два API-файли в цій зміні **не редагувати**, якщо сигнатура вже `(project, path)`.

Регресія: у `analysis.spec.js` кожен виклик `listCommitsByPath` має `calls[i].length === 2` і жоден аргумент не є об’єктом з ключами `since`/`until`.

### D6. UI: native date + «весь час»

У `AnalysisView.vue` всередині `.board-filters` (після search/select або в тому ж flex), без нового SFC і без npm:

- `<label>` «Від» + `<input type="date">` (`periodFrom`).
- `<label>` «До» + `<input type="date">` (`periodTo`).
- Контроль «весь час»: `<button type="button">` (текст рівно `весь час`) або checkbox з видимим текстом `весь час`. Увімкнений all-time: обидва date `disabled`. Повторне вимкнення all-time: повернути останні валідні from/to або default D2, якщо їх немає.

Валідація `from > to` або порожня дата у режимі вікна:

- MUST NOT викликати `loadAnalysis`;
- видимий текст (не toast-only): `Дата «від» не може бути пізнішою за «до».` (порожнє поле — той самий блок або `Вкажіть дати «від» і «до».`);
- `rows` і `loadedPeriodKey` не чіпати (залишається попереднє успішне вікно).

Чинні search і `<select>` усі/активні/архів не змінювати за контрактом (лише `filteredRows`).

Стилі: наявні `.board-filters input` уже покривають `type="date"`. Якщо date розтягується через `flex: 1 1 12rem` на всіх `input` — додати вужче правило `.board-filters input[type="date"]` у `src/styles.css` (`flex: 0 0 auto`), не ламаючи search.

### D7. Хто тригерить HTTP

| Подія | HTTP `loadAnalysis` |
|---|---|
| Перше відкриття списку (немає fresh ключа) | так |
| Зміна from/to на валідне вікно | так |
| Увімкнути / вимкнути «весь час» | так |
| Кнопка «Оновити» | так (keep, якщо той самий ключ) |
| Search / усі / активні / архів | ні |
| `from > to` / порожні дати | ні |
| Back з деталей, `hasFreshAnalysis(projectId)` | ні |
| Відкриття деталей, є рядки цього `projectId`+періоду | ні (чинний skip, плюс ключ періоду) |
| Deep-link деталей без рядків | так, **поточний** період стора (default 7 днів). Якщо зміна поза вікном — чинне «Зміну не знайдено.» |

`AnalysisView` `watch` на `projectId`: якщо `hasFreshAnalysis(projectId)` — `return` без HTTP (це і є skip-stale-refetch). Інакше `loadAnalysis`.

Окремий `watch` на `periodMode`/`periodFrom`/`periodTo`: якщо період невалідний — не вантажити; якщо валідний і ключ ≠ `loadedPeriodKey` — `loadAnalysis`.

Не викликати `loadAnalysis` двічі на першому mount (один watch-шлях або guard).

### D8. Оверлей і keep

`showOverlay` у списку:

`loading && project != null && !hasFreshAnalysis(project.id)`

Еквівалент: немає рядка цього `projectId` **або** `loadedPeriodKey` не збігається з поточним періодом. Після зміни періоду `keep === false` → рядки чистяться → оверлей видимий, доки немає рядків нового ключа.

Деталі: `showOverlay = loading && project && row == null` лишити; `alreadyHasProjectRows` замінити на `hasFreshAnalysis(project.id)` (той самий ключ періоду).

Кнопка «Оновити» при тому самому ключі: keep, оверлей сховано, фонове оновлення як зараз.

### D9. CSV і порожнє вікно

`exportCsv` і далі `metricsToCsv(analysisStore.rows)` — після skip це автоматично рядки вікна. Колонки/заголовки/BOM MUST NOT змінювати. Кнопка неактивна, якщо `rows.length === 0`.

Порожній успішний load → «Немає даних для аналізу.» (чинний `v-else-if`). Клієнтський фільтр без збігів → «Немає рядків за фільтром.» без змін.

### D10. Ізоляція

Не редагувати: `src/stores/board.js`, `src/composables/usePoller.js`, `src/views/BoardView.vue`, формули в `src/utils/changeMetrics.js`, `src/api/http.js`. Не додавати залежності в `package.json`.

## Risks / Trade-offs

- [Архіви старші за 7 днів зникають з default-екрана] → прийнятно; «весь час» відновлює повний список. Це ціль зміни, не регресія живої таблиці.
- [Deep-link деталей архіву поза default-вікном → «Зміну не знайдено.»] → прийнятно; оператор повертається на список і обирає «весь час». Окремий fetch однієї зміни — non-goal.
- [Існуючі тести з фікстурою `2026-08-28-add-factory-board` залежать від «сьогодні»] → у apply виставити «весь час» або явне вікно, що містить `2026-08-28`; MUST NOT покладатися на системну дату CI.
- [Валідація from>to лишає старі рядки] → прийнятно; краще, ніж порожній fetch. Текст помилки видимий біля фільтрів.
- [Listing архіву все ще без дат] → свідомий trade-off: 2 listing-запити лишаються, економія — fan-out `loadChange`.
- [Немає URL-дат] → F5 скидає на 7 днів; узгоджено з Explorer.

## Migration Plan

Немає зміни localStorage / env / реєстру / CSV-заголовків. Відкат — revert store/view/util: знову вантажаться всі архіви. `metrics.json` не пишеться бордом.

## Open Questions

Немає — рішення Explorer зафіксовані в `decisions.md`. URL-sync свідомо не додано.
