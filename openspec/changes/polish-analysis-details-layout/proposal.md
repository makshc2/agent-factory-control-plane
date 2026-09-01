## Why

Дані аналізу й деталей проєкту вже є в Pinia та парсері kit; оператор не може їх нормально читати. `loadAnalysis` щоразу обнуляє рядки й показує рядок «Завантаження аналізу…», тому повернення з деталей на список спалахує порожньою таблицею. Журнал сесій і список змін — широкі таблиці з `overflow-x` і `nowrap`; порожній `pending === null` малює п’ять «—»; шухляда «Деталі» на борді — стіна `<p>`/`<h3>`/`<h4>`.

Design: none

## What Changes

- Прелоадер: повносторінковий кастомний оверлей (спінер + текст «Завантаження аналізу…», без Quasar/`QSpinner`) лише коли на екрані немає що показати. Важкий `loadAnalysis` (борд → аналіз, F5, інший проєкт, deep-link деталей) і навігація, поки дані ще їдуть. MUST NOT вішати оверлей на 60-секундний полер борду. Якщо в Pinia вже є рядки цього `projectId` — не чистити їх і не показувати оверлей (фонове оновлення дозволене).
- Список `/analysis/:projectId` і сторінка деталей `/analysis/:projectId/metrics/:changeRef`: стек карток (блок під блоком) замість широких таблиць. MUST NOT бути горизонтального скролу; довгі імена переносяться всередині картки. Картка сесії: роль (wrap) + фаза; model · platform · env; start → end · duration; tokens · cost · amp · spend source; thread/tasks лише якщо є.
- У деталях блок pending (статус / роль / з / платформа / thread / клієнт) SHALL ховатися, коли `journal.pending === null`. Парсер, CSV (`pending_*`) і бейдж «триває» в списку лишаються. Фічу не видаляти.
- Шухляда «Деталі» на `/`: той самий контент (repo, гілка, коміт, чекбокси `tasks.md`, handoff/review/proposal/decisions/design), розкладений секціями/картками з бейджами на кшталт `.board-kpi` / `.badge`.
- Мова спеки: «модалка» деталей метрик → full-page маршрут (компонент `AnalysisDetailsModal` лишається ім’ям файлу, `role="dialog"` на цій сторінці MUST NOT з’являтися).
- Product override: вимога H-scroll живої таблиці борду MUST NOT поширюватися на аналіз і деталі метрик.

## Capabilities

### New Capabilities

(немає)

### Modified Capabilities

- `change-metrics`: loading-текст → оверлей «немає що показати»; таблиця списку й journal-таблиці → стек карток без overflow-x; pending у деталях hide-when-empty; «модалка» → full-page.
- `project-detail`: візуальна ієрархія шухляди (секції/картки/бейджі) без зміни контракту відкриття/закриття/роуту.
- `factory-board`: уточнити, що горизонтальний скрол живої таблиці стосується лише `/` і MUST NOT застосовуватися до `/analysis` і сторінки деталей метрик.

## Impact

- Код: `src/stores/analysis.js` (+ spec), `src/views/AnalysisView.vue` (+ spec), `src/views/AnalysisDetailsView.vue` (+ spec), `src/components/AnalysisDetailsModal.vue` (+ spec), `src/components/ProjectDetailPanel.vue` (+ spec), `src/styles.css`, новий `src/components/AnalysisLoadingOverlay.vue`.
- API / полер / `src/stores/board.js` / `src/composables/usePoller.js` / жива таблиця `/` / KPI: без змін поведінки полінгу; H-scroll борду лишається.
- Парсер `src/utils/changeMetrics.js` і CSV: без зміни схеми; `pending` лишається в моделі й експорті.
- Залежності: без нових npm; JavaScript, без TypeScript, без Quasar.
- Роутер: існуючі `/analysis/:projectId` і `/analysis/:projectId/metrics/:changeRef` без нових адрес. Шухляда лишається на `/`.

## Non-goals

- Оверлей на 60-секундний полер борду або на індикатор «оновлюється…» у живій таблиці.
- Видалення `pending` з парсера, CSV або бейджа «триває» в списку.
- Конвертація Amp credits у USD; зміна billed / `≈` kit вартості.
- Figma / design-brief / Quasar.
- Hydra SSO.
- Нові HTTP-ендпоінти або зміна `DETAIL_ARTIFACTS` / читання `metrics.json` шухлядою.

## Acceptance criteria

- Порожній стор: оверлей з текстом «Завантаження аналізу…» під час `loadAnalysis`; після успіху оверлей зникає.
- Details → list того самого `projectId`: таблиця/картки не обнуляються; оверлей не спалахує.
- Інший `projectId` або F5 без рядків: оверлей є, доки немає що рендерити.
- Полер борду не показує цей оверлей.
- Список і деталі: немає `.analysis-journal-scroll` / `overflow-x: auto` на journal-блоках; картки стеком; довга роль сесії переноситься.
- `pending === null`: у деталях немає блоку з п’ятьма «—»; CSV і бейдж списку без змін контракту.
- Шухляда: секції з картками/бейджами; той самий контент; `role="dialog"` і закриття overlay/Escape/кнопкою без змін.
