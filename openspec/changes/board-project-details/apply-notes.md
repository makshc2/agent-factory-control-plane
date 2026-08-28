# Apply notes — board-project-details

- Порядок: 1.x (парсери, formatRelativeTime) → 2.x (клієнти) → 3.x (стор) → 4.1 + 5.1 → 6.x (панель) → 7.x (BoardView) → 8.x (lint/test/build).
- НЕ чіпати: сигнатури `parseTasksProgress` / `parseHandoff` / `parseReviewVerdict`; `listChanges` і `fetchArtifact` у клієнтах; ключ `factory-board.projects.v1`; `usePoller` (callback лишається `refreshAll`).
- `refreshProject` / `refreshAll` MUST NOT викликати `loadProjectDetails`, `fetchBranchHead` чи `fetchArtifact` для `proposal.md` / `decisions.md` / `design.md` — це перевіряється тестами 3.2 і 7.2.
- `loadProjectDetails`: без `listChanges`; порожній `statuses[id]` → `changes: {}` + лише `fetchBranchHead`; не-404 помилка → `detailsError[id]`, без запису в `errors[id]` / `loading[id]`.
- Ланцюжок фокуса: 4.1 `event.currentTarget.focus()` перед emit → 7.1 `detailsTriggerEl = document.activeElement` → `closePanel` з `nextTick` + `isConnected`. Усі шляхи закриття лише через `@close="closePanel"`; зміна проєкту при відкритій панелі НЕ закриває її.
- HTTP лише через Axios `createHttp`; символ `fetch` у клієнтах відсутній. GitHub head: 404 і 409 → `null`; GitLab: порожній масив або 404 → `null`.
- `designExcerpt` — через `parseReviewExcerpt` (обрізання до 500), окремої функції не додавати.
- Тести панелі/BoardView: `mount` з `attachTo: document.body`, в `afterEach` — `document.body.innerHTML = ''`; інакше кейс фокуса флейкі.
- Props панелі — за таском 6.1 (`headerChanges`, `lastUpdated`, `pollError`), а не єдиний `header` з D6.
- Робоче дерево вже має частковий diff у `BoardTable.vue` / `styles.css` — реалізувати повний обсяг 4.1/5.1, не вважати наявне готовим.
- `styles.css`: жодного `max-width: 72rem`; обов'язкові класи `.board-kpis`, `.board-filters`, `.board-detail-overlay`, `.board-detail-panel`.
- Vue-конвенції: `<script setup>` Composition API, без Options API і без коментарів у коді.
- Перевірка: `npm run lint`, `npm test`, `npm run build` — усі з кодом 0 (Done-when 8.1–8.3).
