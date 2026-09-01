## Purpose

change-metrics — requirements merged from change add-change-metrics.

## Requirements

### Requirement: Канонічна модель метрик зміни

Система SHALL зводити кожну активну або архівну зміну до view-model зі схемою `factory-board.change-metrics.v1` з полями: `projectId`, `repo`, `provider`, `changeName`, `archived` (boolean), `archiveFolder` (`string` або `null`), `archivedAt` (`string` або `null`), `verdict` (`APPROVE` | `REQUEST CHANGES` | `REJECT` | `null` за тим самим правилом, що й вердикт живої таблиці), `tasksDone` і `tasksTotal` (кількість чекбоксів `[x]`/`[X]` і всіх чекбоксів задач), `reviewLoops` (ціле ≥ 0), `hasAcceptanceCriteria` (boolean), `decisionsCount` (ціле ≥ 0), `spans` з ключами `spec`, `review`, `apply`, `change` (кожне — `{ startedAt, endedAt, durationMs, commitCount, source }` зі `source === 'git-commits'`), `spend` (`inputTokens`, `outputTokens`, `totalTokens`, `costUsd`, `costUsdEstimated` — число або `null`; `source` — `'metrics-file'` або `'unknown'`), `journal` (розпарсений журнал kit: `source`, `version`, `change`, `createdAt`, `updatedAt`, `archivedAt`, `spendByPlatform`, `spendByModel`, `totals`, `phases`, `sessions` з полями kit v1 включно з `spendSource`, `ampCredits`, `costUsdEstimated`, `threadId`, `models`, `sources[].via`, `pending` з `startedAt`, `role`, `platform`, `threadId`, `clientSource`), `kitTimes` (`workMs`, `leadMs`, `phases` з durationMs або `null`, `source` — `'kit-sessions'` або `'unknown'`), `agents` (`runtime` рядок або `null`, `roles` масив унікальних рядків, `subagents` масив рядків, `models` масив унікальних ідентифікаторів LLM, `platforms` масив унікальних рядків). Система MUST NOT додавати суб’єктивний бал якості 1–5. Валідний журнал з порожнім spend MUST бути відрізнений від відсутнього файлу через `journal.source`, а не лише через `spend.source`.

#### Scenario: Повна модель активної зміни

- **WHEN** для активної зміни є `tasks.md` із 3 позначеними з 7 чекбоксів, `review.md` з вердиктом APPROVE без згадок request changes, `proposal.md` із заголовком `## Acceptance criteria`, `decisions.md` із двома рядками `- 2026-08-28 …`, і порожній/відсутній spend
- **THEN** модель має `archived === false`, `archiveFolder === null`, `verdict === 'APPROVE'`, `tasksDone === 3`, `tasksTotal === 7`, `reviewLoops === 0`, `hasAcceptanceCriteria === true`, `decisionsCount === 2`, `spend.source === 'unknown'`

#### Scenario: Ім’я архівної теки з датою

- **WHEN** тека архіву має ім’я `2026-08-28-add-factory-board`
- **THEN** модель має `archived === true`, `archiveFolder === '2026-08-28-add-factory-board'`, `archivedAt === '2026-08-28'`, `changeName === 'add-factory-board'`

#### Scenario: Ім’я архівної теки без дати

- **WHEN** тека архіву має ім’я `hotfix` (не відповідає `YYYY-MM-DD-…`)
- **THEN** модель має `changeName === 'hotfix'`, `archivedAt === null`, `archiveFolder === 'hotfix'`

#### Scenario: Валідний журнал відрізняється від unknown

- **WHEN** `metrics.json` є валідним об’єктом з `sessions.length === 7` і всіма spend-числами `null` (включно з `costUsdEstimated`)
- **THEN** модель має `journal.source === 'metrics-file'`, `journal.totals.sessions === 7`, `spend.source === 'unknown'`, `spend.costUsdEstimated === null`, і MUST NOT виглядати як відсутній файл

### Requirement: Чесність відсутніх даних

Система MUST NOT вигадувати витрати або тривалість. Відсутнє або нечислове значення SHALL бути `null` у моделі. У UI `null` MUST відображатися як `—` і MUST NOT відображатися як `0`, `$0` або `$0.00`. Числовий нуль (наприклад `durationMs === 0` при одному коміті, `costUsd === 0` з файлу метрик, `costUsdEstimated === 0` з файлу метрик, `totals.sessions === 0` у валідному журналі) SHALL показуватися як нуль, а не як `—`. Кожне поле `spans.*` SHALL мати `source === 'git-commits'`. Кожне поле `kitTimes` SHALL мати видиме `source` (`kit-sessions` або `unknown`). Кожне derived поле spend SHALL мати видиме `source` (`metrics-file` або `unknown`). `journal.source` SHALL бути `'metrics-file'` для валідного JSON-об’єкта і `'unknown'` для відсутнього/невалідного файлу. Система MUST NOT додавати `ampCredits` у `costUsd` або `costUsdEstimated`. Система MUST NOT обчислювати USD локальною таблицею ставок (токен × $/1M) на борді. Система MUST NOT конвертувати Amp credits у долари. Показ скінченного `costUsdEstimated` з `metrics.json` з префіксом `≈` і підписом оцінки kit SHALL бути дозволеним (це поле kit, не вигадка борду).

#### Scenario: Порожній span не стає нульовою тривалістю

- **WHEN** для шляху apply немає жодного коміта
- **THEN** `spans.apply.durationMs === null`, `spans.apply.commitCount === 0`, `spans.apply.source === 'git-commits'`, і комірка тривалості Apply показує `—`, а не `0`, якщо kit-фаза apply теж `null`

#### Scenario: Нуль з одного коміта видимий як нуль

- **WHEN** для шляху review є рівно один коміт і kit-фаза review є `null`
- **THEN** `spans.review.durationMs === 0`, і комірка показує нульову тривалість, а не `—`

#### Scenario: Null вартості не рендериться як нуль доларів

- **WHEN** `spend.costUsd === null` і `spend.costUsdEstimated === null` і жоден billed або estimated шлях журналу не дає скінченного числа
- **THEN** комірка вартості показує `—` і MUST NOT містити `$0.00`

#### Scenario: Токени без kit-вартості не вигадують долари

- **WHEN** `spend.inputTokens` і `spend.outputTokens` скінченні, а `spend.costUsd` і `spend.costUsdEstimated` є `null`
- **THEN** комірка вартості показує `—` і MUST NOT містити `≈` і MUST NOT містити `$3` або `$15` як ставку борду

#### Scenario: Валідний журнал з null spend не є порожнім екраном

- **WHEN** журнал валідний, `spend.*` усі `null` (включно з `costUsdEstimated`), і `totals.sessions === 7`
- **THEN** колонка Сесії показує `7`, колонка Lead time показує kit lead (або `—` лише якщо `leadMs` null), і UI MUST NOT зводити рядок до самого `source: unknown` без інших сигналів журналу

### Requirement: Деривація інтервалів з комітів файлів

Інтервали `spans` SHALL обчислюватися лише з комітів, що торкаються відповідних шляхів (не з wall-clock сесій агента). Для активної зміни базовий префікс `openspec/changes/<changeName>/`; для архівної — `openspec/changes/archive/<archiveFolder>/`. Група `spec` — коміти `proposal.md`, `design.md` і шляху `specs/` (унікальні за sha, далі min/max дат). Група `review` — `review.md`. Група `apply` — `tasks.md`. Група `change` — унікальні коміти spec+review+apply. `startedAt` / `endedAt` SHALL бути ISO-рядками дат комітів або `null`. `durationMs` SHALL дорівнювати різниці ended−started, якщо обидві дати є (включно з `0`); якщо комітів немає — `durationMs` MUST бути `null`, не `0`. `commitCount` SHALL бути ≥ 0. `spans.*.source` MUST лишатися `'git-commits'`.

#### Scenario: Span spec з кількох шляхів

- **WHEN** коміт A торкається `proposal.md` о `2026-08-01T10:00:00Z`, коміт B торкається `specs/` о `2026-08-01T12:00:00Z`, і той самий sha не дублюється
- **THEN** `spans.spec.startedAt` є `2026-08-01T10:00:00Z`, `endedAt` є `2026-08-01T12:00:00Z`, `durationMs` є 7200000, `commitCount === 2`, `source === 'git-commits'`

#### Scenario: Порожній набір комітів

- **WHEN** провайдер повертає порожній список комітів для теки зміни
- **THEN** `spans.change` має `startedAt === null`, `endedAt === null`, `durationMs === null`, `commitCount === 0`, `source === 'git-commits'`

#### Scenario: Tooltip чесності

- **WHEN** оператор наводить на комірку тривалості Спека / Рев’ю / Apply / Усього і показано git-span
- **THEN** tooltip містить ISO `startedAt`–`endedAt` (або позначку відсутності дат), `commitCount` і фразу «інтервал комітів файлів, не wall-clock сесії»

#### Scenario: Tooltip називає джерело показаного часу

- **WHEN** оператор наводить на комірку тривалості Спека / Рев’ю / Apply / Усього
- **THEN** tooltip MUST містити джерело показаного числа: якщо показано kit-тривалість — фразу про час сесій kit з `metrics.json`; якщо показано git-span — ISO `startedAt`–`endedAt` (або позначку відсутності дат), `commitCount` і фразу «інтервал комітів файлів, не wall-clock сесії»

### Requirement: Накладання spend з metrics.json

Якщо файл `metrics.json` у теці зміни існує і парситься як JSON-об’єкт, система SHALL читати опційні числові поля `spend.inputTokens`, `spend.outputTokens`, `spend.totalTokens`, `spend.costUsd`, `spend.costUsdEstimated`; нечислові значення SHALL ставати `null`. Якщо присутнє хоча б одне скінченне spend-число серед цих п’яти ключів (включно з самим `costUsdEstimated`), `spend.source` MUST бути `'metrics-file'`; інакше `'unknown'`. Overlay-об’єкт MUST містити `costUsdEstimated` окремо від billed `costUsd`. Той самий валідний об’єкт MUST давати `journal.source === 'metrics-file'`. Невідомі ключі MUST ігноруватися. Невалідний JSON або відсутній файл (404 / порожня відповідь) SHALL давати всі spend-поля `null` (включно з `costUsdEstimated`), `spend.source === 'unknown'`, `journal.source === 'unknown'` і MUST NOT провалювати рядок зміни.

#### Scenario: Валідний overlay

- **WHEN** `metrics.json` містить `{"spend":{"inputTokens":10,"outputTokens":20,"totalTokens":30,"costUsd":1.5}}`
- **THEN** модель має ці чотири числа, `costUsdEstimated === null`, `spend.source === 'metrics-file'` і `journal.source === 'metrics-file'`

#### Scenario: Overlay лише з kit-оцінкою

- **WHEN** `metrics.json` містить `{"spend":{"costUsdEstimated":0.42}}` і billed `costUsd` відсутній
- **THEN** overlay має `costUsd === null`, `costUsdEstimated === 0.42`, `spend.source === 'metrics-file'` і `journal.source === 'metrics-file'`

#### Scenario: Відсутній файл метрик

- **WHEN** читання `metrics.json` повертає відсутність файлу
- **THEN** рядок зміни все одно будується, усі spend-числа `null` (включно з `costUsdEstimated`), `spend.source === 'unknown'`, `journal.source === 'unknown'`

#### Scenario: Невалідний JSON

- **WHEN** вміст `metrics.json` не є валідним JSON-об’єктом
- **THEN** усі spend-числа `null` (включно з `costUsdEstimated`), `spend.source === 'unknown'`, `journal.source === 'unknown'`, рядок зміни не провалюється

#### Scenario: Валідний об’єкт з порожнім spend

- **WHEN** `metrics.json` є об’єктом з `spend` усіма `null` (включно з `costUsdEstimated`) і непорожніми `sessions`
- **THEN** `spend.source === 'unknown'` і `journal.source === 'metrics-file'`

#### Scenario: Рядок оцінки стає null

- **WHEN** `metrics.json` містить `{"spend":{"costUsdEstimated":"0.42"}}`
- **THEN** overlay має `costUsdEstimated === null` і `spend.source === 'unknown'`

### Requirement: Архівні зміни на поверхні аналізу

Поверхня аналізу SHALL включати архівні зміни з `openspec/changes/archive/`, інакше історія планування зникає після `/opsx:archive`. Парсинг імені теки SHALL бути `/^(\d{4}-\d{2}-\d{2})-(.+)$/` → `{ archivedAt, changeName }`; без збігу `changeName` дорівнює імені теки, `archivedAt` є `null`. Жива таблиця активних змін MUST NOT почати показувати архівні рядки через цю вимогу.

#### Scenario: Архів присутній в аналізі

- **WHEN** у репозиторії є активна зміна `add-login` і архівна тека `2026-08-28-add-factory-board`
- **THEN** аналіз містить обидва рядки, а жива таблиця борду як і раніше містить лише `add-login`

#### Scenario: Немає теки archive

- **WHEN** у репозиторії немає `openspec/changes/archive/`
- **THEN** аналіз показує лише активні зміни (або порожній стан, якщо їх немає) і MUST NOT трактувати відсутність archive як помилку проєкту полінгу

### Requirement: Екран аналізу змін

Система SHALL надавати екран аналізу (`/analysis/:projectId`) із заголовком «Аналіз змін», посиланням «Борд» на `/`, кнопкою «Оновити», яка повторно завантажує аналіз поточного проєкту маршруту, і кнопкою «Експорт CSV» (неактивна, якщо немає рядків). Порожній реєстр SHALL показувати «Немає зареєстрованих проєктів.» Якщо `projectId` немає в реєстрі — «Проєкт не знайдено. Відкрийте аналіз кнопкою в таблиці борду.» Після завантаження без рядків SHALL показувати «Немає даних для аналізу.» Під час завантаження, якщо немає рядків цього проєкту для рендеру, SHALL показувати оверлей за вимогою «Оверлей завантаження аналізу»; система MUST NOT заміняти вже показані картки цього проєкту рядком «Завантаження аналізу…» без оверлею-контракту. Помилки завантаження проєктів SHALL показуватися банером і MUST NOT скасовувати успішні проєкти. Клієнтські фільтри (без HTTP): пошук за repo / `changeName`; вибір `усі` / `активні` / `архів`. Кожна видима зміна SHALL бути карткою (не колонкою широкої таблиці) з підписаними полями українською: Проєкт, Зміна, Архів (так/ні та дата, якщо є), Вердикт, Задачі n/m, Цикли рев’ю, Спека, Рев’ю, Apply, Усього, Сесії (`journal.totals.sessions` або `—`), Lead time (`kitTimes.leadMs` або `—`), Токени (`spend.totalTokens` або `—`), Вартість (за вимогою «Резолюція показаної вартості»: billed `$x.xx`, або `≈ $x.xx` з kit `costUsdEstimated`, або `—`), Моделі (`agents.models` або `—`), дія «Деталі метрик». Агенти (runtime і ролі) і платформи MUST лишатися на сторінці деталей журналу і MUST NOT вимагати окремих колонок широкої таблиці списку. Якщо `journal.pending` не `null`, біля назви зміни SHALL бути компактний текст «триває»; tooltip цього тексту SHALL містити непорожні `pending.role`, `pending.platform`, `pending.threadId`, `pending.clientSource`. Поля Спека / Рев’ю / Apply / Усього SHALL показувати kit-тривалість фази / `workMs`, якщо це скінченне число (включно з `0`); інакше git-span відповідної групи (`spec` / `review` / `apply` / `change`). Тривалість SHALL рендеритися наявним українським форматом інтервалу (год/хв/с) або `—`. Tooltip MUST називати джерело показаного числа. Кнопка або контроль «Деталі метрик» SHALL відкривати full-page маршрут `/analysis/:projectId/metrics/:changeRef` (компонент вмісту може лишатися `AnalysisDetailsModal.vue`): мета журналу (версія, createdAt, updatedAt, archivedAt; pending за вимогою «Приховати порожній pending у деталях метрик»), totals (сесії, хмарні сесії, робочий час, lead time), картки spendByPlatform (з ampCredits і source), spendByModel, phases (агенти, моделі, тривалість, spend), sessions (за вимогою «Картка сесії журналу»), sources (id, via, platform, model, tokens, cost, ampCredits, at), git-span і spend-overlay. У картках платформ, моделей, фаз, сесій і sources вартість того запису SHALL показувати скінченне `costUsd` як `$x.xx`, інакше скінченне `costUsdEstimated` як `≈ $x.xx`, інакше `—`; Amp credits SHALL лишатися окремим полем і MUST NOT зливатися з вартістю. Дати на сторінці деталей SHALL бути в часовому поясі Києва. Сторінка деталей MUST NOT показувати бал 1–5 і MUST NOT бути модальним `role="dialog"`. Живий полер борду MUST NOT бути джерелом цих рядків.

#### Scenario: Відкриття аналізу

- **WHEN** оператор відкриває аналіз проєкту з реєстру
- **THEN** екран показує «Аналіз змін» і запускає завантаження аналізу цього проєкту; живий полер борду не є джерелом цих рядків

#### Scenario: Порожній реєстр на аналізі

- **WHEN** реєстр не містить проєктів
- **THEN** екран показує «Немає зареєстрованих проєктів.»

#### Scenario: Фільтр архіву

- **WHEN** серед рядків є активна і архівна зміна, і оператор обирає «архів»
- **THEN** видима лише картка (картки) архівної зміни

#### Scenario: Нові колонки журналу

- **WHEN** рядок має `journal.totals.sessions === 7`, `kitTimes.leadMs === 3151528`, `agents.models === ['cursor-grok-4.6']` і `journal.pending === null`
- **THEN** картка списку (замість широкої таблиці) показує поля «Сесії», «Lead time», «Моделі» зі значеннями `7`, українським інтервалом для lead і `cursor-grok-4.6`, і немає тексту «триває»
- **AND** платформи журналу лишаються видимими на сторінці деталей, не як колонка широкої таблиці списку

#### Scenario: Бейдж pending

- **WHEN** `journal.pending` є об’єктом з `role`
- **THEN** у картці зміни видно текст «триває»
- **AND** tooltip «триває» містить роль pending; якщо є `platform` / `threadId` / `clientSource` — також їх

#### Scenario: Комірка надає перевагу kit

- **WHEN** `kitTimes.phases.spec === 467553` і `spans.spec.durationMs === 7200000`
- **THEN** поле Спека на картці списку показує kit-тривалість (не 2.0 год git) і tooltip вказує час сесій kit

#### Scenario: Розкривні факти якості

- **WHEN** оператор відкриває «Деталі метрик» рядка
- **THEN** видно `spend.source` (як український підпис джерела витрат), subagents, так/ні для acceptance criteria, `decisionsCount` і ISO-дати git-span, і немає балу 1–5
- **AND** це full-page маршрут `/analysis/:projectId/metrics/:changeRef`, елемент `role="dialog"` відсутній

#### Scenario: Деталі журналу в модалці

- **WHEN** оператор відкриває «Деталі метрик» для рядка з валідним журналом на 7 сесій
- **THEN** на full-page сторінці деталей (не `role="dialog"`) видно українські підписи журналу (версія, дати, pending включно з платформою / thread / клієнтом, якщо `pending !== null`), totals, платформи, моделі, фази, сесії (thread, джерело spend, ampCredits), sources, git-span і spend-overlay, і немає балу 1–5
- **AND** сесії та journal-блоки є картками за вимогами «Картковий макет аналізу та деталей без горизонтального скролу» і «Картка сесії журналу»

#### Scenario: Як рахується час у деталях

- **WHEN** `journal.source === 'metrics-file'` або `kitTimes.source === 'kit-sessions'`
- **THEN** рядок «Як рахується час» є «час сесій kit (metrics.json), не інтервал комітів»
- **WHEN** журнал unknown
- **THEN** рядок є «інтервал комітів файлів, не wall-clock сесії»

#### Scenario: Комірка вартості з kit-оцінкою

- **WHEN** рядок має `spend.costUsd === null` і `spend.costUsdEstimated === 0.42`
- **THEN** поле «Вартість» картки аналізу показує `≈ $0.42`
- **AND** `title` поля MUST дорівнювати `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude` і MUST NOT містити `$3 / 1M`

#### Scenario: Оцінка в таблиці платформ деталей

- **WHEN** `journal.spendByPlatform.cursor.costUsd === null` і `journal.spendByPlatform.cursor.costUsdEstimated === 0.18`
- **THEN** у блоці платформ деталей (картка замість широкої таблиці) запис `cursor` у полі Вартість показує `≈ $0.18`
- **AND** поле Amp credits цього запису не містить `0.18`

### Requirement: Експорт CSV

Екран аналізу SHALL дозволяти завантажити CSV усіх завантажених рядків у файл `factory-board-analysis.csv` у кодуванні UTF-8 з BOM для Excel. Заголовки MUST бути стабільними англійськими в цьому порядку: `project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents,sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits,pending_platform,pending_thread_id,pending_client_source,session_spend_sources,thread_ids,cost_usd_estimated`. Колонки `spec_hours`, `review_hours`, `apply_hours`, `change_hours` SHALL лишатися git-span (`spans.*.durationMs`). `work_hours` SHALL бути `kitTimes.workMs/3600000`; `lead_hours` — `kitTimes.leadMs/3600000`. Години SHALL округлюватися до 1 десяткового (`durationMs/3600000`). `null` → порожня клітинка. `roles`, `subagents`, `models`, `platforms`, `session_spend_sources`, `thread_ids` SHALL з’єднуватися через `|`. `sessions` і `cloud_sessions` — `journal.totals.sessions` і `journal.totals.cloudSessions`. `pending_role` / `pending_platform` / `pending_thread_id` / `pending_client_source` — відповідні поля `journal.pending` або порожньо. `session_spend_sources` — унікальні `session.spendSource` у порядку першої появи. `thread_ids` — унікальні `pending.threadId` і `session.threadId`. `amp_credits` — скінченне `journal.spendByPlatform.amp.ampCredits` або порожньо. `cost_usd` SHALL лишатися billed `spend.costUsd` (не оцінка). `cost_usd_estimated` SHALL бути `spend.costUsdEstimated` або порожньо. Кнопка експорту MUST бути неактивною, якщо рядків немає.

#### Scenario: Експорт з BOM

- **WHEN** є щонайменше один рядок аналізу і оператор натискає «Експорт CSV»
- **THEN** завантажується файл `factory-board-analysis.csv`, текст починається з BOM і рядка англійських заголовків у зазначеному порядку

#### Scenario: Порожні години в CSV

- **WHEN** у рядка `spans.spec.durationMs === null`
- **THEN** клітинка `spec_hours` у CSV порожня, а не `0` і не `0.0`

#### Scenario: Нові колонки журналу в CSV

- **WHEN** рядок має `journal.totals.sessions === 7`, `kitTimes.workMs === 2449985`, `kitTimes.leadMs === 3151528`, `journal.pending === null`, `agents.models === ['cursor-grok-4.6']`
- **THEN** CSV містить заголовки `sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits,pending_platform,pending_thread_id,pending_client_source,session_spend_sources,thread_ids,cost_usd_estimated`; клітинка `sessions` є `7`; `work_hours` і `lead_hours` є годинами з 1 десятковим; `pending_role` порожня

#### Scenario: Кнопка неактивна без рядків

- **WHEN** стор аналізу не має рядків
- **THEN** кнопка «Експорт CSV» неактивна

#### Scenario: Оцінка в окремій колонці CSV

- **WHEN** рядок має `spend.costUsd === 1.5` і `spend.costUsdEstimated === 0.42`
- **THEN** клітинка `cost_usd` є `1.5`, клітинка `cost_usd_estimated` є `0.42`, і заголовок `cost_usd_estimated` є останнім у рядку заголовків

#### Scenario: Порожня оцінка в CSV

- **WHEN** у рядка `spend.costUsdEstimated === null`
- **THEN** клітинка `cost_usd_estimated` порожня, а не `0` і не `0.00`


#### Scenario: CSV оцінки не робить walk журналу

- **WHEN** `spend.costUsdEstimated === null` і `journal.spendByPlatform.cursor.costUsdEstimated === 0.18`
- **THEN** клітинка `cost_usd_estimated` порожня, а комірка «Вартість» екрана аналізу є `≈ $0.18`

### Requirement: Агенти з handoff

Якщо журнал має `source === 'metrics-file'` і (`sessions.length > 0` або хоча б одна фаза має непорожній `agents` чи `models`, або `spendByModel` має непорожній `model`), система SHALL брати `agents.roles` з унікальних `session.role` і `phases.*.agents` (порядок першої появи); `agents.models` — з унікальних непорожніх `spendByModel[].model`, `session.model`, `session.models[]`, `session.sources[].model` і `phases.*.models` (ідентифікатори LLM; Closed role і `session.role` MUST NOT ставати моделлю); `agents.runtime` — з першого непорожнього `session.runtime`, інакше з `handoff.md`; `agents.platforms` — унікальні непорожні `pending.platform`, `session.platform`, `session.sources[].platform`, `spendByModel[].platform` плюс ключі `spendByPlatform`, у яких є хоча б одне скінченне число або `source` відмінний від `'none'`. `agents.subagents` SHALL завжди братися з `handoff.md`. Валідний журнал MUST показувати `sessions` і `phases` навіть коли всі `spend.*` є `null`. Якщо журналу немає або в ньому немає сесій/фаз/моделей, система SHALL лишити чинний розбір `handoff.md`: `runtime` як `local` або `cloud` (інакше `null`); `roles` — унікальні next role та Closed role; `models` і `platforms` — порожні масиви; без вигадування runtime поза `local`|`cloud`.

#### Scenario: Runtime і ролі

- **WHEN** журналу немає і `handoff.md` містить next role `Implementer`, секцію Closed role з першим рядком `Architect` і `runtime: local`
- **THEN** `agents.runtime === 'local'`, `agents.roles` містить `Implementer` та `Architect` без дублікатів, `agents.models` є `[]`, `agents.platforms` є `[]`

#### Scenario: Subagents з маркерів

- **WHEN** у секції Subagents to spawn є рядки `- openspec-guide — …` і `- code-writer - …`
- **THEN** `agents.subagents` містить `openspec-guide` і `code-writer`

#### Scenario: Ролі та моделі з журналу

- **WHEN** валідний журнал має сесії з ролями Architect, Spec Reviewer, Implementer та `model` `cursor-grok-4.6`, і фаза spec має `agents: ["Architect", "Spec Architect"]`
- **THEN** `agents.roles` містить ці ролі без дублікатів у порядку першої появи, `agents.models` є `['cursor-grok-4.6']`, і жодна роль не потрапляє в `models`

#### Scenario: Моделі з spendByModel коли session.model порожній

- **WHEN** валідний журнал має сесію `Archiver` з `model: null` і `spendByModel` з `amp-sonnet`
- **THEN** `agents.models` є `['amp-sonnet']`, картка моделей у деталях показує `amp-sonnet`, і `Archiver` не є моделлю

#### Scenario: Runtime з сесії, інакше handoff

- **WHEN** перша сесія має `runtime: 'local'`, а в `handoff.md` runtime відсутній
- **THEN** `agents.runtime === 'local'`

### Requirement: Цикли рев’ю та критерії приймання

`reviewLoops` SHALL дорівнювати кількості збігів `/request[ _-]?changes/gi` у тексті `review.md` і MUST бути `0`, якщо текст відсутній або порожній. `hasAcceptanceCriteria` SHALL бути true тоді й лише тоді, коли текст `proposal.md` відповідає `/^##\s*Acceptance criteria\b/im`. `decisionsCount` SHALL дорівнювати кількості рядків `decisions.md`, що відповідають `/^- \d{4}-\d{2}-\d{2}\b/m`; відсутній файл MUST давати `0`.

#### Scenario: Підрахунок request changes

- **WHEN** `review.md` містить дві згадки `REQUEST CHANGES`
- **THEN** `reviewLoops === 2`

#### Scenario: Немає decisions.md

- **WHEN** файл `decisions.md` відсутній
- **THEN** `decisionsCount === 0` і рядок зміни не провалюється

### Requirement: Повний журнал kit metrics.json

Система SHALL парсити `metrics.json` як журнал agent-orchestrator-kit v1, а не лише overlay `spend`. Якщо текст є валідним JSON-об’єктом (не масив), результат MUST мати `source === 'metrics-file'` навіть коли всі `spend.*` дорівнюють `null`. Якщо текст відсутній, порожній, невалідний JSON, масив або не-об’єкт, результат MUST мати `source === 'unknown'`, порожні колекції за замовчуванням і MUST NOT провалювати рядок зміни. Парсер MUST злити типові ключі як kit: `spendByPlatform` завжди містить ключі `cursor`, `claude`, `amp` (кожне — `inputTokens`, `outputTokens`, `totalTokens`, `costUsd`, `costUsdEstimated`, `ampCredits` як число або `null`; `source` рядок або `'none'`); `spendByModel` — масив (відсутнє/не-масив → `[]`); `sessions` — масив (відсутнє/не-масив → `[]`); кожна сесія SHALL зберігати `spendSource` (відсутнє → `'unreported'`), `ampCredits` (число або `null`), `costUsdEstimated` (число або `null`), `threadId` (рядок або `null`), `models` (масив рядків), `sources` (кожне з `id`, `platform`, `model`, `at`, `via` і числовими spend-полями включно з `ampCredits` і `costUsdEstimated`); `pending` — об’єкт `{ startedAt, role, platform, threadId, clientSource }` або `null`. Числове поле SHALL ставати значенням лише якщо `typeof === 'number'` і `Number.isFinite`; інакше `null`. Рядок `'1'` MUST ставати `null`. Система MUST NOT додавати `ampCredits` у `costUsd` або `costUsdEstimated` і MUST NOT вигадувати USD з Amp credits. Невідомі ключі верхнього рівня MUST ігноруватися. Ключі фаз SHALL братися лише з `explore`, `design`, `spec`, `review`, `apply`, `archive`, `other`; інші ключі `phases` MUST ігноруватися. Кожна фаза SHALL зберігати `costUsdEstimated` як число або `null`. Для відсутнього/невалідного файлу `totals.sessions`, `totals.durationMs`, `totals.leadTimeMs`, `totals.cloudSessions` MUST бути `null` (не `0`).

#### Scenario: Повний журнал з null spend

- **WHEN** `metrics.json` є валідним об’єктом з `totals.sessions === 7`, `sessions.length === 7`, `totals.durationMs === 2449985`, `totals.leadTimeMs === 3151528` і всіма `spend.inputTokens|outputTokens|totalTokens|costUsd|costUsdEstimated === null`
- **THEN** журнал має `source === 'metrics-file'`, сім сесій, ті самі totals, і spend-overlay має всі числа `null` (включно з `costUsdEstimated`) та `source === 'unknown'`

#### Scenario: Відсутній або невалідний файл

- **WHEN** вміст `metrics.json` відсутній, порожній, дорівнює `'{'` або є JSON-масивом
- **THEN** журнал має `source === 'unknown'`, `sessions` є `[]`, `spendByModel` є `[]`, `pending` є `null`, три ключі платформ з null-числами (включно з `costUsdEstimated`), усі totals `null`, і рядок зміни не провалюється

#### Scenario: Legacy без spendByPlatform

- **WHEN** валідний об’єкт не містить `spendByPlatform` і `spendByModel`
- **THEN** журнал має `source === 'metrics-file'`, `spendByPlatform` з ключами `cursor`, `claude`, `amp` (числа `null` включно з `costUsdEstimated`, `source === 'none'`), і `spendByModel === []`

#### Scenario: Amp credits не входять у вартість

- **WHEN** `spend.costUsd` є `null`, а `spendByPlatform.amp.ampCredits === 12`
- **THEN** spend-overlay має `costUsd === null`, і `ampCredits === 12` лишається окремим полем платформи Amp

#### Scenario: Журнал kit 0.8.0 зберігає locked client і sources

- **WHEN** `metrics.json` має `pending.platform: amp`, `pending.threadId`, `pending.clientSource: amp-threads-list`, сесію з `spendSource: adapter`, `threadId`, `ampCredits`, `models: ['glm-5.2','cursor-grok-4.5-low']` і `sources[0].via: amp-cli`
- **THEN** журнал зберігає всі ці поля, `agents.platforms` містить `amp`, `agents.models` містить обидві моделі, і рядок зміни не провалюється

#### Scenario: Legacy сесія без spendSource

- **WHEN** валідна сесія не містить `spendSource`
- **THEN** у моделі `session.spendSource === 'unreported'`

#### Scenario: Журнал зберігає costUsdEstimated на платформі та сесії

- **WHEN** валідний об’єкт має `spendByPlatform.cursor.costUsdEstimated === 0.18`, сесію з `costUsdEstimated === 0.05` і `sources[0].costUsdEstimated === 0.05`, і фазу `apply` з `costUsdEstimated === 0.11`
- **THEN** журнал зберігає ці три числа як скінченні `costUsdEstimated`, а відповідні `costUsd` лишаються `null`, якщо їх не було у файлі

### Requirement: Kit-тривалості як first-class поля

Система SHALL зберігати git-span без зміни формули (`source === 'git-commits'`). Поруч SHALL бути поля kit: `workMs` з `totals.durationMs`, `leadMs` з `totals.leadTimeMs`, тривалості фаз з `phases.*.durationMs` для ключів `explore`, `design`, `spec`, `review`, `apply`, `archive`, `other`. Джерело цих полів SHALL бути `'kit-sessions'`, якщо журнал має `source === 'metrics-file'`, і `'unknown'`, якщо журнал невалідний/відсутній. Відсутнє або нечислове значення MUST бути `null`. Числовий `0` SHALL лишатися `0`.

#### Scenario: Kit work і lead з журналу

- **WHEN** валідний журнал має `totals.durationMs === 2449985` і `totals.leadTimeMs === 3151528`
- **THEN** модель має `workMs === 2449985`, `leadMs === 3151528` і джерело `'kit-sessions'`

#### Scenario: Немає журналу — kit-час null

- **WHEN** `metrics.json` відсутній або невалідний
- **THEN** `workMs`, `leadMs` і всі kit-фази є `null`, джерело kit-часу є `'unknown'`, а `spans.*` як і раніше мають `source === 'git-commits'`

### Requirement: Резолюція показаної вартості

Система SHALL резолвити число комірки «Вартість» екрана аналізу та рядка «Вартість» в деталях лише з полів kit `metrics.json`. Billed вартість SHALL бути першим скінченним `costUsd` у такому порядку: `spend.costUsd`, `journal.spend.costUsd`, сума скінченних `journal.spendByPlatform.*.costUsd`, сума скінченних `journal.spendByModel[].costUsd`, сума скінченних `journal.sessions[].costUsd`, сума скінченних `journal.phases.*.costUsd`. Kit-оцінка SHALL бути першим скінченним `costUsdEstimated` у тому самому порядку обходу, читаючи `costUsdEstimated` замість `costUsd`. Якщо billed скінченне — комірка MUST показати `$X.XX` (два знаки) і MUST NOT ставити префікс `≈`. Якщо billed є `null`, а kit-оцінка скінченна — комірка MUST показати `≈ $Y.YY`. Якщо обидва `null` — комірка MUST бути `—` і MUST NOT містити `$0.00`. Система MUST NOT обчислювати долари з токенів локальними ставками. Система MUST NOT брати Amp `ampCredits` як долари і MUST NOT додавати credits у `costUsd` або `costUsdEstimated`. Читання скінченного kit `costUsdEstimated` SHALL вважатися показом поля файлу, не вигадкою борду. Відсутній ключ `costUsdEstimated` у legacy-файлі SHALL бути `null`. Tooltip для `≈` MUST бути рівно `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude`. Якщо комірка показує billed і `costUsdEstimated` скінченне — tooltip MUST бути рівно `$X.XX billed · ≈ $Y.YY kit` (обидва `toFixed(2)`). Overlay «Вартість» MUST використовувати ті самі правила тексту й tooltip, що й комірка вартості на екрані аналізу. Система MUST NOT викликати Amp, Cursor або Claude API, щоб заповнити ці поля.

#### Scenario: Billed перемагає оцінку

- **WHEN** `spend.costUsd === 1.5` і `spend.costUsdEstimated === 0.42`
- **THEN** комірка «Вартість» є `$1.50` без префікса `≈`
- **AND** tooltip комірки MUST дорівнювати `$1.50 billed · ≈ $0.42 kit`


#### Scenario: Overlay вартості повторює tooltip таблиці

- **WHEN** overlay «Вартість» показує billed `1.5` і `costUsdEstimated === 0.42`
- **THEN** `title` рядка overlay містить `$1.50 billed · ≈ $0.42 kit`

#### Scenario: Лише kit-оцінка

- **WHEN** `spend.costUsd === null`, усі billed `costUsd` у журналі є `null`, і `spend.costUsdEstimated === 0.42`
- **THEN** комірка «Вартість» є `≈ $0.42`
- **AND** tooltip MUST дорівнювати `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude` і MUST NOT містити `$3 / 1M` або `$15 / 1M`

#### Scenario: Оцінка з платформи Cursor коли overlay null

- **WHEN** `spend.costUsd` і `spend.costUsdEstimated` є `null`, усі billed `costUsd` журналу є `null`, і `journal.spendByPlatform.cursor.costUsdEstimated === 0.18`
- **THEN** комірка «Вартість» є `≈ $0.18`

#### Scenario: Обидва null лишають тире навіть за наявності токенів

- **WHEN** `spend.costUsd === null`, `spend.costUsdEstimated === null`, і `spend.totalTokens === 3857043`
- **THEN** комірка «Вартість» є `—` і MUST NOT містити `$` і MUST NOT містити `≈`

#### Scenario: Amp credits не стають коміркою доларів

- **WHEN** `spend.costUsd` і `spend.costUsdEstimated` є `null`, і `journal.spendByPlatform.amp.ampCredits === 12`
- **THEN** комірка «Вартість» є `—`
- **AND** у картці платформ деталей поле Amp credits показує `12`

#### Scenario: Нуль з файлу видимий як нуль

- **WHEN** `spend.costUsd === 0`
- **THEN** комірка «Вартість» є `$0.00`, а не `—`

#### Scenario: Нульова kit-оцінка видима як оцінка

- **WHEN** `spend.costUsd === null` і `spend.costUsdEstimated === 0`
- **THEN** комірка «Вартість» є `≈ $0.00`, а не `—`

### Requirement: Оверлей завантаження аналізу

Система SHALL показувати повносторінковий оверлей завантаження на екранах `/analysis/:projectId` і `/analysis/:projectId/metrics/:changeRef` тоді й лише тоді, коли `loading === true` і на поточному екрані немає що рендерити. «Немає що рендерити» на списку означає: у сторі немає жодного рядка з `projectId` поточного маршруту. На сторінці деталей: немає рядка з цим `projectId` і `changeRef`. Оверлей MUST містити видимий спінер (CSS, не Quasar/`QSpinner`) і текст «Завантаження аналізу…». Якщо для цього `projectId` у Pinia вже є щонайменше один рядок, система MUST NOT очищати ці рядки на старті повторного `loadAnalysis` і MUST NOT показувати оверлей (фонове оновлення дозволене). Перехід на інший `projectId` або перше завантаження без рядків SHALL очистити чужі рядки і показати оверлей, доки не з’явиться вміст або порожній стан. Живий 60-секундний полер борду і рядковий індикатор «оновлюється…» на `/` MUST NOT показувати цей оверлей. Після завершення завантаження без рядків оверлей MUST зникнути, і список SHALL показати «Немає даних для аналізу.» (якщо проєкт у реєстрі).

#### Scenario: Холодне завантаження списку

- **WHEN** оператор відкриває `/analysis/:projectId`, у сторі немає рядків цього проєкту, і `loadAnalysis` ще не завершився
- **THEN** видно оверлей з текстом «Завантаження аналізу…» і спінером
- **AND** оверлей MUST NOT бути компонентом Quasar і MUST NOT використовувати `QSpinner`

#### Scenario: Повернення з деталей не спалахує порожнім списком

- **WHEN** у Pinia вже є рядки з `projectId === P`, і оператор переходить зі сторінки деталей назад на `/analysis/P` (або список знову викликає `loadAnalysis` для `P`)
- **THEN** картки змін `P` лишаються видимими під час запиту
- **AND** оверлей завантаження аналізу відсутній

#### Scenario: Інший проєкт показує оверлей

- **WHEN** у сторі є рядки проєкту A, і оператор відкриває аналіз проєкту B, для якого рядків ще немає
- **THEN** рядки проєкту A не лишаються єдиним вмістом екрана B
- **AND** до завершення завантаження B видно оверлей «Завантаження аналізу…»

#### Scenario: Deep-link деталей без рядків

- **WHEN** оператор відкриває `/analysis/:projectId/metrics/:changeRef` при порожньому сторі, і рядок ще не завантажено
- **THEN** видно той самий оверлей «Завантаження аналізу…», доки немає рядка або кінцевого стану «Зміну не знайдено.»

#### Scenario: Деталі з уже завантаженим проєктом без оверлею

- **WHEN** у сторі вже є рядки цього `projectId`, і оператор відкриває деталі зміни цього проєкту
- **THEN** оверлей відсутній
- **AND** система MUST NOT повторно викликати важкий fetch аналізу лише через навігацію на деталі

#### Scenario: Полер борду не показує оверлей аналізу

- **WHEN** на `/` спрацьовує 60-секундний цикл полера, і рядок проєкту показує «оновлюється…»
- **THEN** оверлей «Завантаження аналізу…» відсутній
- **AND** жива таблиця борду лишається видимою

#### Scenario: Порожній результат після завантаження

- **WHEN** `loadAnalysis` завершився успішно, `loading === false`, проєкт є в реєстрі, і рядків немає
- **THEN** оверлей відсутній
- **AND** екран показує «Немає даних для аналізу.»

### Requirement: Картковий макет аналізу та деталей без горизонтального скролу

Екран списку аналізу і сторінка деталей метрик SHALL показувати вміст стеком карток (блок під блоком), а не широкою таблицею з горизонтальним скролом. Контейнери журналу MUST NOT мати `overflow-x: auto` у поєднанні з `white-space: nowrap` і `width: max-content` (чинні класи `.analysis-journal-scroll` / `.analysis-journal-table` MUST NOT лишати цей контракт). Довгі імена змін, ролей, моделей і репозиторіїв SHALL переноситися всередині картки (`overflow-wrap: anywhere` або еквівалент) і MUST NOT розсувати сторінку по горизонталі. Зведення показників деталей (колишні колонки «Показник» / «Значення») SHALL бути підписаними рядками в одній картці, не двоколонковою таблицею на всю ширину контенту. Блоки платформ, моделей, фаз і sources SHALL бути стеком карток або підписаних блоків, якщо табличний рядок інакше створює overflow-x. Порожній набір моделей / сесій / sources SHALL показувати «немає» в межах блоку, не приховуючи заголовок секції. Клас `.board-table-wrap` на списку аналізу MUST NOT лишатися обгорткою, що дає горизонтальний скрол списку змін.

#### Scenario: Список змін без горизонтального скролу

- **WHEN** оператор відкриває `/analysis/:projectId` з щонайменше однією зміною, і viewport вужчий за суму колишніх колонок таблиці
- **THEN** кожна зміна є окремою карткою в вертикальному стеку
- **AND** обгортка списку MUST NOT мати горизонтальний скрол через широку таблицю

#### Scenario: Довга назва переноситься в картці списку

- **WHEN** `changeName` довший за ширину картки
- **THEN** назва переноситься всередині картки і MUST NOT змушувати `document` скролитись по горизонталі через `nowrap`

#### Scenario: Зведення деталей не є широкою таблицею Показник/Значення

- **WHEN** оператор відкриває сторінку деталей рядка з валідним журналом
- **THEN** мета журналу, totals, spend-overlay і git-span показані як підписані рядки в картці (картках)
- **AND** немає таблиці з заголовками колонок «Показник» і «Значення» як єдиного макета зведення

#### Scenario: Journal-блоки без overflow-x

- **WHEN** на сторінці деталей є платформи, моделі, фази, сесії та sources
- **THEN** жоден із цих блоків не обгорнутий у контейнер з контрактом `.analysis-journal-scroll` (`overflow-x: auto` + таблиця `width: max-content` + `nowrap`)
- **AND** довгі значення переносяться всередині картки

### Requirement: Картка сесії журналу

Кожна сесія `journal.sessions[]` на сторінці деталей SHALL рендеритися окремою карткою зі стеком полів у такому порядку: роль (з переносом довгого рядка) і фаза; рядок `model · platform · env` (порожнє поле → `—` за вимогою чесності); рядок початок → кінець · тривалість (дати в поясі Києва, тривалість чинним українським форматом); рядок токени · вартість · Amp credits · джерело spend; `threadId` і `tasks` SHALL з’являтися лише якщо відповідне значення непорожнє (не `null` і не `''`). Вартість сесії MUST слідувати чинній резолюції billed `$x.xx` / `≈ $x.xx` / `—`; Amp credits MUST лишатися окремим числом і MUST NOT зливатися з вартістю. Порожній масив сесій SHALL показувати «немає» в секції сесій.

#### Scenario: Поля заповненої сесії

- **WHEN** сесія має `role: 'Implementer'`, `phase: 'apply'`, `model: 'glm-5.2'`, `platform: 'amp'`, `runtime: 'local'`, непорожні `startedAt`/`endedAt`, скінченні токени, `spendSource: 'adapter'`, `threadId` і `tasks`
- **THEN** картка показує роль з переносом, фазу, рядок моделі/платформи/середовища, інтервал часу з тривалістю, токени, вартість, Amp credits, підпис джерела spend, thread і задачі

#### Scenario: Thread і tasks ховаються коли порожні

- **WHEN** у сесії `threadId` є `null` і `tasks` є `null` або `''`
- **THEN** картка MUST NOT містити окремі рядки thread і задач
- **AND** роль, фаза, час і spend-рядок лишаються

#### Scenario: Довга роль переноситься

- **WHEN** `session.role` є довгим рядком Closed role плюс опис фази (понад 80 символів)
- **THEN** текст ролі переноситься всередині картки і MUST NOT вимагати горизонтального скролу сторінки

#### Scenario: Немає сесій

- **WHEN** `journal.sessions` є `[]`
- **THEN** секція сесій показує «немає» і MUST NOT малювати порожню широку таблицю на 14 колонок

### Requirement: Приховати порожній pending у деталях метрик

На сторінці деталей метрик система SHALL приховувати блок pending (статус, роль, початок, платформа, thread, клієнт), коли `journal.pending === null`. Система MUST NOT показувати рядок «немає» плюс п’ять значень `—` для порожнього pending. Коли `journal.pending` є об’єктом, блок SHALL бути видимим і показувати непорожні `role`, `startedAt` (Київ), `platform`, `threadId`, `clientSource` (порожнє поле об’єкта → `—` лише всередині видимого блоку). Парсер MUST лишити `pending` у моделі; CSV MUST лишити колонки `pending_role`, `pending_platform`, `pending_thread_id`, `pending_client_source`; на списку аналізу бейдж «триває» MUST лишитися, якщо `pending !== null`. Система MUST NOT видаляти фічу pending.

#### Scenario: Порожній pending не малює тире в деталях

- **WHEN** оператор відкриває деталі рядка з `journal.pending === null`
- **THEN** текст деталей MUST NOT містити підписи `Журнал · статус`, `Журнал · роль pending`, `Журнал · pending з`, `Журнал · pending платформа`, `Журнал · pending thread`, `Журнал · pending клієнт`
- **AND** інші підписи журналу (джерело, версія, дати, totals) лишаються

#### Scenario: Відкритий pending видимий у деталях

- **WHEN** `journal.pending` є об’єктом з `role: 'Spec Reviewer'`, `platform: 'amp'`, `threadId`, `clientSource: 'amp-threads-list'`
- **THEN** у деталях видно ці поля pending (включно з клієнтом і thread)
- **AND** на картці списку цієї зміни є текст «триває»

#### Scenario: CSV і парсер не втрачають pending

- **WHEN** `journal.pending === null` і оператор експортує CSV
- **THEN** заголовки `pending_role,pending_platform,pending_thread_id,pending_client_source` присутні, відповідні клітинки порожні
- **AND** модель рядка все ще має `journal.pending === null`, а не відсутній ключ через видалення фічі
