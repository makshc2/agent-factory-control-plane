# Apply notes: add-change-metrics

- Порядок: 1.1 → 1.2 → 2.1/2.2 → 3.1 → 3.2/3.3 → 4.1 → 4.2 → 4.3 → 5.1 → 5.2 → 5.3 → 6.x. Таск 2.x імпортує `parseArchiveFolderName` з 1.1.
- НЕ чіпати: сигнатури й тіла `listChanges`, `fetchArtifact`, `fetchBranchHead` (github+gitlab), весь `openspecParsers.js`, `providers.js`, `usePoller`, `refreshProject`/`refreshAll`/`loadProjectDetails` у `board.js`, `.board-kpis` (4 колонки), ключ `factory-board.projects.v1`.
- `board.js` MUST NOT імпортувати `useAnalysisStore` / викликати `loadAnalysis` — Done-when 3.1 перевіряє відсутність цих рядків у файлі.
- Тексти регексів, ендпоінтів, CSV-заголовків, UI-рядків брати дослівно з tasks.md (він канон; де design D1 багатослівний — діє «практичне правило»: `commitCount = commits.length`).
- Null-чесність: порожній span → `durationMs === null` → `—`; один коміт → `0` → `0.0 год`; `costUsd === 0` з metrics.json → `$0.00`; ніколи `null` → `0`/`$0.00`.
- `metricsToCsv` без BOM; `\uFEFF` додає лише AnalysisView при створенні Blob.
- CSS-пастка 5.3: `.board-toolbar button:first-child` = primary «Оновити». RouterLink «Аналіз» ставити ПІСЛЯ кнопок, інакше перша кнопка втратить primary-стиль.
- 404-патерн `listArchivedChanges`: копіювати branch-check з `listChanges` (404 архіву + жива гілка → `[]`; 404 гілки → throw оригінал; інший checkError → throw checkError).
- `listCommitsByPath`: 404 і порожньо → `[]`, ніколи не помилка проєкту; spec-коміти унікалізувати за `sha` у сторі (перша поява) перед `spanFromCommits`.
- HTTP лише через `createHttp`; символу `fetch(` у api-модулях бути не може (Done-when 2.x).
- Архів читає лише стор аналізу; `loadProjectDetails` і полер — ні (тест 3.3 фіксує).
- `reviewLoops` рахує всі згадки `request changes` включно з рядком вердикту — так у спеці, не «виправляти».
- Верифікація: `npm run lint`, `npm test`, `npm run build` — усі exit 0 (таски 6.1–6.3).
