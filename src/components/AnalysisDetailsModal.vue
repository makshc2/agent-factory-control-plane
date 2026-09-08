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

function spanCard(title, span) {
  return {
    title,
    rows: [
      { label: 'Початок', value: textOrDash(formatKyivDateTime(span?.startedAt)) },
      { label: 'Кінець', value: textOrDash(formatKyivDateTime(span?.endedAt)) },
      { label: 'Тривалість', value: textOrDash(formatDuration(span?.durationMs)) },
      { label: 'Комітів', value: String(span?.commitCount ?? 0) },
    ],
  }
}

const archiveValue = computed(() => {
  if (!props.row.archived) {
    return 'ні'
  }
  const dated = formatKyivDate(props.row.archivedAt)
  return dated ? `так, ${dated}` : 'так'
})

const generalRows = computed(() => {
  const row = props.row
  const journal = row.journal
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
  ]
})

const spendRows = computed(() => {
  const row = props.row
  const spend = row.spend ?? {}
  const journal = row.journal
  const kitTimes = row.kitTimes
  return [
    { label: 'Усього · сесії', value: textOrDash(journal?.totals?.sessions) },
    { label: 'Усього · хмарні сесії', value: textOrDash(journal?.totals?.cloudSessions) },
    { label: 'Kit · робочий час', value: textOrDash(formatDuration(kitTimes?.workMs)) },
    { label: 'Kit · lead time', value: textOrDash(formatDuration(kitTimes?.leadMs)) },
    { label: 'Джерело витрат', value: spendSourceLabel[spend.source] ?? textOrDash(spend.source) },
    { label: 'Токени · вхід', value: textOrDash(spend.inputTokens) },
    { label: 'Токени · вихід', value: textOrDash(spend.outputTokens) },
    { label: 'Токени · усього', value: textOrDash(spend.totalTokens) },
    { label: 'Вартість', value: displayedCostLabel(row) },
    {
      label: 'Як рахується час',
      value:
        journal?.source === 'metrics-file' || kitTimes?.source === 'kit-sessions'
          ? 'час сесій kit (metrics.json), не інтервал комітів'
          : 'інтервал комітів файлів, не wall-clock сесії',
    },
  ]
})

const agentRows = computed(() => {
  const row = props.row
  const agents = row.agents ?? {}
  return [
    { label: 'Субагенти', value: listLabel(agents.subagents, 'немає') },
    { label: 'Середовище', value: textOrDash(agents.runtime) },
    { label: 'Ролі', value: listLabel(agents.roles, DASH) },
    { label: 'Критерії прийняття', value: yesNo(row.hasAcceptanceCriteria) },
    { label: 'Кількість рішень', value: String(row.decisionsCount ?? 0) },
  ]
})

const spanCards = computed(() => {
  const spans = props.row.spans ?? {}
  return [
    spanCard('Спека', spans.spec),
    spanCard('Рев’ю', spans.review),
    spanCard('Apply', spans.apply),
    spanCard('Усього', spans.change),
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
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Загальна інформація</h2>
        <p class="analysis-details-subtitle">
          Що це за зміна та звідки взято журнал metrics.json.
        </p>
      </header>
      <div class="analysis-card-grid">
        <article class="analysis-metric-card analysis-metric-card--wide">
          <div
            v-for="item in generalRows"
            :key="item.label"
            class="analysis-metric-card__row"
          >
            <span>{{ item.label }}</span>
            <span>{{ item.value }}</span>
          </div>
        </article>
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Час і витрати</h2>
        <p class="analysis-details-subtitle">
          Скільки часу й грошей пішло на всю зміну.
        </p>
      </header>
      <div class="analysis-card-grid">
        <article class="analysis-metric-card analysis-metric-card--wide">
          <div
            v-for="item in spendRows"
            :key="item.label"
            class="analysis-metric-card__row"
          >
            <span>{{ item.label }}</span>
            <span>{{ item.value }}</span>
          </div>
        </article>
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Агенти та процес</h2>
        <p class="analysis-details-subtitle">
          Хто працював над зміною та чи є критерії прийняття й рішення.
        </p>
      </header>
      <div class="analysis-card-grid">
        <article class="analysis-metric-card analysis-metric-card--wide">
          <div
            v-for="item in agentRows"
            :key="item.label"
            class="analysis-metric-card__row"
          >
            <span>{{ item.label }}</span>
            <span>{{ item.value }}</span>
          </div>
        </article>
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Фази OpenSpec (коміти)</h2>
        <p class="analysis-details-subtitle">
          Інтервали за комітами файлів спеки, не сесії агентів.
        </p>
      </header>
      <div class="analysis-card-grid">
        <article
          v-for="card in spanCards"
          :key="card.title"
          class="analysis-metric-card"
        >
          <h3 class="analysis-metric-card__title">
            {{ card.title }}
          </h3>
          <div
            v-for="item in card.rows"
            :key="item.label"
            class="analysis-metric-card__row"
          >
            <span>{{ item.label }}</span>
            <span>{{ item.value }}</span>
          </div>
        </article>
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Витрати за платформами</h2>
        <p class="analysis-details-subtitle">
          Токени й вартість окремо по Cursor, Claude та Amp.
        </p>
      </header>
      <div class="analysis-card-grid">
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
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Моделі</h2>
        <p class="analysis-details-subtitle">
          Витрати в розрізі моделей.
        </p>
      </header>
      <p v-if="modelRows.length === 0">
        немає
      </p>
      <div
        v-else
        class="analysis-card-grid"
      >
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
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Фази OpenSpec (сесії)</h2>
        <p class="analysis-details-subtitle">
          Сесії, тривалість, токени й вартість по фазах пайплайна від explore до archive.
        </p>
      </header>
      <p v-if="phaseRows.length === 0">
        немає
      </p>
      <div
        v-else
        class="analysis-card-grid"
      >
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
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Сесії агентів</h2>
        <p class="analysis-details-subtitle">
          Кожна сесія: роль, фаза, модель, час і витрати.
        </p>
      </header>
      <p v-if="sessionRows.length === 0">
        немає
      </p>
      <div
        v-else
        class="analysis-card-grid"
      >
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
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Джерела витрат</h2>
        <p class="analysis-details-subtitle">
          Звідки адаптер узяв токени й вартість усередині сесії.
        </p>
      </header>
      <p v-if="sourceRows.length === 0">
        немає
      </p>
      <div
        v-else
        class="analysis-card-grid"
      >
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
      </div>
    </section>
  </section>
</template>
