# Apply notes — read-kit-phase-bounds-and-cost-total

- Реалізація вже в HEAD; `git diff --stat HEAD -- src/` має лишатися порожнім, якщо Done-when виконується. Не писати код «для галочки».
- Не чіпати: `src/api/github.js`, `src/api/gitlab.js`, `board.js`, `usePoller.js`, `sourceIds` / `sourceTotals` / `byModel`, `parseFlexibleIso`, сітку карток, конвертацію Amp credits, vendor API. Amp credits лишаються окремим рядком деталей.
- Борд MUST NOT обчислювати `costUsdTotal` з `costUsd`/`costUsdEstimated` і MUST NOT додавати `ampCredits` у spend. `spanFromCommits` не змінювати.
- UI дослівний, символ у символ. У tooltip kit-span — en-dash U+2013 (`07.09.2026, 18:17 – 07.09.2026, 18:31`), не hyphen-minus. Літерали: `межі фази за сесіями kit (metrics.json), не коміти`; `разом (costUsdTotal)`; `Фази OpenSpec (інтервали)`; `Початок і кінець фаз за сесіями kit із metrics.json.`; `Інтервали за комітами файлів спеки, не сесії агентів.`; `сесії kit (metrics.json)` / `коміти файлів`; `Вартість · рахунок` / `Вартість · оцінка kit`.
- CSV: `,cost_usd_total` лише в кінець `CSV_HEADER` після `cost_usd_estimated`; overlay `row.spend.costUsdTotal`, без обходу журналу; `null` → порожня клітинка, не `0`.
- Verify-only (без коду): «Заборона since/until» → чинний `src/stores/analysis.spec.js:466` (`listCommitsByPath` рівно 2 аргументи); «Картковий макет» → чинні кейси макета. Не додавати тести на «Span завантаженої зміни повний» (status quo).
- N1/N3/N4 раунду 3 — прийняті редакційні; не правити delta/proposal у apply. N5 (`spansFromKit` порівнює UI-літерал) і N6 (назва «Деривація інтервалів…») — поза скоупом.
- Vitest лише вузько, один процес: `./node_modules/.bin/vitest run <файл> --maxWorkers=1`. Повний `npm test` заборонено. Перед тестами: `nproc`; loadavg; MemAvailable.
- Після задач: eslint на шість Files задачі 5.1 + `./node_modules/.bin/vite build`; `! grep -rq "USD_PER_MILLION\|estimateCostFromTokens" src/`.
