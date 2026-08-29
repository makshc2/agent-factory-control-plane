## Context

Мотивація — `proposal.md` → Why. Вимоги — delta `specs/change-metrics/spec.md`. Живий борд, полер і drawer не змінюють контракт HTTP.

Чинний код (не вигадувати інший):

- `src/utils/changeMetrics.js` — `parseMetricsFile` читає лише `SPEND_KEYS`; `buildChangeMetrics` кладе це в `spend`; `spans` з комітів; `agents` з `parseHandoffAgents` (`local`|`cloud`).
- `src/stores/analysis.js` — уже тягне `metrics.json`, якщо `listFolderEntries` бачить файл; `loadAnalysis(projects)` без зміни HTTP у цій зміні.
- `src/views/AnalysisView.vue` — маршрут `/analysis/:projectId`; колонки без Сесій / Lead time / Моделей; тривалість з `row.spans` через `formatDuration`.
- `src/components/AnalysisDetailsModal.vue` — spend, subagents, acceptance, decisions, git-span, runtime/roles; немає журналу.
- `src/stores/board.js` — `DETAIL_ARTIFACTS` без `metrics.json`. Полер ізольований — так і лишається.
- Тести: `changeMetrics.spec.js`, `analysis.spec.js`, `AnalysisView.spec.js`, `AnalysisDetailsModal.spec.js`.

Стек: Vue 3 `<script setup>`, Pinia, Vue Router, Axios, Vite, JavaScript. Без Options API, без коментарів, без TypeScript, без нових npm, без `fetch(` у api.

Design-brief / Figma: немає.

## Goals / Non-Goals

**Goals:**

- Повний журнал kit v1 у view-model аналізу.
- Відрізнити валідний порожній-spend журнал від відсутнього файлу.
- Kit-час first-class + пріоритет у комірках; git-span зберегти.
- Колонки / модалка / CSV для оператора.

**Non-Goals (дизайн-рівень):**

- Нові HTTP у `analysis.js` / `board.js` / api-клієнтах.
- Нова назва схеми замість `factory-board.change-metrics.v1`.
- Поля аналізу в сторі `board`.
- `metrics.json` у `DETAIL_ARTIFACTS` або drawer.
- Vendor billing; запис журналу; 5-й KPI.

## Decisions

### D1. `parseKitMetrics` + сумісний `parseMetricsFile`

У `src/utils/changeMetrics.js` експортувати `parseKitMetrics(text)`.

Невалідний вхід (`null`, `''`, не-рядок, кидок `JSON.parse`, не-об’єкт, масив) → об’єкт-заглушка:

- `source: 'unknown'`
- `version`, `change`, `createdAt`, `updatedAt`, `archivedAt`: `null`
- `spend`: чотири ключі `null`
- `spendByPlatform`: `cursor`, `claude`, `amp` — кожне `{ inputTokens, outputTokens, totalTokens, costUsd, ampCredits: null, source: 'none' }`
- `spendByModel: []`, `sessions: []`, `phases: {}`, `pending: null`
- `totals`: `{ sessions: null, durationMs: null, leadTimeMs: null, cloudSessions: null }`

Валідний об’єкт → `source: 'metrics-file'`, далі злити:

- `version` — скінченне число або `null`
- `change`, `createdAt`, `updatedAt`, `archivedAt` — непорожній рядок або `null`
- `spend` — чотири ключі через `typeof === 'number' && Number.isFinite`
- `spendByPlatform` — завжди три ключі; для кожного зчитати числа так само; `source` — непорожній рядок або `'none'`; зайві ключі платформ ігнорувати
- `spendByModel` — якщо масив, елементи-об’єкти з `model`, `platform` (рядки або `null`) і числами `inputTokens`, `outputTokens`, `totalTokens`, `costUsd`, `ampCredits`; не-об’єкти пропустити; інакше `[]`
- `totals` — чотири ключі скінченними числами або `null` (не підставляти kit-дефолт `0`, якщо ключа немає)
- `phases` — лише `explore|design|spec|review|apply|archive|other`; кожна фаза: `sessions`, `durationMs`, `inputTokens`, `outputTokens`, `totalTokens`, `costUsd` (число або `null`); `agents`/`models` — масиви непорожніх рядків або `[]`
- `sessions` — масив об’єктів: `startedAt`, `endedAt`, `role`, `phase`, `runtime`, `agentId`, `model`, `platform`, `tasks` (рядок або `null`); числа токенів/вартості/durationMs; `sources` — масив `{ id, platform, model, inputTokens, outputTokens, totalTokens, costUsd, ampCredits, at }` або `[]`
- `pending` — якщо об’єкт (не масив): `{ startedAt: рядок|null, role: рядок|null }`; інакше `null`

`parseMetricsFile(text)` лишається експортом: викликає `parseKitMetrics` і повертає `{ inputTokens, outputTokens, totalTokens, costUsd, source }`, де `source === 'metrics-file'` лише якщо ≥1 скінченне spend-число. Наявні тести overlay MUST лишитися зеленими.

Експортувати `preferDuration(kitMs, span)` → `{ durationMs, source }`: якщо `kitMs` скінченне (включно з `0`) — `{ durationMs: kitMs, source: 'kit-sessions' }`; інакше `{ durationMs: span?.durationMs ?? null, source: 'git-commits' }`.

**Чому не ламати `parseMetricsFile`:** менше регресій у `changeMetrics.spec.js` і `analysis.spec.js`.

**Альтернатива (лише перейменувати)** відхилена: зайвий шум у імпортах.

### D2. `buildChangeMetrics` прикріплює журнал

Сигнатура входу без змін (`artifacts.metrics` як рядок|null). Після парсу:

- `spend` = overlay з D1
- `journal` = результат `parseKitMetrics` (повний об’єкт)
- `kitTimes` = `{ source: journal.source === 'metrics-file' ? 'kit-sessions' : 'unknown', workMs: journal.totals.durationMs, leadMs: journal.totals.leadTimeMs, phases: { explore, design, spec, review, apply, archive, other } }` де кожна фаза = `journal.phases[key]?.durationMs ?? null`

Агенти:

1. Завжди `handoffAgents = parseHandoffAgents(handoff)`; `subagents` завжди звідти.
2. Якщо `journal.source === 'metrics-file'` і (`sessions.length > 0` або фаза має непорожній `agents`/`models`):
   - `roles` — унікальні, порядок: кожен `session.role`, потім `phases[k].agents`
   - `models` — унікальні непорожні `session.model`, потім `phases[k].models`; ніколи `role` / Closed role
   - `runtime` — перший непорожній `session.runtime`, інакше `handoffAgents.runtime`
   - `platforms` — унікальні непорожні `session.platform`; плюс ключ платформи, якщо в рядку є скінченне число (`inputTokens|outputTokens|totalTokens|costUsd|ampCredits`) або `source !== 'none'`
3. Інакше `{ ...handoffAgents, models: [], platforms: [] }`

HTTP стора не чіпати: `analysis.js` уже передає `artifacts.metrics` у `buildChangeMetrics`.

### D3. Таблиця `/analysis/:projectId`

Файл `src/views/AnalysisView.vue` (лише цей SFC).

Порядок `<th>`: Проєкт, Зміна, Архів, Вердикт, Задачі, Цикли рев’ю, Спека, Рев’ю, Apply, Усього, Сесії, Lead time, Токени, Вартість, Агенти, Моделі, Деталі.

- Сесії: `row.journal?.totals?.sessions` якщо не `null`, інакше `—`
- Lead time: `formatDuration(row.kitTimes?.leadMs)` або `—`
- Моделі: `(row.agents?.models ?? []).join(' · ')` або `—`
- Зміна: ім’я; якщо `row.journal?.pending != null` — поруч текст `триває` (клас `analysis-pending`)
- Спека/Рев’ю/Apply/Усього: `preferDuration` з `kitTimes.phases.spec|review|apply` і `kitTimes.workMs` проти відповідного `spans.*`; текст `formatDuration` або `—`
- Tooltip kit: `час сесій kit (metrics.json), не інтервал комітів`
- Tooltip git: чинний рядок з `formatKyivDateTime`, `commitCount`, «інтервал комітів файлів, не wall-clock сесії»
- Токени/вартість/агенти — як зараз зі `spend` / `agents.roles`

Не імпортувати `usePoller`, не викликати `refreshAll` / `loadProjectDetails`.

### D4. Модалка деталей

Файл `src/components/AnalysisDetailsModal.vue`. Українські підписи, дати через `formatKyivDate` / `formatKyivDateTime`, тривалість через `formatDuration`, `null` → `—`.

Секції (після заголовка репо, до або замість плоского списку — дозволено кілька таблиць):

1. Мета: Журнал · джерело (`файл metrics.json` / `невідомо`), версія, створено, оновлено, архівовано, статус (`триває` якщо pending інакше `немає`), роль pending, pending з.
2. Totals: Усього · сесії, хмарні сесії, Kit · робочий час, Kit · lead time.
3. Таблиця платформ: Платформа, Вхід, Вихід, Усього, Вартість, Amp credits, Джерело — рядки cursor, claude, amp.
4. Таблиця моделей: Модель, Платформа, Вхід, Вихід, Усього, Вартість, Amp credits.
5. Таблиця фаз: Фаза, Сесії, Тривалість, Токени, Вартість, Агенти, Моделі.
6. Таблиця сесій: Роль, Фаза, Модель, Платформа, Середовище, Початок, Кінець, Тривалість, Токени, Вартість, Задачі.
7. Чинні git-span рядки (Спека/Рев’ю/Apply/Усього · початок/кінець/тривалість/комітів) і фраза «інтервал комітів файлів, не wall-clock сесії».
8. Чинний spend-overlay (джерело витрат, токени, вартість, субагенти, критерії, рішення, середовище, ролі).

Порожні таблиці моделей/сесій: один рядок або підпис `немає`, не приховувати заголовок секції. Без балу 1–5. Escape / «Закрити» без змін.

### D5. CSV — старі колонки + хвіст журналу

`CSV_HEADER` точно:

`project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents,sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits`

Хвіст: `sessions` = `journal.totals.sessions`; `cloud_sessions` = `journal.totals.cloudSessions`; `work_hours` / `lead_hours` = `csvHours(kitTimes.workMs|leadMs)`; `pending_role` = `journal.pending?.role`; `models` / `platforms` join `'|'`; `amp_credits` = `journal.spendByPlatform.amp.ampCredits` якщо скінченне, інакше порожньо. Git-години без зміни сенсу. BOM лише в UI.

### D6. Стилі

У `src/styles.css`: `.analysis-pending` (компактний янтарний текст, `font-size: 0.75rem`); `.analysis-journal-table` як `.analysis-details-table` з `margin-top: 1rem`. Не змінювати `.board-kpis`.

### D7. Тести

- `changeMetrics.spec.js`: фікстура як архів kit `fix-metrics-model-and-spend` (7 сесій, spend all null, durationMs 2449985, leadTimeMs 3151528); invalid JSON; ampCredits не в costUsd; `preferDuration`; CSV нові заголовки; старі overlay-кейси без змін очікувань.
- `analysis.spec.js`: невалідний JSON → `journal.source === 'unknown'` і без throw; наявний кейс `spend.source === 'unknown'` лишити.
- `AnalysisView.spec.js`: заголовки Сесії / Lead time / Моделі; `—` для null; «триває» коли pending; kit-тривалість у комірці якщо задати рядок через стор або фікстуру metrics.json у `listFolderEntries`.
- `AnalysisDetailsModal.spec.js`: підписи журналу українською; git і kit одночасно; немає `1–5` / `spend.source` як сирого ключа.
- `board.spec.js` не послаблювати: `metrics.json` не в poller / `DETAIL_ARTIFACTS`.

### D8. Ізоляція живого борду

Не редагувати `src/stores/board.js`, `src/api/github.js`, `src/api/gitlab.js`, `src/api/providers.js`, `src/utils/openspecParsers.js`, роутер. Заморожені сигнатури з proposal.

## Risks / Trade-offs

- [Типовий kit-файл має `spend.* === null`] → `journal.source` окремо від `spend.source`; колонка Сесії показує 7.
- [Подвійний час git vs kit] → таблиця пріоритет kit; модалка обидва; CSV git-години стабільні, kit у `work_hours`/`lead_hours`.
- [Amp credits ≠ USD] → окреме поле, ніколи в `costUsd`.
- [Широка таблиця] → наявний горизонтальний скрол `.board-table-wrap`; `min-width` аналізу не зменшувати.
- [Сесії без `platform`] → `platforms` може бути `[]`, доки source платформи `'none'`.

## Migration Plan

Немає зміни localStorage / env. Відкат — revert: аналіз знову spend-only. Файли `metrics.json` у репозиторіях-споживачах пише kit, не борд.

## Open Questions

Немає — рішення оператора зафіксовані.
