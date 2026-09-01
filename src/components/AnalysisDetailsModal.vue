<script setup>
import { computed } from 'vue'
import { collectJournalModelRows, resolveDisplayedCost } from '@/utils/changeMetrics'
import { formatDuration, formatKyivDate, formatKyivDateTime } from '@/utils/formatDateTime'

const DASH = '—'
const PLATFORM_KEYS = ['cursor', 'claude', 'amp']
const PHASE_KEYS = ['explore', 'design', 'spec', 'review', 'apply', 'archive', 'other']

const props = defineProps({
  row: {
    type: Object,
    required: true,
  },
})

const spendSourceLabel = {
  'metrics-file': 'файл metrics.json',
  unknown: 'невідомо',
}

const sessionSpendSourceLabel = {
  adapter: 'адаптер',
  'self-report': 'самозвіт',
  flag: 'прапорець',
  unreported: 'не вказано',
}

function textOrDash(value) {
  if (value == null || value === '') {
    return DASH
  }
  return value
}

function yesNo(value) {
  return value ? 'так' : 'ні'
}

function listLabel(items, emptyLabel) {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyLabel
  }
  return items.join(' · ')
}

function sessionSpendLabel(value) {
  if (value == null || value === '') {
    return DASH
  }
  return sessionSpendSourceLabel[value] ?? value
}

function hasSessionExtra(value) {
  return value != null && value !== '' && value !== DASH
}

function sessionModelsLabel(session) {
  const models = []
  if (typeof session?.model === 'string' && session.model !== '') {
    models.push(session.model)
  }
  for (const model of session?.models ?? []) {
    if (typeof model === 'string' && model !== '' && !models.includes(model)) {
      models.push(model)
    }
  }
  return listLabel(models, DASH)
}

function costLabel(item) {
  if (Number.isFinite(item?.costUsd)) {
    return `$${item.costUsd.toFixed(2)}`
  }
  if (Number.isFinite(item?.costUsdEstimated)) {
    return `≈ $${item.costUsdEstimated.toFixed(2)}`
  }
  return DASH
}

function displayedCostLabel(row) {
  const resolved = resolveDisplayedCost(row)
  if (resolved.costUsd == null) {
    return DASH
  }
  const text = `$${resolved.costUsd.toFixed(2)}`
  return resolved.estimated ? `≈ ${text}` : text
}

function spanRows(label, span) {
  return [
    { label: `${label} · початок`, value: textOrDash(formatKyivDateTime(span?.startedAt)) },
    { label: `${label} · кінець`, value: textOrDash(formatKyivDateTime(span?.endedAt)) },
    { label: `${label} · тривалість`, value: textOrDash(formatDuration(span?.durationMs)) },
    { label: `${label} · комітів`, value: String(span?.commitCount ?? 0) },
  ]
}

const archiveValue = computed(() => {
  if (!props.row.archived) {
    return 'ні'
  }
  const dated = formatKyivDate(props.row.archivedAt)
  return dated ? `так, ${dated}` : 'так'
})

const detailRows = computed(() => {
  const row = props.row
  const spend = row.spend ?? {}
  const agents = row.agents ?? {}
  const spans = row.spans ?? {}
  const journal = row.journal
  const kitTimes = row.kitTimes
  return [
    { label: 'Зміна', value: textOrDash(row.changeName) },
    { label: 'Архів', value: archiveValue.value },
    {
      label: 'Журнал · джерело',
      value: journal?.source === 'metrics-file' ? spendSourceLabel['metrics-file'] : 'невідомо',
    },
    { label: 'Журнал · версія', value: textOrDash(journal?.version) },
    { label: 'Журнал · створено', value: textOrDash(formatKyivDateTime(journal?.createdAt)) },
    { label: 'Журнал · оновлено', value: textOrDash(formatKyivDateTime(journal?.updatedAt)) },
    { label: 'Журнал · архівовано', value: textOrDash(formatKyivDateTime(journal?.archivedAt)) },
    ...(journal?.pending != null
      ? [
          { label: 'Журнал · статус', value: 'триває' },
          { label: 'Журнал · роль pending', value: textOrDash(journal.pending.role) },
          {
            label: 'Журнал · pending з',
            value: textOrDash(formatKyivDateTime(journal.pending.startedAt)),
          },
          { label: 'Журнал · pending платформа', value: textOrDash(journal.pending.platform) },
          { label: 'Журнал · pending thread', value: textOrDash(journal.pending.threadId) },
          { label: 'Журнал · pending клієнт', value: textOrDash(journal.pending.clientSource) },
        ]
      : []),
    { label: 'Усього · сесії', value: textOrDash(journal?.totals?.sessions) },
    { label: 'Усього · хмарні сесії', value: textOrDash(journal?.totals?.cloudSessions) },
    { label: 'Kit · робочий час', value: textOrDash(formatDuration(kitTimes?.workMs)) },
    { label: 'Kit · lead time', value: textOrDash(formatDuration(kitTimes?.leadMs)) },
    { label: 'Джерело витрат', value: spendSourceLabel[spend.source] ?? textOrDash(spend.source) },
    { label: 'Субагенти', value: listLabel(agents.subagents, 'немає') },
    { label: 'Критерії прийняття', value: yesNo(row.hasAcceptanceCriteria) },
    { label: 'Кількість рішень', value: String(row.decisionsCount ?? 0) },
    ...spanRows('Спека', spans.spec),
    ...spanRows('Рев’ю', spans.review),
    ...spanRows('Apply', spans.apply),
    ...spanRows('Усього', spans.change),
    { label: 'Токени · вхід', value: textOrDash(spend.inputTokens) },
    { label: 'Токени · вихід', value: textOrDash(spend.outputTokens) },
    { label: 'Токени · усього', value: textOrDash(spend.totalTokens) },
    { label: 'Вартість', value: displayedCostLabel(row) },
    { label: 'Середовище', value: textOrDash(agents.runtime) },
    { label: 'Ролі', value: listLabel(agents.roles, DASH) },
    {
      label: 'Як рахується час',
      value:
        journal?.source === 'metrics-file' || kitTimes?.source === 'kit-sessions'
          ? 'час сесій kit (metrics.json), не інтервал комітів'
          : 'інтервал комітів файлів, не wall-clock сесії',
    },
  ]
})

const platformRows = computed(() => {
  const platforms = props.row.journal?.spendByPlatform ?? {}
  return PLATFORM_KEYS.map((key) => {
    const item = platforms[key] ?? {}
    return {
      platform: key,
      inputTokens: textOrDash(item.inputTokens),
      outputTokens: textOrDash(item.outputTokens),
      totalTokens: textOrDash(item.totalTokens),
      costUsd: costLabel(item),
      ampCredits: textOrDash(item.ampCredits),
      source: textOrDash(item.source),
    }
  })
})

const modelRows = computed(() => {
  const blocked = props.row.agents?.roles ?? []
  return collectJournalModelRows(props.row.journal ?? {}, blocked).map((item) => ({
    model: textOrDash(item.model),
    platform: textOrDash(item.platform),
    inputTokens: textOrDash(item.inputTokens),
    outputTokens: textOrDash(item.outputTokens),
    totalTokens: textOrDash(item.totalTokens),
    costUsd: costLabel(item),
    ampCredits: textOrDash(item.ampCredits),
  }))
})

const phaseRows = computed(() => {
  const phases = props.row.journal?.phases ?? {}
  return PHASE_KEYS.filter((key) => Object.hasOwn(phases, key)).map((key) => {
    const item = phases[key] ?? {}
    return {
      phase: key,
      sessions: textOrDash(item.sessions),
      duration: textOrDash(formatDuration(item.durationMs)),
      tokens: textOrDash(item.totalTokens),
      costUsd: costLabel(item),
      agents: listLabel(item.agents, DASH),
      models: listLabel(item.models, DASH),
    }
  })
})

const sessionRows = computed(() => {
  const sessions = Array.isArray(props.row.journal?.sessions) ? props.row.journal.sessions : []
  return sessions.map((session) => {
    const {
      role,
      phase,
      platform,
      runtime,
      threadId,
      spendSource,
      startedAt,
      endedAt,
      durationMs,
      totalTokens,
      ampCredits,
      tasks,
    } = session
    return {
      role: textOrDash(role),
      phase: textOrDash(phase),
      model: sessionModelsLabel(session),
      platform: textOrDash(platform),
      runtime: textOrDash(runtime),
      threadId: textOrDash(threadId),
      spendSource: sessionSpendLabel(spendSource),
      startedAt: textOrDash(formatKyivDateTime(startedAt)),
      endedAt: textOrDash(formatKyivDateTime(endedAt)),
      duration: textOrDash(formatDuration(durationMs)),
      tokens: textOrDash(totalTokens),
      costUsd: costLabel(session),
      ampCredits: textOrDash(ampCredits),
      tasks: textOrDash(tasks),
    }
  })
})

const sourceRows = computed(() => {
  const sessions = Array.isArray(props.row.journal?.sessions) ? props.row.journal.sessions : []
  const rows = []
  for (const session of sessions) {
    for (const source of session.sources ?? []) {
      rows.push({
        role: textOrDash(session.role),
        id: textOrDash(source.id),
        via: textOrDash(source.via),
        platform: textOrDash(source.platform),
        model: textOrDash(source.model),
        inputTokens: textOrDash(source.inputTokens),
        outputTokens: textOrDash(source.outputTokens),
        totalTokens: textOrDash(source.totalTokens),
        costUsd: costLabel(source),
        ampCredits: textOrDash(source.ampCredits),
        at: textOrDash(formatKyivDateTime(source.at)),
      })
    }
  }
  return rows
})

</script>

<template>
  <section class="analysis-details">
    <article class="analysis-metric-card">
      <div
        v-for="item in detailRows"
        :key="item.label"
        class="analysis-metric-card__row"
      >
        <span>{{ item.label }}</span>
        <span>{{ item.value }}</span>
      </div>
    </article>
    <article
      v-for="item in platformRows"
      :key="item.platform"
      class="analysis-journal-card"
    >
      <div class="analysis-journal-card__row">
        <span>Платформа</span>
        <span>{{ item.platform }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Вхід</span>
        <span>{{ item.inputTokens }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Вихід</span>
        <span>{{ item.outputTokens }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Усього</span>
        <span>{{ item.totalTokens }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Вартість</span>
        <span>{{ item.costUsd }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Amp credits</span>
        <span>{{ item.ampCredits }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Джерело</span>
        <span>{{ item.source }}</span>
      </div>
    </article>
    <p v-if="modelRows.length === 0">
      немає
    </p>
    <template v-else>
      <article
        v-for="(item, index) in modelRows"
        :key="index"
        class="analysis-journal-card"
      >
        <div class="analysis-journal-card__row">
          <span>Модель</span>
          <span>{{ item.model }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Платформа</span>
          <span>{{ item.platform }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Вхід</span>
          <span>{{ item.inputTokens }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Вихід</span>
          <span>{{ item.outputTokens }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Усього</span>
          <span>{{ item.totalTokens }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Вартість</span>
          <span>{{ item.costUsd }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Amp credits</span>
          <span>{{ item.ampCredits }}</span>
        </div>
      </article>
    </template>
    <article
      v-for="item in phaseRows"
      :key="item.phase"
      class="analysis-journal-card"
    >
      <div class="analysis-journal-card__row">
        <span>Фаза</span>
        <span>{{ item.phase }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Сесії</span>
        <span>{{ item.sessions }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Тривалість</span>
        <span>{{ item.duration }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Токени</span>
        <span>{{ item.tokens }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Вартість</span>
        <span>{{ item.costUsd }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Агенти</span>
        <span>{{ item.agents }}</span>
      </div>
      <div class="analysis-journal-card__row">
        <span>Моделі</span>
        <span>{{ item.models }}</span>
      </div>
    </article>
    <section class="analysis-sessions">
      <p v-if="sessionRows.length === 0">
        немає
      </p>
      <template v-else>
        <article
          v-for="(item, index) in sessionRows"
          :key="index"
          class="analysis-session-card"
        >
          <p>
            <span class="analysis-session-card__wrap">{{ item.role }}</span>
            {{ item.phase }}
          </p>
          <p>{{ item.model }} · {{ item.platform }} · {{ item.runtime }}</p>
          <p>{{ item.startedAt }} → {{ item.endedAt }} · {{ item.duration }}</p>
          <p>
            {{ item.tokens }}
            · {{ item.costUsd }}
            · {{ item.ampCredits }}
            · {{ item.spendSource }}
          </p>
          <p v-if="hasSessionExtra(item.threadId)">
            {{ item.threadId }}
          </p>
          <p v-if="hasSessionExtra(item.tasks)">
            {{ item.tasks }}
          </p>
        </article>
      </template>
    </section>
    <p v-if="sourceRows.length === 0">
      немає
    </p>
    <template v-else>
      <article
        v-for="(item, index) in sourceRows"
        :key="index"
        class="analysis-journal-card"
      >
        <div class="analysis-journal-card__row">
          <span>Роль</span>
          <span>{{ item.role }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Source id</span>
          <span>{{ item.id }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Via</span>
          <span>{{ item.via }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Платформа</span>
          <span>{{ item.platform }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Модель</span>
          <span>{{ item.model }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Вхід</span>
          <span>{{ item.inputTokens }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Вихід</span>
          <span>{{ item.outputTokens }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Усього</span>
          <span>{{ item.totalTokens }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Вартість</span>
          <span>{{ item.costUsd }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Amp credits</span>
          <span>{{ item.ampCredits }}</span>
        </div>
        <div class="analysis-journal-card__row">
          <span>Час</span>
          <span>{{ item.at }}</span>
        </div>
      </article>
    </template>
  </section>
</template>
