# Spec Review

**Change:** read-kit-phase-bounds-and-cost-total
**Date:** 2026-09-08
**Round:** 3 (повторне Tier 2 після REQUEST CHANGES раунду 2)
**Verdict:** APPROVE

## Tier 1 (перевірено повторно цим рев'ю)

- `npx openspec validate --all --strict` → `Totals: 7 passed, 0 failed`, exit 0.
- `npx agent-orchestrator-kit gate-check --review read-kit-phase-bounds-and-cost-total` → `Tier 1 review passed`, exit 0.
- `git diff --stat HEAD -- src/` порожній — реалізація закомічена, apply = верифікація.

## Tier 2 — підсумок

Єдиний блокер раунду 2 (B1) закритий **по суті, не декларативно**. Вичерпний повторний скан головної спеки за двома незалежними наборами токенів дав **нуль** чинних вимог поза delta, які суперечили б новій поведінці — клас дефекту, що блокував раунди 1 і 2, вичерпано. Нотатки N1–N4 і N6 закриті; N5 і N7 лишаються прийнятими поза скоупом. Блокерів немає.

## Верифікація закриття B1 (програмно, не оком)

**Заголовок — байт у байт.** Порівняння кодпоінтів `### Requirement: Заборона since/until на listing комітів` у `openspec/changes/read-kit-phase-bounds-and-cost-total/specs/change-metrics/spec.md:112` і `openspec/specs/change-metrics/spec.md:604` дало посимвольний збіг (57 кодпоінтів, `.encode() == .encode()` → `True`). Повна перевірка всіх 12 MODIFIED-заголовків проти множини заголовків головної спеки: **12/12 OK**, жодного mismatch. Archive зматчить усі.

**Тіло.** `specs/change-metrics/spec.md:114`:

> Система MUST NOT передавати `since` або `until` … **Коли span будується з комітів (git-fallback за вимогою «Деривація інтервалів з комітів файлів»), він SHALL будуватися з повного набору комітів відповідних шляхів.** Вікно періоду MUST NOT обрізати коміти …

Друге речення звужене саме так, як приписував раунд 2: безумовне «інтервали `spans` SHALL і далі будуватися з повного набору комітів» замінено на умовне, з явним прив'язуванням до git-fallback. Перше й третє речення перенесені без змін (звірено з `openspec/specs/change-metrics/spec.md:606`).

**Сценарій «Виклик комітів лише зі шляхом»** (`specs/change-metrics/spec.md:116-120`) — списковий збіг рядків з `openspec/specs/change-metrics/spec.md:608-612` дав `True` (перенесено без змін, як і приписано). Звужене друге речення його **не ламає**: перше речення вимоги («MUST NOT передавати `since`/`until`») лишилося безумовним, а сценарій нормує саме аргументи виклику, не побудову span. Чинний код підтверджує: `src/api/github.js:147` і `src/api/gitlab.js:163` — `listCommitsByPath(project, path)`, два аргументи; регресійний тест `src/stores/analysis.spec.js:466` (`calls listCommitsByPath with exactly two arguments and no since/until`) не змінюється цією зміною.

**Сценарій «Span завантаженої зміни повний»** (`specs/change-metrics/spec.md:124`): WHEN доповнено `і журнал не дає жодної дати фази apply і жодної дати серед фаз і сесій (span падає на коміти)`. Обидві половини потрібні й обидві присутні: перша робить істинним THEN для `spans.apply` (гілка `spanFromPhase(journal.phases.apply) ?? spanFromCommits(...)`, `src/utils/changeMetrics.js:1041`), друга — для `spans.change` (`spanFromJournal(journal) ?? spanFromCommits(...)`, `:1043`, повертає `null` лише коли жодна фаза й сесія не має дати). Формально перша половина є підмножиною другої — надлишковість, не суперечність.

**Внутрішня несуперечність тіла.** Умовне «коли span будується з комітів» узгоджене з `specs/change-metrics/spec.md:63` («Git-коміти SHALL бути лише fallback») і з `:34` («`source` є `'kit-sessions'` або `'git-commits'`»). Конструкції «SHALL з комітів» проти «MUST NOT брати git log» більше немає в жодній вимозі.

## Вичерпний скан головної спеки (нуль залишків — підтверджено самостійно)

Метод: `python3`-скан `openspec/specs/change-metrics/spec.md` рядок за рядком з мапінгом кожного рядка на його `### Requirement:` і відкиданням 12 заголовків, присутніх у `## MODIFIED Requirements` delta. Два незалежні набори токенів:

1. `spans|commitCount|git-commit|kit-sessions|kit-span|з комітів|комітів|costUsd|billed|оцінк|durationMs|leadTime|startedAt|endedAt|source|CSV|cost_usd|Вартість|Тривалість|інтервал|фаз|since|until|ampCredit|credits|Комітів|tooltip|title` (case-insensitive);
2. контрольний, ширший за предметом: `kit|metrics\.json|журнал|Вартість|вартіст|коміт|span|Спека|Apply|Усього|Рев`.

Разом уражено 9 немодифікованих вимог; після ручного розбору кожного влучання **жодне не суперечить новій поведінці**:

| Вимога (немодифікована) | Влучання | Вирок |
|---|---|---|
| `Агенти з handoff` (`openspec/specs/change-metrics/spec.md:271`) | `agents.platforms` = ключі `spendByPlatform`, «у яких є хоча б одне скінченне число» | Не суперечить: формулювання родове, `costUsdTotal` — таке саме число платформи. Розширення множини (див. N3), не колізія. |
| `Приховати порожній pending` (`:526`) | CSV-колонки `pending_*` | Не суперечить: `cost_usd_total` дописано **в кінець** `CSV_HEADER` після `cost_usd_estimated` (`src/utils/changeMetrics.js:5`), індекси `pending_*` не зсуваються. |
| `Цикли рев'ю` (`:300`), `Архівні зміни на поверхні аналізу` (`:118`), `Оверлей завантаження` (`:415`), `Календарне вікно` (`:548`), `Правило skip loadChange` (`:576`), `Контролі періоду` (`:620`), `Перезавантаження при зміні періоду` (`:637`) | лише збіг за словом (`коміти` в описі fan-out, `рев'ю` в назві) | Предметно поза цією зміною; жодного твердження про джерело `spans`, `costUsdTotal` чи CSV-порядок. |

Окремо перевірено, що жодна модифікована вимога не втратила сценарію: попарний діф блоків delta ↔ головна спека по 12 MODIFIED дав `lost=[]` у всіх дванадцяти; додано 14 нових сценаріїв, жодного видаленого. Критично для B1-класу: сценарій `Оцінка в окремій колонці CSV` головної спеки (`openspec/specs/change-metrics/spec.md:250`, «заголовок `cost_usd_estimated` є останнім») **не лишився без правки** — delta переписує його на `,cost_usd_estimated,cost_usd_total` (`specs/change-metrics/spec.md:283-286`), бо `Експорт CSV` входить у MODIFIED.

## Перевірка нотаток раунду 2

| # | Що вимагалося | Стан | Доказ |
|---|---|---|---|
| **N1** | `(журнал не дає жодної дати)` у WHEN «Порожній набір комітів» | **Закрито** | `specs/change-metrics/spec.md:93`: `- **WHEN** провайдер повертає порожній список комітів для теки зміни (журнал не дає жодної дати)` |
| **N2** | прибрати дубль сценарію `costUsdTotal сам по собі дає metrics-file` | **Закрито** | `grep -n "сам по собі дає metrics-file"` → 0 збігів; лишився один сценарій `#### Scenario: Самотній costUsdTotal дає metrics-file` (`specs/change-metrics/spec.md:162`) при нормі «шість ключів» (`:130`). Діф блоків: `Повний журнал kit` втратив рівно цей сценарій, інших втрат немає. |
| **N3** | задекларувати уточнення git-tooltip у proposal → What Changes | **Закрито** | `proposal.md:11`: «Tooltip git-span показує `startedAt`–`endedAt` у поясі Києва (не сирий ISO) і підпис `комітів: N` замість літерала `commitCount` — контракт узгоджено з чинним `spanTitle` у `AnalysisView.vue`». Відповідає `specs/change-metrics/spec.md:99`. |
| **N4** | «в HEAD (закомічена)» замість «робочому дереві» | **Закрито** | `proposal.md:5` («вже в HEAD (закомічена; `git diff --stat HEAD -- src/` порожній)»), `design.md:3`, `tasks.md:3`. Незалежно підтверджено: `git diff --stat HEAD -- src/` порожній. |
| **N6** | AC для картки платформи з `costUsdTotal` | **Закрито** | `proposal.md:73` — **AC13** з `amp` `$14.48` і `cursor` `≈ $4.64`, командою перевірки; відповідає сценарію delta `Запис платформи з costUsdTotal` (`specs/change-metrics/spec.md:254-257`) і Done-when задач 3.1 (`tasks.md:49`) та 4.3 (`tasks.md:75`). |
| **N5** | (свідомо поза скоупом) | лишається | `tasks.md:53` / `src/components/AnalysisDetailsModal.vue:191-193`: `spansFromKit` порівнює значення рядка з літералом `'сесії kit (metrics.json)'`. Зафіксовано, не піднімається як блокер. |
| **N7** | (свідомо поза скоупом) | лишається | Заголовок `Деривація інтервалів з комітів файлів` не перейменований; перейменування потребувало б `RENAMED`. Прийнято. |

## Дослівні UI-рядки й tooltip-тексти (звірено кодпоінтами)

`python3`-підрахунок точних входжень по чотирьох артефактах плюс скан усього `src/`:

| Рядок | proposal | delta | tasks | design | `src/` |
|---|---|---|---|---|---|
| `07.09.2026, 18:17 – 07.09.2026, 18:31` | 1 | 1 | — | — | будується динамічно |
| `Початок і кінець фаз за сесіями kit із metrics.json.` | 1 | 2 | 1 | — | `AnalysisDetailsModal.vue` + spec |
| `Інтервали за комітами файлів спеки, не сесії агентів.` | 1 | 2 | 1 | — | `AnalysisDetailsModal.vue` + spec |
| `межі фази за сесіями kit (metrics.json), не коміти` | 2 | 2 | 3 | 1 | `AnalysisView.vue` + spec |
| `разом (costUsdTotal): $14.48 billed + ≈ $6.60 kit` | 2 | 2 | 1 | — | збирається у `costTitle` |
| `разом (costUsdTotal): ≈ $4.64 kit` | 1 | 1 | — | — | той самий `costTitle` |
| `сесії kit (metrics.json)` / `коміти файлів` | 2/2 | 2/3 | 4/3 | 1/1 | `AnalysisDetailsModal.vue` + spec |
| `Вартість · рахунок` / `Вартість · оцінка kit` | 3/3 | 3/3 | 3/3 | 1/1 | `AnalysisDetailsModal.vue` + spec |
| `Фази OpenSpec (інтервали)` | 3 | 1 | 3 | 2 | `AnalysisDetailsModal.vue` + spec |
| `оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude` | — | 3 | 1 | — | `AnalysisView.vue` |

**En-dash.** Кодпоінти рядка `07.09.2026, 18:17 – 07.09.2026, 18:31`: позиція 18 дорівнює `0x2013` (U+2013 EN DASH) і в `proposal.md:49`, і в `specs/change-metrics/spec.md:105`; той самий `0x2013` у шаблонному літералі `src/views/AnalysisView.vue:175` (`` `${started} – ${ended}, межі фази за сесіями kit (metrics.json), не коміти` ``). Не hyphen-minus і не em-dash.

**Формати підтверджені виконанням, не припущенням.** `Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', … hourCycle: 'h23' })` для `2026-09-07T15:17:07.490Z` дає рівно `07.09.2026, 18:17` (`=== true`), для `…15:31:40.934Z` — `07.09.2026, 18:31`. `formatDuration` (`src/utils/formatDateTime.js:73-90`): `873444 → 14 хв 33 с`, `539356 → 8 хв 59 с`, `1200000 → 20 хв`. Арифметика delta: `15:31:40.934 − 15:17:07.490 = 873444`; `15:39:40.339 − 15:26:14.472 = 805867`; обхід платформ `1.43 + 5.16 + 14.48 = 21.07`; `21.0779 → $21.08`, `6.5979 → ≈ $6.60`, `4.6377 → ≈ $4.64`. Усе зійшлося.

## Узгодженість proposal ↔ design ↔ delta ↔ tasks

**AC1–AC13** — кожен має конкретні входи, очікуваний вихід і команду перевірки:

| AC | Вимога delta | Задача | Команда |
|---|---|---|---|
| AC1, AC2, AC3, AC4 | `Деривація інтервалів` (`:61`), `Чесність відсутніх даних` (`:32`) | 1.2, 4.1 | `changeMetrics.spec.js -t "span"` |
| AC5 | `Kit-тривалості` (`:368`), `Деривація` (сценарій `Tooltip для kit-span`, `:101`) | 1.3, 2.1, 4.2 | `-t "preferDuration"`, `AnalysisView.spec.js -t "kit phase bounds"` |
| AC6 | `Накладання spend` (`:128`), `Повний журнал kit` (`:314`) | 1.1, 4.1 | `-t "costUsdTotal"` |
| AC7 | `Резолюція показаної вартості` (`:392`) | 1.4, 2.2, 4.1, 4.2 | `-t "resolveDisplayedCost"`, `-t "costUsdTotal"` |
| AC8 | `Експорт CSV` (`:259`) | 1.5, 4.1 | `-t "csv\|CSV\|cost_usd"` |
| AC9 | ADDED (`:517`) | 3.2, 4.3 | `AnalysisDetailsModal.spec.js -t "phase bounds\|коміти\|git"` |
| AC10 | ADDED (`:517`) | 3.1, 3.3, 4.3 | `-t "costUsdTotal\|estimate"`, `-t "phase bounds"` |
| AC11 | усі (регресія legacy) | 4.1–4.3 | три spec-файли одним прогоном |
| AC12 | скоуп / якість | 5.1 | `eslint` + `vite build` + `! grep -rq …` |
| AC13 | `Екран аналізу змін` (`:167`), `Картка сесії журналу` (`:490`) | 3.1, 4.3 | `-t "costUsdTotal\|estimate"` |

**Вимоги без задач:** лише дві, обидві редакційні й без зміни коду — `Заборона since/until` (нова MODIFIED цього раунду: правка формулювання, поведінка вже задовольняється незміненими `src/api/*.js` і тестом `src/stores/analysis.spec.js:466`) і `Картковий макет` (правка N2 раунду 2: додано «(kit-span або git-span)» у перелік). Див. N2 нижче — це нотатка, не дірка в реалізації.

**Задач без вимог немає:** 4.1–4.3 покривають AC11 (регресія), 5.1 — AC12.

**Дрейфу немає.** Порядок гілок (`kitMs` → `kit-span` → `git-commits`; `total` → `billed` → `estimated` → `none`), сигнатури (`spanFromPhase`, `spanFromJournal`, `recordedTotalCostUsd`, `resolveDisplayedCost`), позиція `cost_usd_total` і всі числа збігаються в `proposal.md`, `design.md` (D1–D5), delta і `tasks.md`. Звірено з чинним кодом: `src/utils/changeMetrics.js:739` (`spanFromPhase`), `:757` (`spanFromJournal`), `:865` (`preferDuration`), `:955` (`resolveDisplayedCost`), `:5` (`CSV_HEADER`), `src/views/AnalysisView.vue:222` (`costTitle`), `src/components/AnalysisDetailsModal.vue:89` (`spanCard`), `:191` (`spansFromKit`) — жодна вимога delta не суперечить закомміченій реалізації, тож apply-верифікація здійсненна.

**Скоуп проти Non-goals** (`proposal.md:76-82`): жодна з 14 задач не торкається `sourceIds` / `sourceTotals` / `byModel`, `parseFlexibleIso`, сітки карток, конвертації Amp credits чи vendor API. `Files` усіх задач — рівно шість файлів із `## Impact` (`proposal.md:28`). Scope creep відсутній.

**Самодостатність задач:** кожна має `Files`, кроки з іменами функцій / констант і `Done-when` з очікуваними значеннями та вузькою командою Vitest. Сліпий виконавець виконає їх без `design.md`.

## Blocking (must fix before apply)

Немає.

## Non-blocking (варто врахувати)

- **N1.** `specs/change-metrics/spec.md:110` (сценарій `Tooltip називає джерело показаного часу`) досі каже «`commitCount` і фразу», тоді як сусідній `:99` уже переведено на `` `комітів: <commitCount>` ``. Правка N3 раунду 2 застосована частково. Не суперечність (обидва описують той самий tooltip), але для симетрії варто вирівняти формулювання на `:110`.
- **N2.** Дві MODIFIED-вимоги (`Заборона since/until` `:112`, `Картковий макет` `:462`) редакційні й не мають жодної задачі. Це коректно — коду міняти не треба, — але при apply варто явно зафіксувати їх як «verify only»: `Заборона since/until` перевіряється чинним `src/stores/analysis.spec.js:466`, `Картковий макет` — чинними кейсами макета. Сценарій `Span завантаженої зміни повний` (`:122`) не покритий жодним тестом ні до, ні після зміни — це стан status quo, не регресія.
- **N3.** `src/utils/changeMetrics.js:544-552` (`platformHasSignal`) тепер рахує `costUsdTotal` серед `PLATFORM_NUMBER_KEYS` (`:29-37`). Наслідок: платформа, у якої зі скінченних чисел є лише `costUsdTotal`, уперше потрапляє в `agents.platforms` і в картку платформ. Головна спека це **дозволяє** («хоча б одне скінченне число», `openspec/specs/change-metrics/spec.md:273`), тож блокера немає, але розширення поведінки не згадане ні в `proposal.md` → What Changes, ні в `## Impact`. Варто дописати пів рядка, щоб archive не виглядав як тиха зміна.
- **N4.** `specs/change-metrics/spec.md:421-422` — подвійний порожній рядок перед `#### Scenario: Overlay вартості повторює tooltip таблиці`. Косметика, `validate --strict` пропускає.
- **N5** *(прийнято поза скоупом, статус без змін)*. `src/components/AnalysisDetailsModal.vue:191-193` / `tasks.md:53`: `spansFromKit` визначається порівнянням значення рядка з UI-літералом `'сесії kit (metrics.json)'`. Крихке зчеплення тексту з логікою; прапорець джерела варто тримати окремо від підпису — у майбутній зміні.
- **N6** *(прийнято поза скоупом, статус без змін)*. Заголовок `Деривація інтервалів з комітів файлів` лишається, хоч тіло описує насамперед kit-межі. Свідомий компроміс заради матчу MODIFIED-назви; перейменування потребувало б `RENAMED`.

## Required Before Apply

Нічого блокуючого. Артефакти реалізовні без матеріального вгадування — можна запускати `/opsx:apply read-kit-phase-bounds-and-cost-total`.

Нотатки N1, N3, N4 — редакційні; їх можна закрити або окремою propose-правкою до archive, або лишити як є (жодна не впливає на виконуваність apply).
