## Purpose

change-metrics — requirements merged from change add-change-metrics.

## Requirements

### Requirement: Канонічна модель метрик зміни

Система SHALL зводити кожну активну або архівну зміну до view-model зі схемою `factory-board.change-metrics.v1` з полями: `projectId`, `repo`, `provider`, `changeName`, `archived` (boolean), `archiveFolder` (`string` або `null`), `archivedAt` (`string` або `null`), `verdict` (`APPROVE` | `REQUEST CHANGES` | `REJECT` | `null` за тим самим правилом, що й вердикт живої таблиці), `tasksDone` і `tasksTotal` (кількість чекбоксів `[x]`/`[X]` і всіх чекбоксів задач), `reviewLoops` (ціле ≥ 0), `hasAcceptanceCriteria` (boolean), `decisionsCount` (ціле ≥ 0), `spans` з ключами `spec`, `review`, `apply`, `change` (кожне — `{ startedAt, endedAt, durationMs, commitCount, source }`), `spend` (`inputTokens`, `outputTokens`, `totalTokens`, `costUsd` — число або `null`; `source` — `'metrics-file'` або `'unknown'`), `agents` (`runtime` рядок або `null`, `roles` масив унікальних рядків, `subagents` масив рядків). Система MUST NOT додавати суб’єктивний бал якості 1–5.

#### Scenario: Повна модель активної зміни

- **WHEN** для активної зміни є `tasks.md` із 3 позначеними з 7 чекбоксів, `review.md` з вердиктом APPROVE без згадок request changes, `proposal.md` із заголовком `## Acceptance criteria`, `decisions.md` із двома рядками `- 2026-08-28 …`, і порожній spend
- **THEN** модель має `archived === false`, `archiveFolder === null`, `verdict === 'APPROVE'`, `tasksDone === 3`, `tasksTotal === 7`, `reviewLoops === 0`, `hasAcceptanceCriteria === true`, `decisionsCount === 2`, `spend.source === 'unknown'`

#### Scenario: Ім’я архівної теки з датою

- **WHEN** тека архіву має ім’я `2026-08-28-add-factory-board`
- **THEN** модель має `archived === true`, `archiveFolder === '2026-08-28-add-factory-board'`, `archivedAt === '2026-08-28'`, `changeName === 'add-factory-board'`

#### Scenario: Ім’я архівної теки без дати

- **WHEN** тека архіву має ім’я `hotfix` (не відповідає `YYYY-MM-DD-…`)
- **THEN** модель має `changeName === 'hotfix'`, `archivedAt === null`, `archiveFolder === 'hotfix'`

### Requirement: Чесність відсутніх даних

Система MUST NOT вигадувати витрати або тривалість. Відсутнє або нечислове значення SHALL бути `null` у моделі. У UI `null` MUST відображатися як `—` і MUST NOT відображатися як `0`, `$0` або `$0.00`. Числовий нуль (наприклад `durationMs === 0` при одному коміті або `costUsd === 0` з файлу метрик) SHALL показуватися як нуль, а не як `—`. Кожне derived поле тривалості SHALL мати `source === 'git-commits'`. Кожне derived поле spend SHALL мати видиме `source` (`metrics-file` або `unknown`).

#### Scenario: Порожній span не стає нульовою тривалістю

- **WHEN** для шляху apply немає жодного коміта
- **THEN** `spans.apply.durationMs === null`, `spans.apply.commitCount === 0`, `spans.apply.source === 'git-commits'`, і комірка тривалості Apply показує `—`, а не `0.0 год`

#### Scenario: Нуль з одного коміта видимий як нуль

- **WHEN** для шляху review є рівно один коміт
- **THEN** `spans.review.durationMs === 0`, і комірка показує `0.0 год`, а не `—`

#### Scenario: Null вартості не рендериться як нуль доларів

- **WHEN** `spend.costUsd === null`
- **THEN** комірка вартості показує `—` і MUST NOT містити `$0.00`

### Requirement: Деривація інтервалів з комітів файлів

Інтервали SHALL обчислюватися лише з комітів, що торкаються відповідних шляхів (не з wall-clock сесій агента). Для активної зміни базовий префікс `openspec/changes/<changeName>/`; для архівної — `openspec/changes/archive/<archiveFolder>/`. Група `spec` — коміти `proposal.md`, `design.md` і шляху `specs/` (унікальні за sha, далі min/max дат). Група `review` — `review.md`. Група `apply` — `tasks.md`. Група `change` — уся тека зміни. `startedAt` / `endedAt` SHALL бути ISO-рядками дат комітів або `null`. `durationMs` SHALL дорівнювати різниці ended−started, якщо обидві дати є (включно з `0`); якщо комітів немає — `durationMs` MUST бути `null`, не `0`. `commitCount` SHALL бути ≥ 0. У UI підпис чесності MUST бути «інтервал комітів файлів, не wall-clock сесії» (tooltip комірок тривалості).

#### Scenario: Span spec з кількох шляхів

- **WHEN** коміт A торкається `proposal.md` о `2026-08-01T10:00:00Z`, коміт B торкається `specs/` о `2026-08-01T12:00:00Z`, і той самий sha не дублюється
- **THEN** `spans.spec.startedAt` є `2026-08-01T10:00:00Z`, `endedAt` є `2026-08-01T12:00:00Z`, `durationMs` є 7200000, `commitCount === 2`, `source === 'git-commits'`

#### Scenario: Порожній набір комітів

- **WHEN** провайдер повертає порожній список комітів для теки зміни
- **THEN** `spans.change` має `startedAt === null`, `endedAt === null`, `durationMs === null`, `commitCount === 0`, `source === 'git-commits'`

#### Scenario: Tooltip чесності

- **WHEN** оператор наводить на комірку тривалості Спека / Рев’ю / Apply / Усього
- **THEN** tooltip містить ISO `startedAt`–`endedAt` (або позначку відсутності дат), `commitCount` і фразу «інтервал комітів файлів, не wall-clock сесії»

### Requirement: Накладання spend з metrics.json

Якщо файл `metrics.json` у теці зміни існує і парситься як JSON-об’єкт, система SHALL читати опційні числові поля `spend.inputTokens`, `spend.outputTokens`, `spend.totalTokens`, `spend.costUsd`; нечислові значення SHALL ставати `null`. Якщо присутнє хоча б одне числове spend-поле, `spend.source` MUST бути `'metrics-file'`; інакше `'unknown'`. Невідомі ключі MUST ігноруватися. Невалідний JSON або відсутній файл (404 / порожня відповідь) SHALL давати всі spend-поля `null` і `source === 'unknown'` і MUST NOT провалювати рядок зміни.

#### Scenario: Валідний overlay

- **WHEN** `metrics.json` містить `{"spend":{"inputTokens":10,"outputTokens":20,"totalTokens":30,"costUsd":1.5}}`
- **THEN** модель має ці чотири числа і `spend.source === 'metrics-file'`

#### Scenario: Відсутній файл метрик

- **WHEN** читання `metrics.json` повертає відсутність файлу
- **THEN** рядок зміни все одно будується, усі spend-числа `null`, `source === 'unknown'`

#### Scenario: Невалідний JSON

- **WHEN** вміст `metrics.json` не є валідним JSON-об’єктом
- **THEN** усі spend-числа `null`, `source === 'unknown'`, рядок зміни не провалюється

### Requirement: Архівні зміни на поверхні аналізу

Поверхня аналізу SHALL включати архівні зміни з `openspec/changes/archive/`, інакше історія планування зникає після `/opsx:archive`. Парсинг імені теки SHALL бути `/^(\d{4}-\d{2}-\d{2})-(.+)$/` → `{ archivedAt, changeName }`; без збігу `changeName` дорівнює імені теки, `archivedAt` є `null`. Жива таблиця активних змін MUST NOT почати показувати архівні рядки через цю вимогу.

#### Scenario: Архів присутній в аналізі

- **WHEN** у репозиторії є активна зміна `add-login` і архівна тека `2026-08-28-add-factory-board`
- **THEN** аналіз містить обидва рядки, а жива таблиця борду як і раніше містить лише `add-login`

#### Scenario: Немає теки archive

- **WHEN** у репозиторії немає `openspec/changes/archive/`
- **THEN** аналіз показує лише активні зміни (або порожній стан, якщо їх немає) і MUST NOT трактувати відсутність archive як помилку проєкту полінгу

### Requirement: Екран аналізу змін

Система SHALL надавати екран за шляхом `/analysis` із заголовком «Аналіз змін», посиланням «Борд» на `/`, кнопкою «Оновити», яка повторно завантажує аналіз, і кнопкою «Експорт CSV» (неактивна, якщо немає рядків). Під час першого відкриття екрана система SHALL завантажити аналіз для всіх проєктів реєстру. Порожній реєстр SHALL показувати «Немає зареєстрованих проєктів.» Після завантаження без рядків SHALL показувати «Немає даних для аналізу.» Під час завантаження SHALL показувати «Завантаження аналізу…». Помилки завантаження проєктів SHALL показуватися банером і MUST NOT скасовувати успішні проєкти. Клієнтські фільтри (без HTTP): пошук за repo / `changeName`; вибір `усі` / `активні` / `архів`. Колонки таблиці українською: Проєкт, Зміна, Архів (так/ні та дата, якщо є), Вердикт, Задачі n/m, Цикли рев’ю, Спека, Рев’ю, Apply, Усього, Токени (`totalTokens` або `—`), Вартість (`$x.xx` або `—`), Агенти (runtime і ролі). Тривалість у комірках SHALL бути `X.X год` або `—`. Рядок SHALL мати розкривний блок із `spend.source`, списком subagents, ознакою acceptance criteria, `decisionsCount` і сирими ISO span.

#### Scenario: Відкриття аналізу

- **WHEN** оператор переходить на `/analysis` і в реєстрі є проєкти
- **THEN** екран показує «Аналіз змін» і запускає завантаження аналізу; живий полер борду не є джерелом цих рядків

#### Scenario: Порожній реєстр на аналізі

- **WHEN** реєстр не містить проєктів
- **THEN** екран показує «Немає зареєстрованих проєктів.»

#### Scenario: Фільтр архіву

- **WHEN** серед рядків є активна і архівна зміна, і оператор обирає «архів»
- **THEN** видимий лише архівний рядок (рядки)

#### Scenario: Розкривні факти якості

- **WHEN** оператор розкриває деталі рядка
- **THEN** видно `spend.source`, subagents, так/ні для acceptance criteria, `decisionsCount` і ISO-дати span, і немає балу 1–5

### Requirement: Експорт CSV

Екран аналізу SHALL дозволяти завантажити CSV усіх завантажених рядків у файл `factory-board-analysis.csv` у кодуванні UTF-8 з BOM для Excel. Заголовки MUST бути стабільними англійськими: `project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents`. Години SHALL дорівнювати `durationMs/3600000`, округлені до 1 десяткового; `null` → порожня клітинка. `roles` і `subagents` SHALL з’єднуватися через `|`. Кнопка експорту MUST бути неактивною, якщо рядків немає.

#### Scenario: Експорт з BOM

- **WHEN** є щонайменше один рядок аналізу і оператор натискає «Експорт CSV»
- **THEN** завантажується файл `factory-board-analysis.csv`, текст починається з BOM і рядка англійських заголовків у зазначеному порядку

#### Scenario: Порожні години в CSV

- **WHEN** у рядка `spans.spec.durationMs === null`
- **THEN** клітинка `spec_hours` у CSV порожня, а не `0` і не `0.0`

#### Scenario: Кнопка неактивна без рядків

- **WHEN** стор аналізу не має рядків
- **THEN** кнопка «Експорт CSV» неактивна

### Requirement: Агенти з handoff

Система SHALL витягати `agents.runtime` з тексту `handoff.md` як `local` або `cloud` (інакше `null`); `agents.roles` — унікальні значення розпарсеної next role та Closed role зі збереженням порядку; `agents.subagents` — імена з маркованих рядків секції «Subagents to spawn» (текст до тире / em dash), без дублювання обов’язку вигадувати runtime поза `local`|`cloud`.

#### Scenario: Runtime і ролі

- **WHEN** `handoff.md` містить next role `Implementer`, секцію Closed role з першим рядком `Architect` і `runtime: local`
- **THEN** `agents.runtime === 'local'` і `agents.roles` містить `Implementer` та `Architect` без дублікатів

#### Scenario: Subagents з маркерів

- **WHEN** у секції Subagents to spawn є рядки `- openspec-guide — …` і `- code-writer - …`
- **THEN** `agents.subagents` містить `openspec-guide` і `code-writer`

### Requirement: Цикли рев’ю та критерії приймання

`reviewLoops` SHALL дорівнювати кількості збігів `/request[ _-]?changes/gi` у тексті `review.md` і MUST бути `0`, якщо текст відсутній або порожній. `hasAcceptanceCriteria` SHALL бути true тоді й лише тоді, коли текст `proposal.md` відповідає `/^##\s*Acceptance criteria\b/im`. `decisionsCount` SHALL дорівнювати кількості рядків `decisions.md`, що відповідають `/^- \d{4}-\d{2}-\d{2}\b/m`; відсутній файл MUST давати `0`.

#### Scenario: Підрахунок request changes

- **WHEN** `review.md` містить дві згадки `REQUEST CHANGES`
- **THEN** `reviewLoops === 2`

#### Scenario: Немає decisions.md

- **WHEN** файл `decisions.md` відсутній
- **THEN** `decisionsCount === 0` і рядок зміни не провалюється
