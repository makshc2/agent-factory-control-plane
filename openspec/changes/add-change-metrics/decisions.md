# Decisions — add-change-metrics

<!-- append-only; пише npx agent-orchestrator-kit handoff <name> з handoff.md ## Decisions -->

- 2026-08-28 Точність важливіша за повноту: відсутні spend/duration → `null` / UI `—`; `null` не рендерити як `0` чи `$0`.
- 2026-08-28 Немає Cursor/Amp vendor API і бекенда; spend лише з опційного `metrics.json` (`source: metrics-file` | `unknown`).
- 2026-08-28 Kit Runtime лишається `local|cloud`; телеметрійний контракт kit не чекаємо.
- 2026-08-28 Архівні зміни входять у `/analysis`, живий `listChanges` і далі пропускає `archive`.
- 2026-08-28 Полер / `refreshProject` / `refreshAll` не вантажать аналіз, архіви, `metrics.json`, коміти за шляхом.
- 2026-08-28 Сигнатури `listChanges`, `fetchArtifact`, `fetchBranchHead`, `parseHandoff`, `parseTasksProgress`, `parseReviewVerdict` заморожені; нові експорти поруч.
- 2026-08-28 Немає 5-го KPI і колонки spend на живому борді; окремий маршрут `/analysis` + CSV UTF-8 з BOM.
- 2026-08-28 Якість спеки — факти (verdict, reviewLoops, hasAcceptanceCriteria, tasks n/m, decisionsCount), не бал 1–5.
- 2026-08-28 Git-span = інтервал комітів файлів, не wall-clock сесії агента.
- 2026-08-28 Оператор override `max_active_changes: 1`: нова зміна створена, доки `board-project-details` чекає archive.
- 2026-08-28 Review APPROVE у першому циклі; артефакти propose лишилися без правок — зауваження ревʼюера неблокуючі й перенесені в apply-notes.md.
- 2026-08-28 RouterLink «Аналіз» у `.board-toolbar` ставити ПІСЛЯ кнопок: селектор `button:first-child` дає primary-стиль «Оновити» і не має зламатися.
- 2026-08-28 `reviewLoops` рахує всі згадки `request changes` включно з рядком вердикту — так зафіксовано сценарієм дельти, під час apply не «виправляти».
- 2026-08-29 Apply виконано хвилями isolated `code-writer`/`test-writer` за незалежними файлами; parent лише перевіряв звіти й маркував чекбокси.
- 2026-08-29 RouterLink «Аналіз» стоїть після «Оновити»/«Додати проєкт» — підтверджено в браузері: `button:first-child` лишає «Оновити» primary.
- 2026-08-29 `reviewLoops` лишили як у спеці (усі згадки `request changes`, включно з рядком вердикту).
