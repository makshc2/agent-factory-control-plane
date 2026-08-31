# Session Handoff

## Closed role
Spec Reviewer

## Change
display-kit-cost-estimates

## Done
- Tier 1 `gate-check --review` passed.
- Tier 2 spec-reviewer: **Verdict: APPROVE** in `review.md`; `apply-notes.md` written.
- `npx agent-orchestrator-kit gate-check --base HEAD~1` now exits 0 (review gate passed).
- Apply already landed in `src/` before this review (operator request).

## Decisions
- Kit `costUsdEstimated` may be shown as `≈`; local `$3`/`$15` tables stay forbidden.
- Amp credits stay out of the dollar cell.

## Blocked
none

## Next command
`none`

## Next role
none

## Attach
openspec/changes/display-kit-cost-estimates/review.md, openspec/changes/display-kit-cost-estimates/apply-notes.md

## Subagents to spawn
none

## Constraints
- Do not start apply in the next chat; code is already in `src/`.
- Do not convert Amp credits to USD.
- Archive after merge.

## Runtime
- runtime: local
- agent_id: none

## Metrics
- platform: unknown
- model: unknown
- input_tokens: unknown
- output_tokens: unknown
- cost_usd: unknown
- amp_credits: unknown
- spend_source: unknown

## Prompt

```text
none

Ти — conductor наступної рольової сесії для зміни `display-kit-cost-estimates`.
Мова відповіді: українська (`project.agent_language: uk`).
НЕ змішуй фази. НЕ починай наступну роль у цьому ж чаті, доки ця фаза не закрита за HARD STOP.

## Хто ти і що робити
- Команда цієї сесії: `none`
- Наступна роль / субагент фази: `none`
- Amp: заспавни isolated skill `subagent-none` зі свіжим контекстом. Виконувати тіло спеціаліста в головному треді Amp — порушення протоколу.
- Cursor / Claude: заспавни `.cursor/agents/none.md` / `.claude/agents/none.md`.
- Батьківська сесія — лише conductor: перевіряє звіт, не виконує роботу спеціаліста.

## Обов'язковий старт (до будь-якої роботи спеціаліста)
1. Виконай pasted-команду `none` і оголоси роль.
2. `npx agent-orchestrator-kit status`
3. `npx agent-orchestrator-kit handoff display-kit-cost-estimates --restore`
4. Прочитай Memory MCP: `Change:display-kit-cost-estimates`, `Handoff:display-kit-cost-estimates`, `Decision:*`.
5. Якщо Memory порожнє або MCP недоступний — прочитай `openspec/changes/display-kit-cost-estimates/handoff.md`. Відсутність Memory НЕ блокує сесію, коли є файл.
6. Заспавни `session-handoff` у режимі restore, якщо брифінг неповний (Amp: isolated `subagent-session-handoff`).
7. Лише після цього заспавни субагента фази. Free-form «продовжуй» / «далі» при одній активній зміні = `Handoff.next_command`.

## Повний контекст попередньої сесії (самодостатній — не покладайся лише на Memory)
- Закрита роль: Spec Reviewer
- Зміна: display-kit-cost-estimates
- Зроблено:
- Tier 1 `gate-check --review` passed.
- Tier 2 spec-reviewer: **Verdict: APPROVE** in `review.md`; `apply-notes.md` written.
- `npx agent-orchestrator-kit gate-check --base HEAD~1` now exits 0 (review gate passed).
- Apply already landed in `src/` before this review (operator request).
- Рішення:
- Kit `costUsdEstimated` may be shown as `≈`; local `$3`/`$15` tables stay forbidden.
- Amp credits stay out of the dollar cell.
- Блокери:
none
- Attach:
openspec/changes/display-kit-cost-estimates/review.md, openspec/changes/display-kit-cost-estimates/apply-notes.md
- Субагенти цієї сесії:
none
- Обмеження:
- Do not start apply in the next chat; code is already in `src/`.
- Do not convert Amp credits to USD.
- Archive after merge.
- status: spec-approved
- tasks: 9/9
- review: APPROVE

## HARD STOP на виході (ти НЕ закінчив, поки це не виконано)
1. Заспавни `session-handoff` у режимі persist (Amp: isolated `subagent-session-handoff`). Якщо spawn недоступний — зроби persist сам, ніколи не пропускай.
2. Запиши `openspec/changes/display-kit-cost-estimates/handoff.md` з усіма секціями шаблону.
3. `npx agent-orchestrator-kit handoff display-kit-cost-estimates` — exit 0 обов'язковий. CLI записує Memory JSON абсолютним шляхом і друкує розширений промпт у stdout.
4. Якщо Memory MCP живий — онови `Change:display-kit-cost-estimates`, `Handoff:display-kit-cost-estimates`, `Decision:*` відповідно до файлу.
5. Встав stdout CLI у чат одним fenced-блоком. Не скорочуй. Без службового ярлика. Перший рядок — `/opsx:…`.
6. Зупинись. Наступна роль починається в НОВОМУ чаті з цим промптом.

OpenSpec-файли — source of truth для вимог і тасків. Memory і handoff.md — індекс фази. Цей промпт — повний операційний бриф наступного треду, навіть якщо Amp проігнорує Memory MCP.
```
