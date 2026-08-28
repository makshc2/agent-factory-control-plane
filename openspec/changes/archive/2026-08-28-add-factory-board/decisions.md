# Decisions — add-factory-board

<!-- append-only; пише npx agent-orchestrator-kit handoff <name> з handoff.md ## Decisions -->

- 2026-08-28 Pinia-стори `registry` і `board`; реєстр проєктів у localStorage під ключем `factory-board.projects.v1` (без власного бекенда).
- 2026-08-28 Env: `VITE_GITHUB_TOKEN`, `VITE_GITLAB_TOKEN`, `VITE_GITLAB_BASE_URL`, `VITE_POLL_INTERVAL_MS`; полінг за замовчуванням 60 с.
- 2026-08-28 Інжест: GitHub contents API; GitLab repository tree + files/raw; `per_page=100` без пагінації — зафіксоване обмеження v1.
- 2026-08-28 Помилки нормалізуються до auth / rate-limit / not-found / network і показуються в рядку проєкту, без глобального падіння.
- 2026-08-28 Парсери handoff.md / tasks.md / review.md — лояльні регекси; нерозпізнане поле → null.
- 2026-08-28 ETag-кешування відкладено на v1.1; токени в localStorage прийнятні для single-operator (рекомендовано read-only токени).
- 2026-08-28 Вердикт рев'ю: REQUEST CHANGES — блокує `/opsx:apply` (`require_spec_review: true`).
- 2026-08-28 Причина відхилення суто структурна: `proposal.md` без секцій `Non-goals` та `Acceptance criteria`; змістовних претензій до design/tasks/specs не зафіксовано, бо LLM-рев'ю не запускалось.
- 2026-08-28 Повторний `/opsx:review add-factory-board` обов'язковий після виправлення — потрібен повний прохід Tier 2.
- 2026-08-28 Non-goals v1 зафіксовано в proposal.md: без власного бекенда/проксі; борд строго read-only (без запису у віддалені репозиторії); без пагінації понад `per_page=100`; ETag-кешування відкладено на v1.1; без багатокористувацького режиму та серверного зберігання токенів.
- 2026-08-28 Acceptance criteria зафіксовано в proposal.md: реєстр у localStorage (`factory-board.projects.v1`) переживає перезавантаження; рядок на кожну активну зміну з фазою/next_command, прогресом n/m, вердиктом рев'ю і часом оновлення; помилка одного проєкту не валить борд; полінг за `VITE_POLL_INTERVAL_MS` (60 с за замовчуванням) + ручне оновлення; `npm run lint` / `npm test` / `npm run build` зелені.
- 2026-08-28 Вердикт у review.md лишається REQUEST CHANGES до повного повторного проходу `/opsx:review add-factory-board` (Tier 1 + Tier 2) — оновити його може лише роль Spec Reviewer.
- 2026-08-28 Tier 2 виконано вперше; вердикт REQUEST CHANGES — `/opsx:apply` лишається заблокованим (`require_spec_review: true`).
- 2026-08-28 Структурні претензії попереднього рев'ю закрито (`## Non-goals`, `## Acceptance criteria` присутні й змістовні) — усі нові блокери суто змістові, локалізовані в `tasks.md` з дотиком до `design.md` D5 і acceptance criteria в `proposal.md`.
- 2026-08-28 B1: контракт відмови `addProject` не визначений — спеку «оператор бачить повідомлення про дублікат» неможливо реалізувати передбачувано; треба явний результат успіх/причина відмови в 4.1 + показ у 6.3 + тест.
- 2026-08-28 B2: суперечність 404 — `design.md` D5 мапить 404 репозиторію в `not-found`, а `tasks.md` 3.2/3.3 беззастережно повертають `[]`/`null`; Architect має ухвалити архітектурне рішення: або відрізняти 404 репо від 404 шляху, або вилучити `not-found` з D5 та acceptance criteria.
- 2026-08-28 B3: `loading` присутній лише в state — потрібно виставлення у 4.2 (з `finally`), індикація у 6.2 і очікування в тесті 4.4.
- 2026-08-28 B4: зафіксовано як обов'язкове обмеження реалізації — HTTP лише через `createHttp` (Axios) з `src/api/http.js`, `fetch` заборонений; це має бути в `Do` задач 3.2/3.3 і в `Done-when` 3.1.
- 2026-08-28 B5: потік редагування треба довести до UI — `edit` → `ProjectForm` з обраним проєктом → `save` → `updateProject(id, patch)` → `refresh`.
- 2026-08-28 Non-blocking (не блокують APPROVE, але варто прибрати при дотику): дрейф регексів `design.md` D6 vs `tasks.md` 2.1; дублювання `resolveToken` між стором і клієнтами; `nextRole` парситься без колонки; заміна заглушки `BoardView` ламає наявний `src/App.spec.js` (очікує текст `Factory board`); `per_page=100` у `decisions.md` подано як спільне, хоча стосується лише GitLab; слабкий `Done-when` у 1.1; `npm run lint` мутуючий (`eslint . --fix`).
- 2026-08-28 B2 → обрано варіант A: розрізняти 404 репозиторію/гілки від 404 шляху однією перевіркою існування гілки, що виконується лише в гілці 404 листингу; одрук у `owner/repo` чи гілці дає видиму помилку `not-found`, а відсутність теки `openspec/changes` → порожній список без помилки; код `not-found` у D5 та acceptance criteria збережено, `proposal.md` і delta-специфікації правити не довелося.
- 2026-08-28 Токен розв'язується лише в клієнтах провайдерів (`project.token` → env-токен) — стор реєстру більше не дублює цю логіку (закрито non-blocking про `resolveToken`).
- 2026-08-28 `BoardView` зберігає заголовок `Factory board` — сумісність із наявним `src/App.spec.js` зафіксована в задачі 6.3.
- 2026-08-28 Вердикт REQUEST CHANGES у `review.md` лишається чинним до повторного `/opsx:review add-factory-board` — Architect не редагує review.md; `apply-notes.md` з'явиться лише разом з APPROVE.
- 2026-08-28 Вердикт другого циклу рев'ю: APPROVE — гейт `review_to_apply: explicit_approve` пройдено, `/opsx:apply add-factory-board` розблоковано.
- 2026-08-28 Усі п'ять блокерів першого циклу (B1–B5) визнані фактично закритими на артефактах; нових блокерів немає.
- 2026-08-28 Знахідку про Pinia в `src/App.spec.js` свідомо НЕ піднято до блокера: після 6.3 `BoardView` викликає стори в setup, а наявний тест монтує `App` лише з роутером (глобальної Pinia і `setupFiles` немає), тож сюїта App упаде на 7.2. Виправлення однозначне — додати `createPinia()` до `global.plugins` у `src/App.spec.js`; зафіксовано в `apply-notes.md` як обов'язковий крок apply і єдина дозволена правка наявного тесту.
- 2026-08-28 Порядок реалізації зафіксовано в `apply-notes.md`: 1.1 → 2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 3.4 → 4.1 → 4.3 → 4.2 → 4.4 → 5.1 → 5.2 → 6.1 → 6.2 → 6.3 → 6.4 → 6.5 → 7.1 → 7.2 → 7.3; стори не починати до 3.4, `BoardView` — після 6.1/6.2.
- 2026-08-28 404-гілка з перевіркою існування гілки лишається без автотесту у v1 (клієнти 3.2/3.3 без тестових задач) — усвідомлене обмеження, `not-found` перевіряється вручну.
- 2026-08-28 Apply виконано parent-driven conductor + ізольовані `code-writer`/`test-writer` на явну вимогу сесії; галочки лише після верифікації файлів.
- 2026-08-28 Pinia в `src/App.spec.js` додано під час 6.3, як вимагає `apply-notes.md`.
- 2026-08-28 Індикатор «оновлюється…» додано окремим кейсом у `BoardView.spec.js` (закриття Done-when 6.2 через 6.4).
- 2026-08-28 GitLab: `encodeURIComponent(project.branch)` у path перевірки гілки (apply-notes).
- 2026-08-28 Регекси парсерів — за `tasks.md` 2.1, не за дрейфом D6.
