## MODIFIED Requirements

### Requirement: Канонічна модель метрик зміни

Система SHALL зводити кожну активну або архівну зміну до view-model зі схемою `factory-board.change-metrics.v1` з полями: `projectId`, `repo`, `provider`, `changeName`, `archived` (boolean), `archiveFolder` (`string` або `null`), `archivedAt` (`string` або `null`), `verdict` (`APPROVE` | `REQUEST CHANGES` | `REJECT` | `null` за тим самим правилом, що й вердикт живої таблиці), `tasksDone` і `tasksTotal` (кількість чекбоксів `[x]`/`[X]` і всіх чекбоксів задач), `reviewLoops` (ціле ≥ 0), `hasAcceptanceCriteria` (boolean), `decisionsCount` (ціле ≥ 0), `spans` з ключами `spec`, `review`, `apply`, `change` (кожне — `{ startedAt, endedAt, durationMs, commitCount, source }`, де `source` є `'kit-sessions'`, якщо інтервал узято з меж фаз / сесій журналу kit, або `'git-commits'`, якщо з комітів файлів; `commitCount` є `null` для `'kit-sessions'` і цілим ≥ 0 для `'git-commits'`), `spend` (`inputTokens`, `outputTokens`, `totalTokens`, `costUsd`, `costUsdEstimated`, `costUsdTotal` — число або `null`; `source` — `'metrics-file'` або `'unknown'`), `journal` (розпарсений журнал kit: `source`, `version`, `change`, `createdAt`, `updatedAt`, `archivedAt`, `spendByPlatform`, `spendByModel`, `totals`, `phases`, `phases.*` з `startedAt`, `endedAt`, `leadTimeMs`, `durationMs`, `costUsdTotal`; `sessions` з полями kit v1 включно з `spendSource`, `ampCredits`, `costUsdEstimated`, `costUsdTotal`, `threadId`, `models`, `sources[].via`, `pending` з `startedAt`, `role`, `platform`, `threadId`, `clientSource`), `kitTimes` (`workMs`, `leadMs`, `phases` з durationMs або `null`, `source` — `'kit-sessions'` або `'unknown'`), `agents` (`runtime` рядок або `null`, `roles` масив унікальних рядків, `subagents` масив рядків, `models` масив унікальних ідентифікаторів LLM, `platforms` масив унікальних рядків). Система MUST NOT додавати суб’єктивний бал якості 1–5. Валідний журнал з порожнім spend MUST бути відрізнений від відсутнього файлу через `journal.source`, а не лише через `spend.source`.

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

#### Scenario: Модель зі span з журналу і costUsdTotal

- **WHEN** валідний журнал має `spend.costUsdTotal === 21.0779`, `phases.spec.startedAt`, `phases.spec.endedAt`, `phases.spec.leadTimeMs === 873444`
- **THEN** модель має `spend.costUsdTotal === 21.0779`, `journal.phases.spec.leadTimeMs === 873444`, `spans.spec.source === 'kit-sessions'`, `spans.spec.commitCount === null`

### Requirement: Чесність відсутніх даних

Система MUST NOT вигадувати витрати або тривалість. Відсутнє або нечислове значення SHALL бути `null` у моделі. У UI `null` MUST відображатися як `—` і MUST NOT відображатися як `0`, `$0` або `$0.00`. Числовий нуль (наприклад `durationMs === 0` при одному коміті, `costUsd === 0` з файлу метрик, `costUsdEstimated === 0` з файлу метрик, `totals.sessions === 0` у валідному журналі) SHALL показуватися як нуль, а не як `—`. Кожне поле `spans.*` SHALL мати видиме `source` (`'kit-sessions'` для меж фаз / сесій журналу kit або `'git-commits'` для git-fallback). Кожне поле `kitTimes` SHALL мати видиме `source` (`kit-sessions` або `unknown`). Кожне derived поле spend SHALL мати видиме `source` (`metrics-file` або `unknown`). `journal.source` SHALL бути `'metrics-file'` для валідного JSON-об’єкта і `'unknown'` для відсутнього/невалідного файлу. Система MUST NOT додавати `ampCredits` у `costUsd` або `costUsdEstimated`. Система MUST NOT обчислювати USD локальною таблицею ставок (токен × $/1M) на борді. Система MUST NOT конвертувати Amp credits у долари. Показ скінченного `costUsdEstimated` з `metrics.json` з префіксом `≈` і підписом оцінки kit SHALL бути дозволеним (це поле kit, не вигадка борду).

#### Scenario: Порожній span не стає нульовою тривалістю

- **WHEN** для шляху apply немає жодного коміта і журнал не дає жодної дати фази `apply` (span падає на коміти)
- **THEN** `spans.apply.durationMs === null`, `spans.apply.commitCount === 0`, `spans.apply.source === 'git-commits'`, і комірка тривалості Apply показує `—`, а не `0`, якщо kit-фаза apply теж `null`

#### Scenario: Нуль з одного коміта видимий як нуль

- **WHEN** для шляху review є рівно один коміт, kit-фаза review є `null` і журнал не дає жодної дати фази `review` (span падає на коміти)
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

Інтервали `spans` SHALL братися насамперед із меж фаз журналу kit `metrics.json`, а не з git log. Для груп `spec`, `review`, `apply` джерелом SHALL бути `journal.phases.<spec|review|apply>`: якщо у фази є хоча б одне з `startedAt` / `endedAt`, span MUST мати `startedAt` / `endedAt` фази (ISO або `null` для відсутньої дати), `durationMs` = `leadTimeMs` фази, а якщо його немає — різниця `endedAt − startedAt` (або `null`, якщо однієї з дат немає), `commitCount === null`, `source === 'kit-sessions'`. Для групи `change` span SHALL будуватися з усіх фаз і сесій журналу: `startedAt` = найменший `startedAt` серед `phases.*` і `sessions[]`, `endedAt` = найбільший `endedAt` серед них, `durationMs` = `totals.leadTimeMs`, а якщо його немає — різниця `endedAt − startedAt`, `commitCount === null`, `source === 'kit-sessions'`; якщо жодна фаза й сесія не має жодної дати, span `change` з журналу MUST NOT будуватися. Система MUST NOT брати git log за межі фази, якщо журнал містить хоча б одну дату цієї фази. Git-коміти SHALL бути лише fallback: якщо журнал відсутній / невалідний або відповідна фаза (для `change` — усі фази й сесії) не має жодної дати, span обчислюється з комітів, що торкаються відповідних шляхів (не з wall-clock сесій агента), з незмінною формулою нижче. Для активної зміни базовий префікс `openspec/changes/<changeName>/`; для архівної — `openspec/changes/archive/<archiveFolder>/`. Група `spec` — коміти `proposal.md`, `design.md` і шляху `specs/` (унікальні за sha, далі min/max дат). Група `review` — `review.md`. Група `apply` — `tasks.md`. Група `change` — унікальні коміти spec+review+apply. `startedAt` / `endedAt` SHALL бути ISO-рядками дат комітів або `null`. `durationMs` SHALL дорівнювати різниці ended−started, якщо обидві дати є (включно з `0`); якщо комітів немає — `durationMs` MUST бути `null`, не `0`. `commitCount` SHALL бути ≥ 0. Для git-fallback `spans.*.source` MUST бути `'git-commits'`. Tooltip тривалості MUST називати джерело показаного інтервалу: для kit-span — межі фази за сесіями kit, для git-span — коміти файлів.

#### Scenario: Span фази з журналу перемагає коміти

- **WHEN** валідний журнал має `phases.spec.startedAt === '2026-09-07T15:17:07.490Z'`, `phases.spec.endedAt === '2026-09-07T15:31:40.934Z'`, `phases.spec.leadTimeMs === 873444`, і коміти `proposal.md` датовані `2026-09-01T10:00:00Z` та `2026-09-01T12:00:00Z`
- **THEN** `spans.spec` є `{ startedAt: '2026-09-07T15:17:07.490Z', endedAt: '2026-09-07T15:31:40.934Z', durationMs: 873444, commitCount: null, source: 'kit-sessions' }`
- **AND** дати комітів MUST NOT впливати на `spans.spec`

#### Scenario: Span фази без leadTimeMs

- **WHEN** `phases.review.startedAt === '2026-09-07T15:26:14.472Z'`, `phases.review.endedAt === '2026-09-07T15:39:40.339Z'` і `phases.review.leadTimeMs === null`
- **THEN** `spans.review.durationMs === 805867`, `commitCount === null`, `source === 'kit-sessions'`

#### Scenario: Span усієї зміни з фаз і сесій

- **WHEN** журнал має `phases.explore.startedAt === '2026-09-07T15:03:00.000Z'`, `phases.apply.endedAt === '2026-09-07T16:20:00.000Z'`, сесію з `startedAt === '2026-09-07T15:05:00.000Z'` і `endedAt === '2026-09-07T16:25:00.000Z'`, `totals.leadTimeMs === 4691796`
- **THEN** `spans.change` є `{ startedAt: '2026-09-07T15:03:00.000Z', endedAt: '2026-09-07T16:25:00.000Z', durationMs: 4691796, commitCount: null, source: 'kit-sessions' }`

#### Scenario: Span spec з кількох шляхів

- **WHEN** `metrics.json` відсутній, коміт A торкається `proposal.md` о `2026-08-01T10:00:00Z`, коміт B торкається `specs/` о `2026-08-01T12:00:00Z`, і той самий sha не дублюється
- **THEN** `spans.spec.startedAt` є `2026-08-01T10:00:00Z`, `endedAt` є `2026-08-01T12:00:00Z`, `durationMs` є 7200000, `commitCount === 2`, `source === 'git-commits'`

#### Scenario: Фаза без дат падає на коміти

- **WHEN** журнал валідний, `phases.review` має `sessions === 1` без `startedAt` і без `endedAt`, а `review.md` має один коміт о `2026-08-02T09:00:00Z`
- **THEN** `spans.review` має `startedAt === '2026-08-02T09:00:00Z'`, `commitCount === 1`, `source === 'git-commits'`

#### Scenario: Порожній набір комітів

- **WHEN** провайдер повертає порожній список комітів для теки зміни (журнал не дає жодної дати)
- **THEN** `spans.change` має `startedAt === null`, `endedAt === null`, `durationMs === null`, `commitCount === 0`, `source === 'git-commits'`

#### Scenario: Tooltip чесності

- **WHEN** оператор наводить на комірку тривалості Спека / Рев’ю / Apply / Усього і показано git-span
- **THEN** tooltip містить `startedAt`–`endedAt` у поясі Києва (або позначку відсутності дат), `комітів: <commitCount>` і фразу «інтервал комітів файлів, не wall-clock сесії»

#### Scenario: Tooltip для kit-span

- **WHEN** `kitTimes.phases.spec === null`, `spans.spec.source === 'kit-sessions'` з `startedAt === '2026-09-07T15:17:07.490Z'`, `endedAt === '2026-09-07T15:31:40.934Z'`, і оператор наводить на поле Спека
- **THEN** поле показує `14 хв 33 с`
- **AND** tooltip MUST дорівнювати `07.09.2026, 18:17 – 07.09.2026, 18:31, межі фази за сесіями kit (metrics.json), не коміти` і MUST NOT містити `комітів:`

#### Scenario: Tooltip називає джерело показаного часу

- **WHEN** оператор наводить на комірку тривалості Спека / Рев’ю / Apply / Усього
- **THEN** tooltip MUST містити джерело показаного числа: якщо показано kit-тривалість — фразу про час сесій kit з `metrics.json`; якщо показано kit-span — межі фази й фразу «межі фази за сесіями kit (metrics.json), не коміти»; якщо показано git-span — `startedAt`–`endedAt` (або позначку відсутності дат), `commitCount` і фразу «інтервал комітів файлів, не wall-clock сесії»

### Requirement: Заборона since/until на listing комітів

Система MUST NOT передавати `since` або `until` у listing комітів за шляхом (`listCommitsByPath` або еквівалент провайдера). Коли span будується з комітів (git-fallback за вимогою «Деривація інтервалів з комітів файлів»), він SHALL будуватися з повного набору комітів відповідних шляхів. Вікно періоду MUST NOT обрізати коміти вже завантаженої зміни і MUST NOT перераховувати `spans` / `spend` / `journal` під `from`/`to`.

#### Scenario: Виклик комітів лише зі шляхом

- **WHEN** система завантажує активну зміну і читає коміти `proposal.md` / `review.md` / `tasks.md`
- **THEN** кожен виклик listing комітів має аргументи проєкт і шлях
- **AND** жоден виклик MUST NOT містити `since` або `until`

#### Scenario: Span завантаженої зміни повний

- **WHEN** архівна зміна потрапила у вікно і має коміт `tasks.md` датований роком раніше за `from`, і журнал не дає жодної дати фази `apply` і жодної дати серед фаз і сесій (span падає на коміти)
- **THEN** цей коміт входить у `spans.apply` / `spans.change`
- **AND** `durationMs` MUST NOT бути обрізаний до меж вікна

### Requirement: Накладання spend з metrics.json

Якщо файл `metrics.json` у теці зміни існує і парситься як JSON-об’єкт, система SHALL читати опційні числові поля `spend.inputTokens`, `spend.outputTokens`, `spend.totalTokens`, `spend.costUsd`, `spend.costUsdEstimated`, `spend.costUsdTotal`; нечислові значення SHALL ставати `null`. Якщо присутнє хоча б одне скінченне spend-число серед цих шести ключів (включно з самим `costUsdEstimated`), `spend.source` MUST бути `'metrics-file'`; інакше `'unknown'`. Overlay-об’єкт MUST містити `costUsdEstimated` окремо від billed `costUsd`. Той самий валідний об’єкт MUST давати `journal.source === 'metrics-file'`. Невідомі ключі MUST ігноруватися. Невалідний JSON або відсутній файл (404 / порожня відповідь) SHALL давати всі spend-поля `null` (включно з `costUsdEstimated` і `costUsdTotal`), `spend.source === 'unknown'`, `journal.source === 'unknown'` і MUST NOT провалювати рядок зміни.

#### Scenario: Валідний overlay

- **WHEN** `metrics.json` містить `{"spend":{"inputTokens":10,"outputTokens":20,"totalTokens":30,"costUsd":1.5}}`
- **THEN** модель має ці чотири числа, `costUsdEstimated === null`, `spend.source === 'metrics-file'` і `journal.source === 'metrics-file'`

#### Scenario: Overlay лише з kit-оцінкою

- **WHEN** `metrics.json` містить `{"spend":{"costUsdEstimated":0.42}}` і billed `costUsd` відсутній
- **THEN** overlay має `costUsd === null`, `costUsdEstimated === 0.42`, `spend.source === 'metrics-file'` і `journal.source === 'metrics-file'`

#### Scenario: Відсутній файл метрик

- **WHEN** читання `metrics.json` повертає відсутність файлу
- **THEN** рядок зміни все одно будується, усі spend-числа `null` (включно з `costUsdEstimated` і `costUsdTotal`), `spend.source === 'unknown'`, `journal.source === 'unknown'`

#### Scenario: Невалідний JSON

- **WHEN** вміст `metrics.json` не є валідним JSON-об’єктом
- **THEN** усі spend-числа `null` (включно з `costUsdEstimated` і `costUsdTotal`), `spend.source === 'unknown'`, `journal.source === 'unknown'`, рядок зміни не провалюється

#### Scenario: Валідний об’єкт з порожнім spend

- **WHEN** `metrics.json` є об’єктом з `spend` усіма `null` (включно з `costUsdEstimated` і `costUsdTotal`) і непорожніми `sessions`
- **THEN** `spend.source === 'unknown'` і `journal.source === 'metrics-file'`

#### Scenario: Рядок оцінки стає null

- **WHEN** `metrics.json` містить `{"spend":{"costUsdEstimated":"0.42"}}`
- **THEN** overlay має `costUsdEstimated === null` і `spend.source === 'unknown'`

#### Scenario: Самотній costUsdTotal дає metrics-file

- **WHEN** `metrics.json` містить `{"spend":{"costUsdTotal":21.0779}}` без жодного з решти п’яти spend-чисел
- **THEN** overlay має `costUsdTotal === 21.0779`, `costUsd === null`, `costUsdEstimated === null`, `spend.source === 'metrics-file'` і `journal.source === 'metrics-file'`

### Requirement: Екран аналізу змін

Система SHALL надавати екран аналізу (`/analysis/:projectId`) із заголовком «Аналіз змін», посиланням «Борд» на `/`, кнопкою «Оновити», яка повторно завантажує аналіз поточного проєкту маршруту, і кнопкою «Експорт CSV» (неактивна, якщо немає рядків). Порожній реєстр SHALL показувати «Немає зареєстрованих проєктів.» Якщо `projectId` немає в реєстрі — «Проєкт не знайдено. Відкрийте аналіз кнопкою в таблиці борду.» Після завантаження без рядків SHALL показувати «Немає даних для аналізу.» (включно з випадком, коли вікно не дало жодного рядка). Під час завантаження, якщо немає рядків цього проєкту для поточного періоду для рендеру, SHALL показувати оверлей за вимогою «Оверлей завантаження аналізу»; система MUST NOT заміняти вже показані картки цього проєкту й періоду рядком «Завантаження аналізу…» без оверлею-контракту. Помилки завантаження проєктів SHALL показуватися банером і MUST NOT скасовувати успішні проєкти. Клієнтські фільтри (без HTTP): пошук за repo / `changeName`; вибір `усі` / `активні` / `архів`. Період аналізу SHALL бути окремим HTTP-фільтром завантаження, не клієнтським фільтром уже завантажених рядків: за замовчуванням останні 7 календарних днів у поясі Києва (`from = today-6`, `to = today`, обидва кінці включно); контроль «весь час» SHALL відновлювати чинну поведінку завантаження всіх активних і всіх архівних змін через `loadChange` без skip. Кожна видима зміна SHALL бути карткою (не колонкою широкої таблиці) з підписаними полями українською: Проєкт, Зміна, Архів (так/ні та дата, якщо є), Вердикт, Задачі n/m, Цикли рев’ю, Спека, Рев’ю, Apply, Усього, Сесії (`journal.totals.sessions` або `—`), Lead time (`kitTimes.leadMs` або `—`), Токени (`spend.totalTokens` або `—`), Вартість (за вимогою «Резолюція показаної вартості»: `costUsdTotal` як `$x.xx` або `≈ $x.xx`, інакше billed `$x.xx`, інакше `≈ $x.xx` з kit `costUsdEstimated`, інакше `—`), Моделі (`agents.models` або `—`), дія «Деталі метрик». Агенти (runtime і ролі) і платформи MUST лишатися на сторінці деталей журналу і MUST NOT вимагати окремих колонок широкої таблиці списку. Якщо `journal.pending` не `null`, біля назви зміни SHALL бути компактний текст «триває»; tooltip цього тексту SHALL містити непорожні `pending.role`, `pending.platform`, `pending.threadId`, `pending.clientSource`. Поля Спека / Рев’ю / Apply / Усього SHALL показувати kit-тривалість фази / `workMs`, якщо це скінченне число (включно з `0`); інакше `durationMs` span відповідної групи (`spec` / `review` / `apply` / `change`) — kit-span з меж фаз журналу або git-span fallback за вимогою «Деривація інтервалів з комітів файлів». Тривалість SHALL рендеритися наявним українським форматом інтервалу (год/хв/с) або `—`. Tooltip MUST називати джерело показаного числа. Кнопка або контроль «Деталі метрик» SHALL відкривати full-page маршрут `/analysis/:projectId/metrics/:changeRef` (компонент вмісту може лишатися `AnalysisDetailsModal.vue`): мета журналу (версія, createdAt, updatedAt, archivedAt; pending за вимогою «Приховати порожній pending у деталях метрик»), totals (сесії, хмарні сесії, робочий час, lead time), картки spendByPlatform (з ampCredits і source), spendByModel, phases (агенти, моделі, початок, кінець, lead time, тривалість, spend), sessions (за вимогою «Картка сесії журналу»), sources (id, via, platform, model, tokens, cost, ampCredits, at), інтервали фаз (kit-span або git-span з джерелом) і spend-overlay за вимогою «Сторінка деталей з межами фаз kit і складовими вартості». У картках платформ, моделей, фаз, сесій і sources вартість того запису SHALL показувати скінченне `costUsdTotal` запису як `$x.xx` (з префіксом `≈`, якщо `costUsd` запису не скінченне), інакше скінченне `costUsd` як `$x.xx`, інакше скінченне `costUsdEstimated` як `≈ $x.xx`, інакше `—`; Amp credits SHALL лишатися окремим полем і MUST NOT зливатися з вартістю. Дати на сторінці деталей SHALL бути в часовому поясі Києва. Сторінка деталей MUST NOT показувати бал 1–5 і MUST NOT бути модальним `role="dialog"`. Живий полер борду MUST NOT бути джерелом цих рядків.

#### Scenario: Відкриття аналізу

- **WHEN** оператор відкриває аналіз проєкту з реєстру
- **THEN** екран показує «Аналіз змін» і запускає завантаження аналізу цього проєкту з періодом за замовчуванням (7 календарних днів Києва); живий полер борду не є джерелом цих рядків

#### Scenario: Порожній реєстр на аналізі

- **WHEN** реєстр не містить проєктів
- **THEN** екран показує «Немає зареєстрованих проєктів.»

#### Scenario: Фільтр архіву

- **WHEN** серед завантажених рядків є активна і архівна зміна, і оператор обирає «архів»
- **THEN** видима лише картка (картки) архівної зміни
- **AND** система MUST NOT викликати HTTP лише через цей вибір

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
- **THEN** видно `spend.source` (як український підпис джерела витрат), subagents, так/ні для acceptance criteria, `decisionsCount` і дати інтервалів фаз (kit-span або git-span) з підписом джерела, і немає балу 1–5
- **AND** це full-page маршрут `/analysis/:projectId/metrics/:changeRef`, елемент `role="dialog"` відсутній

#### Scenario: Деталі журналу в модалці

- **WHEN** оператор відкриває «Деталі метрик» для рядка з валідним журналом на 7 сесій
- **THEN** на full-page сторінці деталей (не `role="dialog"`) видно українські підписи журналу (версія, дати, pending включно з платформою / thread / клієнтом, якщо `pending !== null`), totals, платформи, моделі, фази, сесії (thread, джерело spend, ampCredits), sources, інтервали фаз і spend-overlay, і немає балу 1–5
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

#### Scenario: Default вікно на відкритті

- **WHEN** оператор відкриває аналіз проєкту з порожнім стором
- **THEN** контролі періоду показують 7 календарних днів Києва (`from = today-6`, `to = today`)
- **AND** HTTP-завантаження використовує це вікно, а не «весь час»

#### Scenario: Весь час відновлює повне завантаження

- **WHEN** оператор вмикає «весь час» після вікна
- **THEN** виконується новий HTTP `loadAnalysis` без skip архівів за `archivedAt`
- **AND** клієнтські пошук і усі/активні/архів лишаються застосовними до вже завантажених рядків

#### Scenario: Порожнє вікно після load

- **WHEN** `loadAnalysis` завершився успішно, `loading === false`, проєкт є в реєстрі, і жодна зміна не стала рядком цього періоду
- **THEN** екран показує «Немає даних для аналізу.»
- **AND** оверлей відсутній
- **AND** кнопка «Експорт CSV» неактивна

#### Scenario: Запис платформи з costUsdTotal

- **WHEN** `journal.spendByPlatform.amp` має `costUsd === 14.48` і `costUsdTotal === 14.48`, а `journal.spendByPlatform.cursor` має `costUsd === null`, `costUsdEstimated === 4.6377`, `costUsdTotal === 4.6377`
- **THEN** у картках платформ деталей запис `amp` у полі Вартість показує `$14.48`, а запис `cursor` — `≈ $4.64`

### Requirement: Експорт CSV

Екран аналізу SHALL дозволяти завантажити CSV усіх завантажених рядків поточного періоду (календарне вікно або «весь час») у файл `factory-board-analysis.csv` у кодуванні UTF-8 з BOM для Excel. Заголовки MUST бути стабільними англійськими в цьому порядку: `project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents,sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits,pending_platform,pending_thread_id,pending_client_source,session_spend_sources,thread_ids,cost_usd_estimated,cost_usd_total`. Колонки `spec_hours`, `review_hours`, `apply_hours`, `change_hours` SHALL бути `spans.*.durationMs` (kit-span з меж фаз журналу або git-span fallback). `work_hours` SHALL бути `kitTimes.workMs/3600000`; `lead_hours` — `kitTimes.leadMs/3600000`. Години SHALL округлюватися до 1 десяткового (`durationMs/3600000`). `null` → порожня клітинка. `roles`, `subagents`, `models`, `platforms`, `session_spend_sources`, `thread_ids` SHALL з’єднуватися через `|`. `sessions` і `cloud_sessions` — `journal.totals.sessions` і `journal.totals.cloudSessions`. `pending_role` / `pending_platform` / `pending_thread_id` / `pending_client_source` — відповідні поля `journal.pending` або порожньо. `session_spend_sources` — унікальні `session.spendSource` у порядку першої появи. `thread_ids` — унікальні `pending.threadId` і `session.threadId`. `amp_credits` — скінченне `journal.spendByPlatform.amp.ampCredits` або порожньо. `cost_usd` SHALL лишатися billed `spend.costUsd` (не оцінка). `cost_usd_estimated` SHALL бути `spend.costUsdEstimated` або порожньо і MUST бути передостаннім заголовком. `cost_usd_total` SHALL бути `spend.costUsdTotal` overlay (без обходу журналу) або порожньо (ніколи не `0` для `null`) і MUST бути останнім заголовком. Кнопка експорту MUST бути неактивною, якщо рядків немає. CSV MUST NOT містити архівні зміни, які період пропустив (немає рядка в Pinia). Клієнтський фільтр пошуку / усі / активні / архів MUST NOT змінювати набір рядків CSV: експорт SHALL брати завантажені рядки стора, не лише видимі картки.

#### Scenario: Експорт з BOM

- **WHEN** є щонайменше один рядок аналізу і оператор натискає «Експорт CSV»
- **THEN** завантажується файл `factory-board-analysis.csv`, текст починається з BOM і рядка англійських заголовків у зазначеному порядку

#### Scenario: Порожні години в CSV

- **WHEN** у рядка `spans.spec.durationMs === null`
- **THEN** клітинка `spec_hours` у CSV порожня, а не `0` і не `0.0`

#### Scenario: Нові колонки журналу в CSV

- **WHEN** рядок має `journal.totals.sessions === 7`, `kitTimes.workMs === 2449985`, `kitTimes.leadMs === 3151528`, `journal.pending === null`, `agents.models === ['cursor-grok-4.6']`
- **THEN** CSV містить заголовки `sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits,pending_platform,pending_thread_id,pending_client_source,session_spend_sources,thread_ids,cost_usd_estimated,cost_usd_total`; клітинка `sessions` є `7`; `work_hours` і `lead_hours` є годинами з 1 десятковим; `pending_role` порожня

#### Scenario: Кнопка неактивна без рядків

- **WHEN** стор аналізу не має рядків
- **THEN** кнопка «Експорт CSV» неактивна

#### Scenario: Оцінка в окремій колонці CSV

- **WHEN** рядок має `spend.costUsd === 1.5`, `spend.costUsdEstimated === 0.42` і `spend.costUsdTotal === 1.92`
- **THEN** клітинка `cost_usd` є `1.5`, клітинка `cost_usd_estimated` є `0.42`, клітинка `cost_usd_total` є `1.92`, і рядок заголовків закінчується на `,cost_usd_estimated,cost_usd_total`

#### Scenario: Порожній total у CSV

- **WHEN** у рядка `spend.costUsdTotal === null`
- **THEN** клітинка `cost_usd_total` порожня, а не `0` і не `0.00`

#### Scenario: CSV total не робить walk журналу

- **WHEN** `spend.costUsdTotal === null` і `journal.spendByPlatform.amp.costUsdTotal === 14.48`
- **THEN** клітинка `cost_usd_total` порожня, а комірка «Вартість» екрана аналізу є `$14.48`

#### Scenario: Порожня оцінка в CSV

- **WHEN** у рядка `spend.costUsdEstimated === null`
- **THEN** клітинка `cost_usd_estimated` порожня, а не `0` і не `0.00`

#### Scenario: CSV оцінки не робить walk журналу

- **WHEN** `spend.costUsdEstimated === null` і `journal.spendByPlatform.cursor.costUsdEstimated === 0.18`
- **THEN** клітинка `cost_usd_estimated` порожня, а комірка «Вартість» екрана аналізу є `≈ $0.18`

#### Scenario: CSV не містить пропущений архів вікна

- **WHEN** період є вікном, що пропускає архів `2026-01-01-old-change`, і в сторі є лише завантажені рядки цього вікна, і оператор натискає «Експорт CSV»
- **THEN** текст CSV MUST NOT містити `old-change`
- **AND** рядок заголовків лишається в зазначеному порядку без нових колонок дат вікна

### Requirement: Повний журнал kit metrics.json

Система SHALL парсити `metrics.json` як журнал agent-orchestrator-kit v1, а не лише overlay `spend`. Якщо текст є валідним JSON-об’єктом (не масив), результат MUST мати `source === 'metrics-file'` навіть коли всі `spend.*` дорівнюють `null`. Якщо текст відсутній, порожній, невалідний JSON, масив або не-об’єкт, результат MUST мати `source === 'unknown'`, порожні колекції за замовчуванням і MUST NOT провалювати рядок зміни. Парсер MUST злити типові ключі як kit: `spend` і overlay MUST містити `costUsdTotal` (число або `null`); `spendByPlatform` завжди містить ключі `cursor`, `claude`, `amp` (кожне — `inputTokens`, `outputTokens`, `totalTokens`, `costUsd`, `costUsdEstimated`, `costUsdTotal`, `ampCredits` як число або `null`; `source` рядок або `'none'`); `spendByModel` — масив (відсутнє/не-масив → `[]`), кожен запис із `costUsdTotal` (число або `null`); `sessions` — масив (відсутнє/не-масив → `[]`); кожна сесія SHALL зберігати `spendSource` (відсутнє → `'unreported'`), `ampCredits` (число або `null`), `costUsdEstimated` (число або `null`), `costUsdTotal` (число або `null`), `threadId` (рядок або `null`), `models` (масив рядків), `sources` (кожне з `id`, `platform`, `model`, `at`, `via` і числовими spend-полями включно з `ampCredits`, `costUsdEstimated` і `costUsdTotal`); `pending` — об’єкт `{ startedAt, role, platform, threadId, clientSource }` або `null`. Числове поле SHALL ставати значенням лише якщо `typeof === 'number'` і `Number.isFinite`; інакше `null`. Рядок `'1'` MUST ставати `null`. Система MUST NOT додавати `ampCredits` у `costUsd` або `costUsdEstimated` і MUST NOT вигадувати USD з Amp credits. Невідомі ключі верхнього рівня MUST ігноруватися. Ключі фаз SHALL братися лише з `explore`, `design`, `spec`, `review`, `apply`, `archive`, `other`; інші ключі `phases` MUST ігноруватися. Кожна фаза SHALL зберігати `costUsdEstimated`, `costUsdTotal`, `leadTimeMs` як число або `null`, а `startedAt` і `endedAt` — як ISO-рядки, канонізовані тим самим правилом, що інші timestamps журналу, або `null`. Система MUST NOT обчислювати `costUsdTotal` самостійно з `costUsd` / `costUsdEstimated`: поле береться лише з файлу. Система MUST NOT додавати `ampCredits` у `costUsdTotal`. Для відсутнього/невалідного файлу `totals.sessions`, `totals.durationMs`, `totals.leadTimeMs`, `totals.cloudSessions` MUST бути `null` (не `0`).

#### Scenario: Повний журнал з null spend

- **WHEN** `metrics.json` є валідним об’єктом з `totals.sessions === 7`, `sessions.length === 7`, `totals.durationMs === 2449985`, `totals.leadTimeMs === 3151528` і всіма `spend.inputTokens|outputTokens|totalTokens|costUsd|costUsdEstimated === null`
- **THEN** журнал має `source === 'metrics-file'`, сім сесій, ті самі totals, і spend-overlay має всі числа `null` (включно з `costUsdEstimated`) та `source === 'unknown'`

#### Scenario: Відсутній або невалідний файл

- **WHEN** вміст `metrics.json` відсутній, порожній, дорівнює `'{'` або є JSON-масивом
- **THEN** журнал має `source === 'unknown'`, `sessions` є `[]`, `spendByModel` є `[]`, `pending` є `null`, три ключі платформ з null-числами (включно з `costUsdEstimated` і `costUsdTotal`), `spend.costUsdTotal === null`, усі totals `null`, і рядок зміни не провалюється

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

#### Scenario: Журнал v2 зберігає costUsdTotal і межі фаз

- **WHEN** валідний об’єкт має `spend.costUsdTotal === 14.48`, `spendByPlatform.amp.costUsdTotal === 14.48`, `spendByModel[0].costUsdTotal === 6.47`, `phases.spec` з `startedAt === '2026-09-07T15:17:07.490Z'`, `endedAt === '2026-09-07T15:31:40.934Z'`, `leadTimeMs === 873444`, `costUsdTotal === 6.47`, і сесію з `costUsdTotal === 6.47`
- **THEN** журнал зберігає ці числа як скінченні `costUsdTotal`, `spendByPlatform.cursor.costUsdTotal === null`, `phases.spec.startedAt` і `endedAt` є цими ISO-рядками, `phases.spec.leadTimeMs === 873444`

#### Scenario: Legacy журнал без costUsdTotal і дат фаз

- **WHEN** валідний об’єкт має `spend.costUsd === 1.5` без ключа `costUsdTotal` і `phases.spec` лише з `sessions` і `durationMs`
- **THEN** `spend.costUsdTotal === null`, `phases.spec.startedAt === null`, `phases.spec.endedAt === null`, `phases.spec.leadTimeMs === null`, і система MUST NOT підставляти `1.5` у `costUsdTotal`

#### Scenario: Рядок costUsdTotal стає null

- **WHEN** `metrics.json` містить `{"spend":{"costUsdTotal":"21.07"}}`
- **THEN** overlay має `costUsdTotal === null` і `spend.source === 'unknown'`

### Requirement: Kit-тривалості як first-class поля

Система SHALL зберігати `spans` за вимогою «Деривація інтервалів з комітів файлів» (kit-span з меж фаз журналу або git-span fallback з незмінною формулою). Поруч SHALL бути поля kit: `workMs` з `totals.durationMs`, `leadMs` з `totals.leadTimeMs`, тривалості фаз з `phases.*.durationMs` для ключів `explore`, `design`, `spec`, `review`, `apply`, `archive`, `other`. Джерело цих полів SHALL бути `'kit-sessions'`, якщо журнал має `source === 'metrics-file'`, і `'unknown'`, якщо журнал невалідний/відсутній. Відсутнє або нечислове значення MUST бути `null`. Числовий `0` SHALL лишатися `0`. Показана тривалість поля Спека / Рев’ю / Apply / Усього SHALL мати джерело `'kit-sessions'`, якщо kit-тривалість (фаза / `workMs`) скінченна; інакше `'kit-span'`, якщо відповідний span має `source === 'kit-sessions'` (число — `durationMs` span або `null`); інакше `'git-commits'` з `durationMs` git-span або `null`.

#### Scenario: Kit work і lead з журналу

- **WHEN** валідний журнал має `totals.durationMs === 2449985` і `totals.leadTimeMs === 3151528`
- **THEN** модель має `workMs === 2449985`, `leadMs === 3151528` і джерело `'kit-sessions'`

#### Scenario: Немає журналу — kit-час null

- **WHEN** `metrics.json` відсутній або невалідний
- **THEN** `workMs`, `leadMs` і всі kit-фази є `null`, джерело kit-часу є `'unknown'`, а `spans.*` мають `source === 'git-commits'` (fallback на коміти)

#### Scenario: Kit-span коли тривалість фази відсутня

- **WHEN** kit-тривалість фази є `null`, а span фази має `durationMs === 873444` і `source === 'kit-sessions'`
- **THEN** показана тривалість є `{ durationMs: 873444, source: 'kit-span' }`

#### Scenario: Git-span коли журналу немає

- **WHEN** kit-тривалість є `null`, а span має `durationMs === 7200000` і `source === 'git-commits'`
- **THEN** показана тривалість є `{ durationMs: 7200000, source: 'git-commits' }`

### Requirement: Резолюція показаної вартості

Система SHALL резолвити число комірки «Вартість» екрана аналізу та рядка «Вартість» в деталях лише з полів kit `metrics.json`. Headline-вартість SHALL бути `costUsdTotal`, якщо воно скінченне: першим скінченним `costUsdTotal` у такому порядку: `spend.costUsdTotal`, `journal.spend.costUsdTotal`, сума скінченних `journal.spendByPlatform.*.costUsdTotal`, сума скінченних `journal.spendByModel[].costUsdTotal`, сума скінченних `journal.sessions[].costUsdTotal`, сума скінченних `journal.phases.*.costUsdTotal`. Billed вартість SHALL бути першим скінченним `costUsd` у тому самому порядку обходу: `spend.costUsd`, `journal.spend.costUsd`, сума скінченних `journal.spendByPlatform.*.costUsd`, сума скінченних `journal.spendByModel[].costUsd`, сума скінченних `journal.sessions[].costUsd`, сума скінченних `journal.phases.*.costUsd`. Kit-оцінка SHALL бути першим скінченним `costUsdEstimated` у тому самому порядку обходу, читаючи `costUsdEstimated` замість `costUsd`. Результат резолюції SHALL мати форму `{ costUsd, estimated, billedCostUsd, estimatedCostUsd, source }`: якщо total скінченне — `costUsd = total`, `source === 'total'`, `estimated === (billed == null)`; інакше якщо billed скінченне — `costUsd = billed`, `source === 'billed'`, `estimated === false`; інакше якщо оцінка скінченна — `costUsd = оцінка`, `source === 'estimated'`, `estimated === true`, `billedCostUsd === null`; інакше всі числа `null`, `estimated === false`, `source === 'none'`. `billedCostUsd` і `estimatedCostUsd` SHALL бути результатами відповідних обходів (або `null`). Комірка MUST показати `$X.XX` (два знаки) без префікса `≈`, якщо `estimated === false`, і `≈ $X.XX`, якщо `estimated === true`; тобто total із billed-частиною показується без `≈`, а total лише з оцінки — з `≈`. Якщо `costUsd` результату є `null` — комірка MUST бути `—` і MUST NOT містити `$0.00`. Система MUST NOT обчислювати долари з токенів локальними ставками. Система MUST NOT брати Amp `ampCredits` як долари і MUST NOT додавати credits у `costUsd` або `costUsdEstimated`. Читання скінченного kit `costUsdEstimated` SHALL вважатися показом поля файлу, не вигадкою борду. Відсутній ключ `costUsdEstimated` у legacy-файлі SHALL бути `null`. Якщо `source === 'total'` — tooltip MUST бути `разом (costUsdTotal)` плюс, якщо є хоча б одна частина, `: ` і частини `$X.XX billed` та `≈ $Y.YY kit` (лише наявні, обидва `toFixed(2)`, з’єднані ` + `), наприклад `разом (costUsdTotal): $14.48 billed + ≈ $6.60 kit`. Якщо `source === 'estimated'` — tooltip MUST бути рівно `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude`. Якщо `source === 'billed'` і `costUsdEstimated` скінченне — tooltip MUST бути рівно `$X.XX billed · ≈ $Y.YY kit` (обидва `toFixed(2)`); якщо `source === 'billed'` без оцінки — tooltip порожній. Overlay «Вартість» MUST використовувати ті самі правила тексту й tooltip, що й комірка вартості на екрані аналізу. Система MUST NOT викликати Amp, Cursor або Claude API, щоб заповнити ці поля.

#### Scenario: Total перемагає billed і оцінку

- **WHEN** `spend.costUsd === 14.48`, `spend.costUsdEstimated === 6.5979` і `spend.costUsdTotal === 21.0779`
- **THEN** резолюція є `{ costUsd: 21.0779, estimated: false, billedCostUsd: 14.48, estimatedCostUsd: 6.5979, source: 'total' }`
- **AND** комірка «Вартість» є `$21.08` без префікса `≈`
- **AND** tooltip комірки MUST дорівнювати `разом (costUsdTotal): $14.48 billed + ≈ $6.60 kit`

#### Scenario: Total лише з оцінки має ≈

- **WHEN** `spend.costUsd === null`, `spend.costUsdEstimated === 4.6377` і `spend.costUsdTotal === 4.6377`
- **THEN** резолюція є `{ costUsd: 4.6377, estimated: true, billedCostUsd: null, estimatedCostUsd: 4.6377, source: 'total' }`
- **AND** комірка «Вартість» є `≈ $4.64`
- **AND** tooltip комірки MUST дорівнювати `разом (costUsdTotal): ≈ $4.64 kit`

#### Scenario: Total з обходу платформ коли overlay null

- **WHEN** `spend.costUsdTotal === null`, `journal.spend.costUsdTotal === null`, `journal.spendByPlatform.cursor.costUsdTotal === 1.43`, `journal.spendByPlatform.claude.costUsdTotal === 5.16`, `journal.spendByPlatform.amp.costUsdTotal === 14.48` і `journal.spendByPlatform.amp.costUsd === 14.48`
- **THEN** `costUsd` резолюції дорівнює `21.07` (з точністю до двох знаків), `source === 'total'`, `estimated === false`

#### Scenario: Billed перемагає оцінку

- **WHEN** `spend.costUsd === 1.5`, `spend.costUsdEstimated === 0.42` і `costUsdTotal` є `null` на всіх рівнях
- **THEN** резолюція має `source === 'billed'`, `estimated === false`
- **AND** комірка «Вартість» є `$1.50` без префікса `≈`
- **AND** tooltip комірки MUST дорівнювати `$1.50 billed · ≈ $0.42 kit`


#### Scenario: Overlay вартості повторює tooltip таблиці

- **WHEN** overlay «Вартість» показує billed `1.5` і `costUsdEstimated === 0.42`
- **THEN** `title` рядка overlay містить `$1.50 billed · ≈ $0.42 kit`

#### Scenario: Лише kit-оцінка

- **WHEN** `spend.costUsd === null`, усі billed `costUsd` і всі `costUsdTotal` у журналі є `null`, і `spend.costUsdEstimated === 0.42`
- **THEN** резолюція має `source === 'estimated'`, `billedCostUsd === null`
- **AND** комірка «Вартість» є `≈ $0.42`
- **AND** tooltip MUST дорівнювати `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude` і MUST NOT містити `$3 / 1M` або `$15 / 1M`

#### Scenario: Оцінка з платформи Cursor коли overlay null

- **WHEN** `spend.costUsd` і `spend.costUsdEstimated` є `null`, усі billed `costUsd` журналу є `null`, і `journal.spendByPlatform.cursor.costUsdEstimated === 0.18`
- **THEN** комірка «Вартість» є `≈ $0.18`

#### Scenario: Обидва null лишають тире навіть за наявності токенів

- **WHEN** `spend.costUsd === null`, `spend.costUsdEstimated === null`, `spend.costUsdTotal === null`, і `spend.totalTokens === 3857043`
- **THEN** резолюція є `{ costUsd: null, estimated: false, billedCostUsd: null, estimatedCostUsd: null, source: 'none' }`
- **AND** комірка «Вартість» є `—` і MUST NOT містити `$` і MUST NOT містити `≈`

#### Scenario: Amp credits не стають коміркою доларів

- **WHEN** `spend.costUsd`, `spend.costUsdEstimated` і `spend.costUsdTotal` є `null`, і `journal.spendByPlatform.amp.ampCredits === 12`
- **THEN** комірка «Вартість» є `—`
- **AND** у картці платформ деталей поле Amp credits показує `12`

#### Scenario: Нуль з файлу видимий як нуль

- **WHEN** `spend.costUsd === 0`
- **THEN** комірка «Вартість» є `$0.00`, а не `—`

#### Scenario: Нульова kit-оцінка видима як оцінка

- **WHEN** `spend.costUsd === null` і `spend.costUsdEstimated === 0`
- **THEN** комірка «Вартість» є `≈ $0.00`, а не `—`

### Requirement: Картковий макет аналізу та деталей без горизонтального скролу

Екран списку аналізу і сторінка деталей метрик SHALL показувати вміст картками у адаптивній сітці: у ряд стає стільки карток, скільки поміщається за шириною viewport (дві, три або чотири), а не широкою таблицею з горизонтальним скролом. Картка MUST NOT розтягуватися на всю ширину екрана, якщо в ряді лишається вільне місце для іншої картки. Контейнери журналу MUST NOT мати `overflow-x: auto` у поєднанні з `white-space: nowrap` і `width: max-content` (чинні класи `.analysis-journal-scroll` / `.analysis-journal-table` MUST NOT лишати цей контракт). Довгі імена змін, ролей, моделей і репозиторіїв SHALL переноситися всередині картки (`overflow-wrap: anywhere` або еквівалент) і MUST NOT розсувати сторінку по горизонталі. Зведення показників деталей (колишні колонки «Показник» / «Значення») SHALL бути підписаними рядками в одній картці, не двоколонковою таблицею на всю ширину контенту. Блоки платформ, моделей, фаз і sources SHALL бути сіткою карток або підписаних блоків (стільки в ряд, скільки поміщається, до чотирьох), якщо табличний рядок інакше створює overflow-x. Порожній набір моделей / сесій / sources SHALL показувати «немає» в межах блоку, не приховуючи заголовок секції. Клас `.board-table-wrap` на списку аналізу MUST NOT лишатися обгорткою, що дає горизонтальний скрол списку змін.

#### Scenario: Список змін без горизонтального скролу

- **WHEN** оператор відкриває `/analysis/:projectId` з щонайменше однією зміною, і viewport вужчий за суму колишніх колонок таблиці
- **THEN** кожна зміна є окремою карткою в адаптивній сітці (стільки колонок у ряд, скільки поміщається: дві, три або чотири)
- **AND** картка MUST NOT розтягуватися на всю ширину екрана, якщо в ряді лишається місце для іншої картки
- **AND** обгортка списку MUST NOT мати горизонтальний скрол через широку таблицю

#### Scenario: Довга назва переноситься в картці списку

- **WHEN** `changeName` довший за ширину картки
- **THEN** назва переноситься всередині картки і MUST NOT змушувати `document` скролитись по горизонталі через `nowrap`

#### Scenario: Зведення деталей не є широкою таблицею Показник/Значення

- **WHEN** оператор відкриває сторінку деталей рядка з валідним журналом
- **THEN** мета журналу, totals, spend-overlay та інтервали фаз (kit-span або git-span) показані як підписані рядки в картці (картках)
- **AND** немає таблиці з заголовками колонок «Показник» і «Значення» як єдиного макета зведення

#### Scenario: Journal-блоки без overflow-x

- **WHEN** на сторінці деталей є платформи, моделі, фази, сесії та sources
- **THEN** жоден із цих блоків не обгорнутий у контейнер з контрактом `.analysis-journal-scroll` (`overflow-x: auto` + таблиця `width: max-content` + `nowrap`)
- **AND** довгі значення переносяться всередині картки

### Requirement: Картка сесії журналу

Кожна сесія `journal.sessions[]` на сторінці деталей SHALL рендеритися окремою карткою зі стеком полів у такому порядку: роль (з переносом довгого рядка) і фаза; рядок `model · platform · env` (порожнє поле → `—` за вимогою чесності); рядок початок → кінець · тривалість (дати в поясі Києва, тривалість чинним українським форматом); рядок токени · вартість · Amp credits · джерело spend; `threadId` і `tasks` SHALL з’являтися лише якщо відповідне значення непорожнє (не `null` і не `''`). Вартість сесії MUST слідувати правилу вартості запису за вимогою «Екран аналізу змін»: скінченне `costUsdTotal` сесії як `$x.xx` (з префіксом `≈`, якщо `costUsd` сесії не скінченне), інакше скінченне `costUsd` як `$x.xx`, інакше скінченне `costUsdEstimated` як `≈ $x.xx`, інакше `—`; Amp credits MUST лишатися окремим числом і MUST NOT зливатися з вартістю. Порожній масив сесій SHALL показувати «немає» в секції сесій.

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

## ADDED Requirements

### Requirement: Сторінка деталей з межами фаз kit і складовими вартості

Сторінка деталей метрик SHALL показувати секцію з заголовком «Фази OpenSpec (інтервали)» і картками Спека, Рев’ю, Apply, Усього для `spans.spec`, `spans.review`, `spans.apply`, `spans.change`. Підзаголовок секції SHALL бути рівно `Початок і кінець фаз за сесіями kit із metrics.json.`, якщо хоча б один із чотирьох span має `source === 'kit-sessions'`, інакше рівно `Інтервали за комітами файлів спеки, не сесії агентів.`. Кожна картка SHALL містити рядки «Початок» і «Кінець» (дата-час Києва або `—`), «Тривалість» (український формат або `—`), «Джерело» зі значенням `сесії kit (metrics.json)` для `source === 'kit-sessions'` або `коміти файлів` для `source === 'git-commits'`; рядок «Комітів» SHALL бути лише для git-span і MUST NOT з’являтися для kit-span. Блок «Час і витрати» SHALL містити рядок «Вартість» (headline за вимогою «Резолюція показаної вартості»: `$X.XX` або `≈ $X.XX` або `—`), рядок «Вартість · рахунок» (`billedCostUsd` як `$X.XX` або `—`) і рядок «Вартість · оцінка kit» (`estimatedCostUsd` як `≈ $X.XX` або `—`). Картки фаз журналу (`journal.phases.*`) SHALL містити рядки «Початок», «Кінець» (дата-час Києва або `—`) і «Lead time» (`leadTimeMs` в українському форматі або `—`) поруч із «Тривалість» (`durationMs`). Система MUST NOT показувати `$0.00` для `null` і MUST NOT змішувати Amp credits із жодним доларовим рядком.

#### Scenario: Інтервали з kit на сторінці деталей

- **WHEN** `spans.spec` є `{ startedAt: '2026-09-07T15:17:07.490Z', endedAt: '2026-09-07T15:31:40.934Z', durationMs: 873444, commitCount: null, source: 'kit-sessions' }`, а решта span теж мають `source === 'kit-sessions'`
- **THEN** підзаголовок секції є `Початок і кінець фаз за сесіями kit із metrics.json.`
- **AND** картка Спека показує «Початок» `07.09.2026, 18:17`, «Кінець» `07.09.2026, 18:31`, «Тривалість» `14 хв 33 с`, «Джерело» `сесії kit (metrics.json)`
- **AND** секція MUST NOT містити рядок «Комітів»

#### Scenario: Інтервали з комітів на сторінці деталей

- **WHEN** усі чотири span мають `source === 'git-commits'` і `spans.spec.commitCount === 2`
- **THEN** підзаголовок секції є `Інтервали за комітами файлів спеки, не сесії агентів.`
- **AND** картка Спека містить «Комітів» `2` і «Джерело» `коміти файлів`

#### Scenario: Складові вартості в деталях

- **WHEN** `spend.costUsd === 14.48`, `spend.costUsdEstimated === 6.5979`, `spend.costUsdTotal === 21.0779`
- **THEN** блок «Час і витрати» показує «Вартість» `$21.08`, «Вартість · рахунок» `$14.48`, «Вартість · оцінка kit» `≈ $6.60`

#### Scenario: Складові вартості без рахунку

- **WHEN** `spend.costUsd === null`, `spend.costUsdEstimated === 0.42`, `spend.costUsdTotal === null` і журнал не має інших вартостей
- **THEN** «Вартість» є `≈ $0.42`, «Вартість · рахунок» є `—`, «Вартість · оцінка kit» є `≈ $0.42`

#### Scenario: Межі фази в картці фази журналу

- **WHEN** `journal.phases.spec` має `startedAt === '2026-09-07T15:17:07.490Z'`, `endedAt === '2026-09-07T15:31:40.934Z'`, `leadTimeMs === 873444`, `durationMs === 539356`, `costUsd === 6.47`, `costUsdTotal === 6.47`
- **THEN** картка фази `spec` показує «Початок» `07.09.2026, 18:17`, «Кінець» `07.09.2026, 18:31`, «Lead time» `14 хв 33 с`, «Тривалість» `8 хв 59 с`, «Вартість» `$6.47`

#### Scenario: Картка фази без меж

- **WHEN** `journal.phases.apply` має `durationMs === 1200000` без `startedAt`, `endedAt`, `leadTimeMs`
- **THEN** картка фази `apply` показує «Початок» `—`, «Кінець» `—`, «Lead time» `—`, «Тривалість» `20 хв`
