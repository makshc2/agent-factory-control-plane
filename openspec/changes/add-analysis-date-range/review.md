# Spec Review

**Change:** add-analysis-date-range
**Date:** 2026-09-03
**Verdict:** APPROVE

## Checklist summary
- Proposal: ✓
- Design: ✓
- Tasks: ✓
- Delta specs: ✓

## Findings

Немає блокуючих розбіжностей.

## Notes

- **Consistency:** proposal ↔ design (D1–D10) ↔ tasks 1.1–5.3 розповідають ту саму історію: період ріже `loadChange` архівів, не spans/spend; default 7 днів Київ; native date + «весь час»; ключ `projectId`+`'all'` / `` `${from}:${to}` ``; CSV = `analysisStore.rows`; без URL-sync і без нового API.
- **Delta specs:** ADDED (вікно, skip, since/until, контролі, reload) + MODIFIED (архіви, екран, CSV, оверлей) покривають змінену поведінку. Сценарій «архів присутній» коректно звужено до режиму «весь час».
- **Main specs:** конфлікту немає — delta замінює саме ті вимоги `change-metrics`, які змінюються. `factory-board` (архіви не на `/`), `board-polling` (полер не вантажить аналіз) і `artifact-ingestion` (listing архіву без дат) лишаються чинними.
- **Scope:** Non-goals дотримані (немає backend, VueDatePicker, URL `from`/`to`, правок борду/полера/формул).
- **Task self-sufficiency:** Files/Do/Done-when достатні (імена util, контракт стора, точні рядки валідації, кейси skip/`hotfix`/keep/CSV). Дрібні пастки для apply — у `apply-notes.md` (подвійний watch на mount; чинний кейс деталей без `loadedPeriodKey`).
- **Vue 3:** `<script setup>`, Pinia setup store, HTTP через чинний store/Axios-клієнти, конкретні шляхи під `src/`, без UI-рефакторів поза `.board-filters`.
- Шляхи tasks існують: `src/stores/analysis.js` (+ spec), `src/views/AnalysisView.vue` (+ spec), `src/views/AnalysisDetailsView.vue` (+ spec), `src/styles.css`, `src/api/github.js` / `gitlab.js` уже `(project, path)` без `since`/`until`. `analysisPeriod.js` — новий файл.
