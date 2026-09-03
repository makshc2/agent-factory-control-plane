# Tasks: add-analysis-date-range

## 1. Утиліта періоду

- [x] 1.1 Додати календарне вікно Києва
  Files: new file: src/utils/analysisPeriod.js
  Do: JavaScript без TypeScript і коментарів. Експортувати `kyivToday(now = new Date())` → `YYYY-MM-DD` через `Intl.DateTimeFormat` з `timeZone: 'Europe/Kyiv'` (не `getDate()` браузера); `shiftIsoDate(iso, deltaDays)` як зсув календарного дня; `defaultAnalysisWindow(now)` з `to = kyivToday(now)` і `from = shiftIsoDate(to, -6)`; `periodKey({ mode, from, to })` → `'all'` якщо `mode === 'all'`, інакше `` `${from}:${to}` ``; `isValidAnalysisWindow(from, to)` true лише коли обидва відповідають `/^\d{4}-\d{2}-\d{2}$/` і `from <= to`; `shouldLoadChange({ archived, archivedAt, mode, from, to })` — `true` якщо `mode === 'all'` або `archived === false` або `archivedAt == null`, інакше `from <= archivedAt && archivedAt <= to`. Не імпортувати `changeMetrics.js`.
  Done-when: файл існує і експортує ці шість імен; немає імпорту VueDatePicker / `quasar`; `npm run lint` завершується з кодом 0.

- [x] 1.2 Покрити вікно, inclusive і skip-правило
  Files: new file: src/utils/analysisPeriod.spec.js
  Do: Vitest без `npx vitest` у цьому кроці. Зафіксувати `now = new Date('2026-09-02T12:00:00+03:00')`: `defaultAnalysisWindow(now)` дає `{ from: '2026-08-27', to: '2026-09-02' }`. Перевірити inclusive: `shouldLoadChange` true для архіву `archivedAt: '2026-08-27'` і `'2026-09-02'` у цьому вікні, false для `'2026-01-01'`. Активна (`archived: false`) і `archivedAt: null` — true у вікні. `mode: 'all'` — true для `'2026-01-01'`. `isValidAnalysisWindow('2026-09-02', '2026-08-27')` і порожній from — false. `periodKey({ mode: 'all' }) === 'all'`.
  Done-when: файл містить ці очікування з зафіксованим `now`; `npm run lint` завершується з кодом 0.

## 2. Стор аналізу

- [x] 2.1 Додати стан періоду і ключ свіжості
  Files: src/stores/analysis.js
  Do: Vue/Pinia JavaScript без TypeScript і коментарів. Імпортувати `defaultAnalysisWindow`, `periodKey`, `isValidAnalysisWindow`, `shouldLoadChange` з `@/utils/analysisPeriod`. На старті стора: `periodMode = ref('range')`, вікно з `defaultAnalysisWindow()`, `loadedPeriodKey = ref(null)`. Експортувати `setPeriodRange(from, to)` (ставить `periodMode='range'`, from/to; без HTTP), `setPeriodAllTime()` (`periodMode='all'`; from/to не обов’язково чистити), `hasFreshAnalysis(projectId)` = є рядок з цим `projectId` і `loadedPeriodKey === periodKey({ mode: periodMode, from: periodFrom, to: periodTo })`. Не редагувати `src/stores/board.js` і `src/composables/usePoller.js`.
  Done-when: стор експортує `periodMode`, `periodFrom`, `periodTo`, `loadedPeriodKey`, `setPeriodRange`, `setPeriodAllTime`, `hasFreshAnalysis` разом із чинними `rows`/`loading`/`loadAnalysis`; `npm run lint` завершується з кодом 0.

- [x] 2.2 Skip `loadChange` для архівів поза вікном
  Files: src/stores/analysis.js
  Do: У `loadProject` і далі викликати `listChanges` і `listArchivedChanges` без дат. Для кожної активної завжди `await loadChange(...)`. Для кожного архіву обчислити `parseArchiveFolderName(folder)` і викликати `loadChange` лише якщо `shouldLoadChange({ archived: true, archivedAt: parsed.archivedAt, mode: periodMode.value, from: periodFrom.value, to: periodTo.value })`; інакше `continue` без `listFolderEntries` / raw / комітів цієї теки. У `loadChange` лишити `listCommitsByPath(project, path)` з рівно двома аргументами. Не змінювати формули в `src/utils/changeMetrics.js`. Не редагувати `src/api/github.js` і `src/api/gitlab.js`.
  Done-when: гілка архіву має `shouldLoadChange` перед `loadChange`; виклики `listCommitsByPath` у файлі мають два аргументи і не містять `since`/`until`; `npm run lint` завершується з кодом 0.

- [x] 2.3 Keep і loadedPeriodKey за projectId+період
  Files: src/stores/analysis.js
  Do: На старті `loadAnalysis(projects)` обчислити `keep` як `projects.length === 1 && hasFreshAnalysis(projects[0].id)` (або еквівалент: є рядок цього id і `loadedPeriodKey ===` поточний `periodKey`). Завжди `loading = true`. Якщо `!keep` — `rows = []`. Збір `collected` як зараз. Після циклу: якщо `keep` і жоден проєкт не успішний — не присвоювати порожній `collected` і не змінювати `loadedPeriodKey`; інакше `rows = collected` і при хоча б одному успіху `loadedPeriodKey = periodKey(...)`. `finally { loading = false }` лишити.
  Done-when: немає безумовного `rows.value = []` без `keep`; `loadedPeriodKey` оновлюється лише після успішного load; `npm run lint` завершується з кодом 0.

- [x] 2.4 Тести стора: default, skip, all-time, keep, без since/until
  Files: src/stores/analysis.spec.js
  Do: Не видаляти чинні кейси 401 / sequential / loading / journal. У кожному чинному кейсі, що очікує рядок `add-factory-board` (`archivedAt: '2026-08-28'`), перед `loadAnalysis` викликати `store.setPeriodAllTime()` або `store.setPeriodRange` з вікном, що містить `2026-08-28` — MUST NOT покладатися на системну дату. Додати кейси: (1) `setPeriodRange('2026-08-27','2026-09-02')` + архіви `2026-08-28-add-factory-board` і `2026-01-01-old-change` — `rows` без `old-change`, `fetchArchivedArtifact` / `listFolderEntries` не викликані для `openspec/changes/archive/2026-01-01-old-change`, активна `add-login` є; (2) той самий listing після `setPeriodAllTime()` — обидва архіви в `rows`; (3) архів `hotfix` (`archivedAt` null) у вікні — рядок є; (4) повторний `loadAnalysis` того самого проєкту й періоду не чистить `rows` поки pending; (5) після load вікна A виклик `setPeriodRange` на інше валідне вікно і `loadAnalysis` на старті чистить `rows`; (6) кожен `listCommitsByPath.mock.calls[i].length === 2` і жоден аргумент не має ключів `since`/`until`.
  Done-when: файл містить кейси skip `old-change`, all-time, `hotfix`, keep того самого періоду, clear при зміні періоду, arity комітів; чинні кейси з архівом 2026-08-28 фіксують період; `npm run lint` завершується з кодом 0.

## 3. UI списку і деталей

- [x] 3.1 Native date inputs і «весь час» у фільтрах
  Files: src/views/AnalysisView.vue, src/styles.css
  Do: `<script setup>` без Options API і коментарів. У `.board-filters` після search/select додати label «Від» + `<input type="date">` на `analysisStore.periodFrom`, label «До» + `<input type="date">` на `analysisStore.periodTo`, і `<button type="button">` з текстом рівно `весь час`, який викликає `setPeriodAllTime()` якщо режим не `all`, інакше `setPeriodRange` з `defaultAnalysisWindow()` (або останні валідні from/to). Коли `periodMode === 'all'` — обидва date мають `disabled`. Якщо режим `range` і `!isValidAnalysisWindow(periodFrom, periodTo)` — показати `<p class="analysis-period-error">` з текстом `Дата «від» не може бути пізнішою за «до».` (порожнє поле — `Вкажіть дати «від» і «до».`) і MUST NOT викликати `loadAnalysis`. MUST NOT імпортувати VueDatePicker / `quasar`. У `src/styles.css` додати `.board-filters input[type="date"] { flex: 0 0 auto; }` і `.analysis-period-error`; не змінювати `.board-table` / KPI / `usePoller`.
  Done-when: у шаблоні є два `type="date"` і текст `весь час` всередині `.board-filters`; є `analysis-period-error`; немає імпорту date-picker бібліотеки; `npm run lint` завершується з кодом 0.

- [x] 3.2 HTTP лише на період; search/архів без HTTP; skip back
  Files: src/views/AnalysisView.vue
  Do: Залишити `filteredRows` лише для search + усі/активні/архів (без HTTP). `watch` на `projectId`: якщо `analysisStore.hasFreshAnalysis(project.id)` — `return` без `loadAnalysis`; інакше викликати чинний `loadAnalysis()`. Окремий `watch` на `[periodMode, periodFrom, periodTo]`: якщо `periodMode === 'range'` і вікно невалідне — не вантажити; якщо валідне і `loadedPeriodKey !== periodKey(...)` — викликати `loadAnalysis()`. Не ставити HTTP-watch на `searchQuery` / `archiveFilter`. `exportCsv` лишає `metricsToCsv(analysisStore.rows)` (завантажене вікно, не `filteredRows`). `showOverlay` = `loading && project != null && !hasFreshAnalysis(project.id)`. Не викликати `loadAnalysis` двічі на першому mount.
  Done-when: файл містить `hasFreshAnalysis` у watch проєкту і в `showOverlay`; немає watch, що викликає HTTP від `searchQuery` чи `archiveFilter`; CSV іде з `analysisStore.rows`; `npm run lint` завершується з кодом 0.

- [x] 3.3 Деталі: skip fetch за projectId+період
  Files: src/views/AnalysisDetailsView.vue
  Do: У `ensureLoaded` замінити `alreadyHasProjectRows` на `analysisStore.hasFreshAnalysis(project.value.id)`: якщо true — `return` без `loadAnalysis`. Deep-link без рядків цього ключа — викликати `loadAnalysis` з поточним періодом стора (default 7 днів). `showOverlay` лишити `loading && project && row == null`. Не додавати date picker на сторінку деталей. Не імпортувати `usePoller`.
  Done-when: файл містить `hasFreshAnalysis` і не містить старої перевірки лише `rows.some(projectId)` без періоду; `npm run lint` завершується з кодом 0.

## 4. Тести UI

- [x] 4.1 Тести списку: default 7 днів, skip архіву, all-time, from>to, search без HTTP
  Files: src/views/AnalysisView.spec.js
  Do: Не видаляти чинні кейси карток / «триває» / вартості / навігації деталей / порожнього реєстру. У чинних кейсах, що очікують картку `add-factory-board`, перед mount виставити `useAnalysisStore().setPeriodAllTime()` або вікно, що містить `2026-08-28`. Додати: (1) після mount без ручного періоду є два `input[type="date"]` зі значеннями `defaultAnalysisWindow()` для зафіксованого `now` (замокати `kyivToday`/`defaultAnalysisWindow` або виставити період після pinia і перевірити атрибут `value`); (2) listing з `2026-01-01-old-change` + вікно 2026-08-27..2026-09-02 — немає тексту `old-change`, є `add-login`; (3) клік «весь час» збільшує `listArchivedChanges` або повторний `loadAnalysis` і показує `old-change`; (4) зміна search/select «архів» не збільшує `listChanges` після першого load; (5) поставити from>to — `listChanges` не викликається знову, є `.analysis-period-error`; (6) після карток оверлей відсутній; (7) CSV click при вікні без `old-change` — створений текст MUST NOT містити `old-change` (spy `createObjectURL` / Blob як у чинному кейсі).
  Done-when: файл містить кейси default date inputs, skip `old-change`, all-time, search без нового HTTP, from>to без HTTP, CSV без пропущеного архіву; `npm run lint` завершується з кодом 0.

- [x] 4.2 Тести деталей: back не refetch того самого періоду
  Files: src/views/AnalysisDetailsView.spec.js
  Do: Лишити чинні кейси full-page / оверлей cold deep-link. Додати: попередньо заповнити `useAnalysisStore().rows` рядком цього `projectId` і `changeRef` і виставити той самий період (`setPeriodRange` або all-time) і `loadedPeriodKey` узгоджено з `periodKey` — після mount `listChanges` MUST NOT викликатися, оверлей відсутній. Додати: порожній стор + listing лише з архівом поза default-вікном для цієї `changeRef` — після load видно «Зміну не знайдено.» (або чинний порожній стан деталей), не картку поза вікном.
  Done-when: файл містить кейс без `listChanges` при свіжому ключі projectId+період і кейс «Зміну не знайдено» коли зміна поза періодом; `npm run lint` завершується з кодом 0.

## 5. Регресія

- [x] 5.1 Коміти без since/until і незмінні API-файли
  Files: src/api/github.js, src/api/gitlab.js, src/stores/analysis.js
  Do: Не додавати параметри `since`/`until` у `listCommitsByPath` і не змінювати сигнатуру `(project, path)`. Якщо ці два API-файли не потребують правок для зміни — не редагувати їх. У `src/stores/analysis.js` не передавати третій аргумент у `listCommitsByPath`.
  Done-when: `git diff -- src/api/github.js src/api/gitlab.js` порожній або не містить `since`/`until`; у `analysis.js` немає рядка з `since` чи `until` біля комітів.

- [x] 5.2 Не чіпати борд, полер і формули метрик
  Files: src/stores/board.js, src/composables/usePoller.js, src/utils/changeMetrics.js
  Do: Не редагувати ці файли в цій зміні. `parseArchiveFolderName` лишається єдиним парсером імені архіву; стор лише читає `archivedAt`.
  Done-when: `git diff -- src/stores/board.js src/composables/usePoller.js src/utils/changeMetrics.js` порожній.

- [x] 5.3 Лінт змінених файлів
  Files: new file: src/utils/analysisPeriod.js, new file: src/utils/analysisPeriod.spec.js, src/stores/analysis.js, src/stores/analysis.spec.js, src/views/AnalysisView.vue, src/views/AnalysisView.spec.js, src/views/AnalysisDetailsView.vue, src/views/AnalysisDetailsView.spec.js, src/styles.css
  Do: Виконати `npm run lint` і виправити помилки ESLint лише в цих файлах (плюс нові util/spec). Не додавати TypeScript, коментарі, VueDatePicker і записи в `package.json`. Не редагувати `src/stores/board.js`, `src/composables/usePoller.js`, `src/utils/changeMetrics.js`.
  Done-when: `npm run lint` завершується з кодом 0; `package.json` без нової date-picker залежності; перелічені ізольовані файли без змін цієї задачі.
