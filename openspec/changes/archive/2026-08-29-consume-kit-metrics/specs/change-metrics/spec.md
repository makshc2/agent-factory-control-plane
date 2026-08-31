## ADDED Requirements

### Requirement: Повний журнал kit metrics.json

Система SHALL парсити `metrics.json` як журнал agent-orchestrator-kit v1, а не лише overlay `spend`. Якщо текст є валідним JSON-об’єктом (не масив), результат MUST мати `source === 'metrics-file'` навіть коли всі `spend.*` дорівнюють `null`. Якщо текст відсутній, порожній, невалідний JSON, масив або не-об’єкт, результат MUST мати `source === 'unknown'`, порожні колекції за замовчуванням і MUST NOT провалювати рядок зміни. Парсер MUST злити типові ключі як kit: `spendByPlatform` завжди містить ключі `cursor`, `claude`, `amp` (кожне — `inputTokens`, `outputTokens`, `totalTokens`, `costUsd`, `ampCredits` як число або `null`; `source` рядок або `'none'`); `spendByModel` — масив (відсутнє/не-масив → `[]`); `sessions` — масив (відсутнє/не-масив → `[]`); `pending` — об’єкт `{ startedAt, role }` або `null`. Числове поле SHALL ставати значенням лише якщо `typeof === 'number'` і `Number.isFinite`; інакше `null`. Рядок `'1'` MUST ставати `null`. Система MUST NOT додавати `ampCredits` у `costUsd` і MUST NOT вигадувати USD з Amp credits. Невідомі ключі верхнього рівня MUST ігноруватися. Ключі фаз SHALL братися лише з `explore`, `design`, `spec`, `review`, `apply`, `archive`, `other`; інші ключі `phases` MUST ігноруватися. Для відсутнього/невалідного файлу `totals.sessions`, `totals.durationMs`, `totals.leadTimeMs`, `totals.cloudSessions` MUST бути `null` (не `0`).

#### Scenario: Повний журнал з null spend

- **WHEN** `metrics.json` є валідним об’єктом з `totals.sessions === 7`, `sessions.length === 7`, `totals.durationMs === 2449985`, `totals.leadTimeMs === 3151528` і всіма `spend.inputTokens|outputTokens|totalTokens|costUsd === null`
- **THEN** журнал має `source === 'metrics-file'`, сім сесій, ті самі totals, і spend-overlay має всі числа `null` та `source === 'unknown'`

#### Scenario: Відсутній або невалідний файл

- **WHEN** вміст `metrics.json` відсутній, порожній, дорівнює `'{'` або є JSON-масивом
- **THEN** журнал має `source === 'unknown'`, `sessions` є `[]`, `spendByModel` є `[]`, `pending` є `null`, три ключі платформ з null-числами, усі totals `null`, і рядок зміни не провалюється

#### Scenario: Legacy без spendByPlatform

- **WHEN** валідний об’єкт не містить `spendByPlatform` і `spendByModel`
- **THEN** журнал має `source === 'metrics-file'`, `spendByPlatform` з ключами `cursor`, `claude`, `amp` (числа `null`, `source === 'none'`), і `spendByModel === []`

#### Scenario: Amp credits не входять у вартість

- **WHEN** `spend.costUsd` є `null`, а `spendByPlatform.amp.ampCredits === 12`
- **THEN** spend-overlay має `costUsd === null`, і `ampCredits === 12` лишається окремим полем платформи Amp

### Requirement: Kit-тривалості як first-class поля

Система SHALL зберігати git-span без зміни формули (`source === 'git-commits'`). Поруч SHALL бути поля kit: `workMs` з `totals.durationMs`, `leadMs` з `totals.leadTimeMs`, тривалості фаз з `phases.*.durationMs` для ключів `explore`, `design`, `spec`, `review`, `apply`, `archive`, `other`. Джерело цих полів SHALL бути `'kit-sessions'`, якщо журнал має `source === 'metrics-file'`, і `'unknown'`, якщо журнал невалідний/відсутній. Відсутнє або нечислове значення MUST бути `null`. Числовий `0` SHALL лишатися `0`.

#### Scenario: Kit work і lead з журналу

- **WHEN** валідний журнал має `totals.durationMs === 2449985` і `totals.leadTimeMs === 3151528`
- **THEN** модель має `workMs === 2449985`, `leadMs === 3151528` і джерело `'kit-sessions'`

#### Scenario: Немає журналу — kit-час null

- **WHEN** `metrics.json` відсутній або невалідний
- **THEN** `workMs`, `leadMs` і всі kit-фази є `null`, джерело kit-часу є `'unknown'`, а `spans.*` як і раніше мають `source === 'git-commits'`

## MODIFIED Requirements

### Requirement: Канонічна модель метрик зміни

Система SHALL зводити кожну активну або архівну зміну до view-model зі схемою `factory-board.change-metrics.v1` з полями: `projectId`, `repo`, `provider`, `changeName`, `archived` (boolean), `archiveFolder` (`string` або `null`), `archivedAt` (`string` або `null`), `verdict` (`APPROVE` | `REQUEST CHANGES` | `REJECT` | `null` за тим самим правилом, що й вердикт живої таблиці), `tasksDone` і `tasksTotal` (кількість чекбоксів `[x]`/`[X]` і всіх чекбоксів задач), `reviewLoops` (ціле ≥ 0), `hasAcceptanceCriteria` (boolean), `decisionsCount` (ціле ≥ 0), `spans` з ключами `spec`, `review`, `apply`, `change` (кожне — `{ startedAt, endedAt, durationMs, commitCount, source }` зі `source === 'git-commits'`), `spend` (`inputTokens`, `outputTokens`, `totalTokens`, `costUsd` — число або `null`; `source` — `'metrics-file'` або `'unknown'`), `journal` (розпарсений журнал kit: `source`, `version`, `change`, `createdAt`, `updatedAt`, `archivedAt`, `spendByPlatform`, `spendByModel`, `totals`, `phases`, `sessions`, `pending`), `kitTimes` (`workMs`, `leadMs`, `phases` з durationMs або `null`, `source` — `'kit-sessions'` або `'unknown'`), `agents` (`runtime` рядок або `null`, `roles` масив унікальних рядків, `subagents` масив рядків, `models` масив унікальних ідентифікаторів LLM, `platforms` масив унікальних рядків). Система MUST NOT додавати суб’єктивний бал якості 1–5. Валідний журнал з порожнім spend MUST бути відрізнений від відсутнього файлу через `journal.source`, а не лише через `spend.source`.

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

- **WHEN** `metrics.json` є валідним об’єктом з `sessions.length === 7` і всіма spend-числами `null`
- **THEN** модель має `journal.source === 'metrics-file'`, `journal.totals.sessions === 7`, `spend.source === 'unknown'`, і MUST NOT виглядати як відсутній файл

### Requirement: Чесність відсутніх даних

Система MUST NOT вигадувати витрати або тривалість. Відсутнє або нечислове значення SHALL бути `null` у моделі. У UI `null` MUST відображатися як `—` і MUST NOT відображатися як `0`, `$0` або `$0.00`. Числовий нуль (наприклад `durationMs === 0` при одному коміті, `costUsd === 0` з файлу метрик, `totals.sessions === 0` у валідному журналі) SHALL показуватися як нуль, а не як `—`. Кожне поле `spans.*` SHALL мати `source === 'git-commits'`. Кожне поле `kitTimes` SHALL мати видиме `source` (`kit-sessions` або `unknown`). Кожне derived поле spend SHALL мати видиме `source` (`metrics-file` або `unknown`). `journal.source` SHALL бути `'metrics-file'` для валідного JSON-об’єкта і `'unknown'` для відсутнього/невалідного файлу. Система MUST NOT додавати `ampCredits` у `costUsd`.

#### Scenario: Порожній span не стає нульовою тривалістю

- **WHEN** для шляху apply немає жодного коміта
- **THEN** `spans.apply.durationMs === null`, `spans.apply.commitCount === 0`, `spans.apply.source === 'git-commits'`, і комірка тривалості Apply показує `—`, а не `0`, якщо kit-фаза apply теж `null`

#### Scenario: Нуль з одного коміта видимий як нуль

- **WHEN** для шляху review є рівно один коміт і kit-фаза review є `null`
- **THEN** `spans.review.durationMs === 0`, і комірка показує нульову тривалість, а не `—`

#### Scenario: Null вартості не рендериться як нуль доларів

- **WHEN** `spend.costUsd === null`
- **THEN** комірка вартості показує `—` і MUST NOT містити `$0.00`

#### Scenario: Валідний журнал з null spend не є порожнім екраном

- **WHEN** журнал валідний, `spend.*` усі `null`, і `totals.sessions === 7`
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

Якщо файл `metrics.json` у теці зміни існує і парситься як JSON-об’єкт, система SHALL читати опційні числові поля `spend.inputTokens`, `spend.outputTokens`, `spend.totalTokens`, `spend.costUsd`; нечислові значення SHALL ставати `null`. Якщо присутнє хоча б одне скінченне spend-число, `spend.source` MUST бути `'metrics-file'`; інакше `'unknown'`. Той самий валідний об’єкт MUST давати `journal.source === 'metrics-file'`. Невідомі ключі MUST ігноруватися. Невалідний JSON або відсутній файл (404 / порожня відповідь) SHALL давати всі spend-поля `null`, `spend.source === 'unknown'`, `journal.source === 'unknown'` і MUST NOT провалювати рядок зміни.

#### Scenario: Валідний overlay

- **WHEN** `metrics.json` містить `{"spend":{"inputTokens":10,"outputTokens":20,"totalTokens":30,"costUsd":1.5}}`
- **THEN** модель має ці чотири числа, `spend.source === 'metrics-file'` і `journal.source === 'metrics-file'`

#### Scenario: Відсутній файл метрик

- **WHEN** читання `metrics.json` повертає відсутність файлу
- **THEN** рядок зміни все одно будується, усі spend-числа `null`, `spend.source === 'unknown'`, `journal.source === 'unknown'`

#### Scenario: Невалідний JSON

- **WHEN** вміст `metrics.json` не є валідним JSON-об’єктом
- **THEN** усі spend-числа `null`, `spend.source === 'unknown'`, `journal.source === 'unknown'`, рядок зміни не провалюється

#### Scenario: Валідний об’єкт з порожнім spend

- **WHEN** `metrics.json` є об’єктом з `spend` усіма `null` і непорожніми `sessions`
- **THEN** `spend.source === 'unknown'` і `journal.source === 'metrics-file'`

### Requirement: Екран аналізу змін

Система SHALL надавати екран аналізу (`/analysis/:projectId`) із заголовком «Аналіз змін», посиланням «Борд» на `/`, кнопкою «Оновити», яка повторно завантажує аналіз поточного проєкту маршруту, і кнопкою «Експорт CSV» (неактивна, якщо немає рядків). Порожній реєстр SHALL показувати «Немає зареєстрованих проєктів.» Якщо `projectId` немає в реєстрі — «Проєкт не знайдено. Відкрийте аналіз кнопкою в таблиці борду.» Після завантаження без рядків SHALL показувати «Немає даних для аналізу.» Під час завантаження SHALL показувати «Завантаження аналізу…». Помилки завантаження проєктів SHALL показуватися банером і MUST NOT скасовувати успішні проєкти. Клієнтські фільтри (без HTTP): пошук за repo / `changeName`; вибір `усі` / `активні` / `архів`. Колонки таблиці українською в такому порядку: Проєкт, Зміна, Архів (так/ні та дата, якщо є), Вердикт, Задачі n/m, Цикли рев’ю, Спека, Рев’ю, Apply, Усього, Сесії (`journal.totals.sessions` або `—`), Lead time (`kitTimes.leadMs` або `—`), Токени (`spend.totalTokens` або `—`), Вартість (`$x.xx` або `—`), Агенти (runtime і ролі), Моделі (`agents.models` через ` · ` або `—`), Деталі. Якщо `journal.pending` не `null`, біля назви зміни SHALL бути компактний текст «триває». Комірки Спека / Рев’ю / Apply / Усього SHALL показувати kit-тривалість фази / `workMs`, якщо це скінченне число (включно з `0`); інакше git-span відповідної групи (`spec` / `review` / `apply` / `change`). Тривалість SHALL рендеритися наявним українським форматом інтервалу (год/хв/с) або `—`. Tooltip MUST називати джерело показаного числа. Кнопка «Деталі метрик» SHALL відкривати модалку: мета журналу (версія, createdAt, updatedAt, archivedAt, pending), totals (сесії, хмарні сесії, робочий час, lead time), таблиці spendByPlatform (з ampCredits і source), spendByModel, phases (агенти, моделі, тривалість, spend), sessions (role, phase, model, platform, runtime, started/ended, duration, tokens, cost, tasks), git-span і spend-overlay. Дати в модалці SHALL бути в часовому поясі Києва. Модалка MUST NOT показувати бал 1–5. Живий полер борду MUST NOT бути джерелом цих рядків.

#### Scenario: Відкриття аналізу

- **WHEN** оператор відкриває аналіз проєкту з реєстру
- **THEN** екран показує «Аналіз змін» і запускає завантаження аналізу цього проєкту; живий полер борду не є джерелом цих рядків

#### Scenario: Порожній реєстр на аналізі

- **WHEN** реєстр не містить проєктів
- **THEN** екран показує «Немає зареєстрованих проєктів.»

#### Scenario: Фільтр архіву

- **WHEN** серед рядків є активна і архівна зміна, і оператор обирає «архів»
- **THEN** видимий лише архівний рядок (рядки)

#### Scenario: Нові колонки журналу

- **WHEN** рядок має `journal.totals.sessions === 7`, `kitTimes.leadMs === 3151528`, `agents.models === ['cursor-grok-4.6']` і `journal.pending === null`
- **THEN** таблиця показує колонки «Сесії», «Lead time», «Моделі» зі значеннями `7`, українським інтервалом для lead і `cursor-grok-4.6`, і немає тексту «триває»

#### Scenario: Бейдж pending

- **WHEN** `journal.pending` є об’єктом з `role`
- **THEN** у рядку видно текст «триває»

#### Scenario: Комірка надає перевагу kit

- **WHEN** `kitTimes.phases.spec === 467553` і `spans.spec.durationMs === 7200000`
- **THEN** комірка Спека показує kit-тривалість (не 2.0 год git) і tooltip вказує час сесій kit

#### Scenario: Розкривні факти якості

- **WHEN** оператор відкриває «Деталі метрик» рядка
- **THEN** видно `spend.source` (як український підпис джерела витрат), subagents, так/ні для acceptance criteria, `decisionsCount` і ISO-дати git-span, і немає балу 1–5

#### Scenario: Деталі журналу в модалці

- **WHEN** оператор відкриває «Деталі метрик» для рядка з валідним журналом на 7 сесій
- **THEN** видно українські підписи журналу (версія, дати, pending), totals, платформи, моделі, фази, сесії, git-span і spend-overlay, і немає балу 1–5

### Requirement: Експорт CSV

Екран аналізу SHALL дозволяти завантажити CSV усіх завантажених рядків у файл `factory-board-analysis.csv` у кодуванні UTF-8 з BOM для Excel. Заголовки MUST бути стабільними англійськими в цьому порядку: `project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents,sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits`. Колонки `spec_hours`, `review_hours`, `apply_hours`, `change_hours` SHALL лишатися git-span (`spans.*.durationMs`). `work_hours` SHALL бути `kitTimes.workMs/3600000`; `lead_hours` — `kitTimes.leadMs/3600000`. Години SHALL округлюватися до 1 десяткового (`durationMs/3600000`). `null` → порожня клітинка. `roles`, `subagents`, `models`, `platforms` SHALL з’єднуватися через `|`. `sessions` і `cloud_sessions` — `journal.totals.sessions` і `journal.totals.cloudSessions`. `pending_role` — `journal.pending.role` або порожньо. `amp_credits` — скінченне `journal.spendByPlatform.amp.ampCredits` або порожньо. Кнопка експорту MUST бути неактивною, якщо рядків немає.

#### Scenario: Експорт з BOM

- **WHEN** є щонайменше один рядок аналізу і оператор натискає «Експорт CSV»
- **THEN** завантажується файл `factory-board-analysis.csv`, текст починається з BOM і рядка англійських заголовків у зазначеному порядку

#### Scenario: Порожні години в CSV

- **WHEN** у рядка `spans.spec.durationMs === null`
- **THEN** клітинка `spec_hours` у CSV порожня, а не `0` і не `0.0`

#### Scenario: Нові колонки журналу в CSV

- **WHEN** рядок має `journal.totals.sessions === 7`, `kitTimes.workMs === 2449985`, `kitTimes.leadMs === 3151528`, `journal.pending === null`, `agents.models === ['cursor-grok-4.6']`
- **THEN** CSV містить заголовки `sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits`; клітинка `sessions` є `7`; `work_hours` і `lead_hours` є годинами з 1 десятковим; `pending_role` порожня

#### Scenario: Кнопка неактивна без рядків

- **WHEN** стор аналізу не має рядків
- **THEN** кнопка «Експорт CSV» неактивна

### Requirement: Агенти з handoff

Якщо журнал має `source === 'metrics-file'` і (`sessions.length > 0` або хоча б одна фаза має непорожній `agents` чи `models`), система SHALL брати `agents.roles` з унікальних `session.role` і `phases.*.agents` (порядок першої появи); `agents.models` — з унікальних непорожніх `session.model` і `phases.*.models` (ідентифікатори LLM; Closed role і `session.role` MUST NOT ставати моделлю); `agents.runtime` — з першого непорожнього `session.runtime`, інакше з `handoff.md`; `agents.platforms` — унікальні непорожні `session.platform` плюс ключі `spendByPlatform`, у яких є хоча б одне скінченне число або `source` відмінний від `'none'`. `agents.subagents` SHALL завжди братися з `handoff.md`. Якщо журналу немає або в ньому немає сесій/фаз з агентами, система SHALL лишити чинний розбір `handoff.md`: `runtime` як `local` або `cloud` (інакше `null`); `roles` — унікальні next role та Closed role; `models` і `platforms` — порожні масиви; без вигадування runtime поза `local`|`cloud`.

#### Scenario: Runtime і ролі

- **WHEN** журналу немає і `handoff.md` містить next role `Implementer`, секцію Closed role з першим рядком `Architect` і `runtime: local`
- **THEN** `agents.runtime === 'local'`, `agents.roles` містить `Implementer` та `Architect` без дублікатів, `agents.models` є `[]`, `agents.platforms` є `[]`

#### Scenario: Subagents з маркерів

- **WHEN** у секції Subagents to spawn є рядки `- openspec-guide — …` і `- code-writer - …`
- **THEN** `agents.subagents` містить `openspec-guide` і `code-writer`

#### Scenario: Ролі та моделі з журналу

- **WHEN** валідний журнал має сесії з ролями Architect, Spec Reviewer, Implementer та `model` `cursor-grok-4.6`, і фаза spec має `agents: ["Architect", "Spec Architect"]`
- **THEN** `agents.roles` містить ці ролі без дублікатів у порядку першої появи, `agents.models` є `['cursor-grok-4.6']`, і жодна роль не потрапляє в `models`

#### Scenario: Runtime з сесії, інакше handoff

- **WHEN** перша сесія має `runtime: 'local'`, а в `handoff.md` runtime відсутній
- **THEN** `agents.runtime === 'local'`
