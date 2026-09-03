# Decisions — add-analysis-date-range

<!-- append-only; пише npx agent-orchestrator-kit handoff <name> з handoff.md ## Decisions -->

- 2026-09-02 period-semantics: ріжемо fetch змін, не rewrite spans/metrics — чесність change-metrics і зменшення N+1
- 2026-09-02 default-window: 7 календарних днів у поясі Києва (from=today-6, to=today)
- 2026-09-02 picker-ui: два нативні `type="date"` у `.board-filters` + «весь час»; без VueDatePicker
- 2026-09-02 skip-archives: `loadChange` лише якщо `archivedAt` у вікні; активні завжди; без дати в імені — включати
- 2026-09-02 no-commit-since: не передавати since/until у listCommitsByPath
- 2026-09-02 reload-on-period: зміна періоду тригерить HTTP load; search/архів лишаються без HTTP
- 2026-09-02 skip-stale-refetch: не ганяти повний load при поверненні з деталей, якщо рядки цього проєкту й періоду вже в Pinia
- 2026-09-02 no-url-sync: період лише в Pinia, без query `from`/`to` — Explorer не вимагав deep-link дат; F5 скидає на default 7 днів
- 2026-09-02 period-key: свіжість = `projectId` + `'all'` або `` `${from}:${to}` ``; keep/skip-refetch/оверлей за цим ключем
- 2026-09-02 invalid-window: `from > to` або порожня дата у режимі вікна — немає HTTP, видимий текст біля фільтрів, попередні рядки лишаються
- 2026-09-02 kyiv-calendar: `Intl` `Europe/Kyiv` + зсув календарного дня, не `getDate()` браузера; default `from = today-6`
- 2026-09-02 csv-store-rows: CSV з `analysisStore.rows` (завантажене вікно), не з `filteredRows`
- 2026-09-02 fixtures-pin-period: кейси з архівом `2026-08-28` MUST ставити «весь час» або вікно, що містить дату — не системний годинник CI
- 2026-09-02 api-untouched: `github.js` / `gitlab.js` не редагувати, якщо сигнатура вже `(project, path)`
- 2026-09-03 review-approve: Verdict APPROVE — Tier 1 gate-check + spec-reviewer: proposal/design/tasks/delta узгоджені, шляхи в репо існують, apply без material guessing
- 2026-09-03 mount-watch-guard: два watch (`projectId` + період) — один `loadAnalysis` на mount (guard / не два `immediate`)
- 2026-09-03 details-period-key: чинний кейс деталей «rows already exist» MUST виставити `loadedPeriodKey`, інакше `hasFreshAnalysis` буде false
- 2026-09-03 csv-jsdom-blob: текст CSV у тесті читати з частин конструктора `Blob`, не `blob.text()` — у jsdom немає `Blob.text()`
- 2026-09-03 apply-complete: 14/14 задач імплементовано й перевірено (lint/build/47 tests); заборонені файли не змінювались
