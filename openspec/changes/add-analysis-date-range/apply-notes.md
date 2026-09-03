# Apply notes — add-analysis-date-range

- Різати лише `loadChange` архівів; `listChanges` / `listArchivedChanges` завжди без дат.
- `listCommitsByPath(project, path)` — рівно 2 аргументи. `src/api/github.js` і `src/api/gitlab.js` не редагувати.
- Не чіпати: `board.js`, `usePoller.js`, `BoardView.vue`, формули `changeMetrics.js`, `http.js`, `package.json`.
- Ключ: `projectId` + `'all'` або `` `${from}:${to}` ``. Keep / оверлей / skip-refetch лише за ним.
- `from > to` або порожня дата в `range` — guard у `loadAnalysis()` в’юхи (і «Оновити»), без HTTP; рядки не чистити.
- Два watch (`projectId` + період) — один виклик на mount (guard / не два `immediate`).
- UI: два `type="date"` + кнопка з текстом рівно `весь час`; без VueDatePicker / Quasar.
- CSV: `metricsToCsv(analysisStore.rows)`, не `filteredRows`.
- Кейси з `2026-08-28-add-factory-board`: `setPeriodAllTime()` або вікно з цією датою — не системний годинник CI.
- Чинний кейс деталей «rows already exist»: виставити `loadedPeriodKey`, інакше `hasFreshAnalysis` буде false.
- Верифікація: `npm run lint`. Тести (після вимірювання RAM/load): `./node_modules/.bin/vitest run src/utils/analysisPeriod.spec.js src/stores/analysis.spec.js src/views/AnalysisView.spec.js src/views/AnalysisDetailsView.spec.js --maxWorkers=1`.
