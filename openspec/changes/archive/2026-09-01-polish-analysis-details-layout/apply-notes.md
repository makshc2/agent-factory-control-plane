# Apply notes — polish-analysis-details-layout

- `loadAnalysis`: `keep` лише якщо `projects.length === 1` і вже є рядки цього id. Успіх рахувати прапорцем, не `collected.length === 0` (порожній успіх має замінити рядки). Повна помилка при `keep` — лишити старі рядки.
- Оверлей: формули задачі 2.2 (`project != null`). CSS `z-index: 30` (шухляда 40, тости 60). Не імпортувати в BoardView / ProjectDetailPanel / poller.
- Список: `.analysis-change-card`, без `.board-table-wrap` / `.analysis-table`. Не повертати «Агенти»/«Платформи». `costLabel` / `preferDuration` без зміни формул.
- Деталі: не перейменовувати `AnalysisDetailsModal.vue`, без `role="dialog"`. `pending === null` — сховати шість підписів. Сесія: `runtime` як середовище; thread/tasks лише якщо не `—`. Прибрати `.analysis-journal-scroll`.
- Шухляда: не чіпати props/emits/Escape/overlay/`role="dialog"`. Вердикт як BoardTable (`APPROVE` → `badge-verdict-approve`, `REQUEST CHANGES` → `badge-verdict-changes`). `nextRole` — бейдж. Не читати `metrics.json`.
- Не чіпати: `board.js`, `usePoller.js`, `BoardTable.vue`, `BoardView.vue`, `changeMetrics.js`, роутер, CSV, Amp→USD. Без Quasar / Options API / TS / коментарів.
- Перевірка: `npm run lint`. Тести не ганяти, доки оператор не попросить.
