# Spec Review
**Change:** polish-analysis-details-layout
**Date:** 2026-09-01
**Verdict:** APPROVE

## Checklist summary
- Proposal: ✓
- Design: ✓
- Tasks: ✓
- Delta specs: ✓

## LLM checklist

**Consistency**
- [✓] proposal ↔ design ↔ tasks розповідають ту саму історію — без суперечностей
- [✓] Delta-спеки покривають усю змінену/додану поведінку з design

**Main specs**
- [✓] Немає конфлікту з чинними `openspec/specs/`: layout аналізу змінюється через MODIFIED `change-metrics` і ADDED `factory-board`; шухляда — ADDED без зміни UX-контракту `project-detail`

**Scope**
- [✓] Немає scope creep проти Non-goals (полер, parser/CSV pending, Amp→USD, Figma/Quasar, Hydra, нові HTTP / `DETAIL_ARTIFACTS`)

**Task self-sufficiency**
- [✓] Сліпий implementer може виконати кожну задачу з Files/Do/Done-when без `design.md` (дрібні пастки — у apply-notes)

**Vue 3**
- [✓] Компоненти — `<script setup>` + Composition API (без Options API)
- [✓] Стан — Pinia setup store (`src/stores/analysis.js`)
- [✓] HTTP — чинний Axios-клієнт; нові `fetch` не з’являються
- [✓] Задачі вказують конкретні шляхи під `src/` (усі файли існують; overlay — новий SFC)
- [✓] Немає зайвого рефактору борду / KPI / роутера

## Notes

Артефакти implementable без матеріальних здогадок. Design: none — design-brief не вимагається. Маршрути `/analysis/:projectId` і `/analysis/:projectId/metrics/:changeRef` лишаються; ім’я `AnalysisDetailsModal.vue` не змінюється.

Перевірені посилання: `src/stores/analysis.js` (зараз безумовне `rows.value = []`), `AnalysisView.vue` / `AnalysisDetailsView.vue` (абзац «Завантаження аналізу…»), `AnalysisDetailsModal.vue` (таблиця Показник/Значення + п’ять `.analysis-journal-scroll`, pending завжди в `detailRows`), `ProjectDetailPanel.vue` (`headerChanges`, `role="dialog"`), `src/styles.css` (`.board-detail-overlay` z-index 40, `.badge-verdict-*` / `.badge-blocked` уже є), тести з задач 6.x існують. Роутер і `src/api/http.js` (Axios) не потребують змін.

Дрібні неблокуючі зауваження (не блокують apply):
- У задачі 4.2 рядок сесії названо `runtime`, у спекі/decision — `env`; це поле `session.runtime`, підпис як зараз — «Середовище».
- ADDED `project-detail` хоче бейдж і для `nextRole`; задача 5.1 явно баджує вердикт і blocked — `nextRole` теж обгорнути в `.badge` / чіп.
- Незмінені речення головних спек ще кажуть «таблиця» (`factory-board` «Живий огляд…», сценарій «Агенти з handoff»). Після archive варто підчистити формулювання; на apply не впливає: delta вже фіксує картки й H-scroll лише на `/`.

## Findings

Немає blocker / major. Apply дозволено.
