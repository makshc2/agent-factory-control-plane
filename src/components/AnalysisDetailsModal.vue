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

function usdLabel(value, estimated) {
  if (!Number.isFinite(value)) {
    return DASH
  }
  const text = `$${value.toFixed(2)}`
  return estimated ? `≈ ${text}` : text
}

function costLabel(item) {
  if (Number.isFinite(item?.costUsdTotal)) {
    return usdLabel(item.costUsdTotal, !Number.isFinite(item?.costUsd))
  }
  if (Number.isFinite(item?.costUsd)) {
    return usdLabel(item.costUsd, false)
  }
  return usdLabel(item?.costUsdEstimated, true)
}

function spanCard(title, span) {
  const fromKit = span?.source === 'kit-sessions'
  return {
    title,
    rows: [
      { label: 'Початок', value: textOrDash(formatKyivDateTime(span?.startedAt)) },
      { label: 'Кінець', value: textOrDash(formatKyivDateTime(span?.endedAt)) },
      { label: 'Тривалість', value: textOrDash(formatDuration(span?.durationMs)) },
      ...(fromKit ? [] : [{ label: 'Комітів', value: String(span?.commitCount ?? 0) }]),
      { label: 'Джерело', value: fromKit ? 'сесії kit (metrics.json)' : 'коміти файлів' },
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
  const cost = resolveDisplayedCost(row)
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
    { label: 'Вартість', value: usdLabel(cost.costUsd, cost.estimated) },
    { label: 'Вартість · рахунок', value: usdLabel(cost.billedCostUsd, false) },
    { label: 'Вартість · оцінка kit', value: usdLabel(cost.estimatedCostUsd, true) },
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

const spansFromKit = computed(() =>
  spanCards.value.some((card) => card.rows.some((item) => item.value === 'сесії kit (metrics.json)')),
)

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
      startedAt: textOrDash(formatKyivDateTime(item.startedAt)),
      endedAt: textOrDash(formatKyivDateTime(item.endedAt)),
      leadTime: textOrDash(formatDuration(item.leadTimeMs)),
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
          <table class="analysis-details-table">
            <tbody>
              <tr
                v-for="item in generalRows"
                :key="item.label"
              >
                <th scope="row">
                  {{ item.label }}
                </th>
                <td>{{ item.value }}</td>
              </tr>
            </tbody>
          </table>
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
          <table class="analysis-details-table">
            <tbody>
              <tr
                v-for="item in spendRows"
                :key="item.label"
              >
                <th scope="row">
                  {{ item.label }}
                </th>
                <td>{{ item.value }}</td>
              </tr>
            </tbody>
          </table>
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
          <table class="analysis-details-table">
            <tbody>
              <tr
                v-for="item in agentRows"
                :key="item.label"
              >
                <th scope="row">
                  {{ item.label }}
                </th>
                <td>{{ item.value }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>
    <section class="analysis-details-section">
      <header class="analysis-details-header">
        <h2>Фази OpenSpec (інтервали)</h2>
        <p class="analysis-details-subtitle">
          {{
            spansFromKit
              ? 'Початок і кінець фаз за сесіями kit із metrics.json.'
              : 'Інтервали за комітами файлів спеки, не сесії агентів.'
          }}
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
          <table class="analysis-details-table">
            <tbody>
              <tr
                v-for="item in card.rows"
                :key="item.label"
              >
                <th scope="row">
                  {{ item.label }}
                </th>
                <td>{{ item.value }}</td>
              </tr>
            </tbody>
          </table>
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
          <table class="analysis-details-table">
            <tbody>
              <tr>
                <th scope="row">
                  Платформа
                </th>
                <td>{{ item.platform }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вхід
                </th>
                <td>{{ item.inputTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вихід
                </th>
                <td>{{ item.outputTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Усього
                </th>
                <td>{{ item.totalTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вартість
                </th>
                <td>{{ item.costUsd }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Amp credits
                </th>
                <td>{{ item.ampCredits }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Джерело
                </th>
                <td>{{ item.source }}</td>
              </tr>
            </tbody>
          </table>
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
          <table class="analysis-details-table">
            <tbody>
              <tr>
                <th scope="row">
                  Модель
                </th>
                <td>{{ item.model }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Платформа
                </th>
                <td>{{ item.platform }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вхід
                </th>
                <td>{{ item.inputTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вихід
                </th>
                <td>{{ item.outputTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Усього
                </th>
                <td>{{ item.totalTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вартість
                </th>
                <td>{{ item.costUsd }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Amp credits
                </th>
                <td>{{ item.ampCredits }}</td>
              </tr>
            </tbody>
          </table>
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
          <table class="analysis-details-table">
            <tbody>
              <tr>
                <th scope="row">
                  Фаза
                </th>
                <td>{{ item.phase }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Сесії
                </th>
                <td>{{ item.sessions }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Початок
                </th>
                <td>{{ item.startedAt }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Кінець
                </th>
                <td>{{ item.endedAt }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Lead time
                </th>
                <td>{{ item.leadTime }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Тривалість
                </th>
                <td>{{ item.duration }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Токени
                </th>
                <td>{{ item.tokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вартість
                </th>
                <td>{{ item.costUsd }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Агенти
                </th>
                <td>{{ item.agents }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Моделі
                </th>
                <td>{{ item.models }}</td>
              </tr>
            </tbody>
          </table>
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
          <table class="analysis-details-table">
            <tbody>
              <tr>
                <th scope="row">
                  Роль
                </th>
                <td>{{ item.role }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Фаза
                </th>
                <td>{{ item.phase }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Модель
                </th>
                <td>{{ item.model }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Платформа
                </th>
                <td>{{ item.platform }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Середовище
                </th>
                <td>{{ item.runtime }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Початок
                </th>
                <td>{{ item.startedAt }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Кінець
                </th>
                <td>{{ item.endedAt }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Тривалість
                </th>
                <td>{{ item.duration }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Токени
                </th>
                <td>{{ item.tokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вартість
                </th>
                <td>{{ item.costUsd }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Amp credits
                </th>
                <td>{{ item.ampCredits }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Джерело витрат
                </th>
                <td>{{ item.spendSource }}</td>
              </tr>
              <tr v-if="hasSessionExtra(item.threadId)">
                <th scope="row">
                  Thread
                </th>
                <td>{{ item.threadId }}</td>
              </tr>
              <tr v-if="hasSessionExtra(item.tasks)">
                <th scope="row">
                  Задачі
                </th>
                <td>{{ item.tasks }}</td>
              </tr>
            </tbody>
          </table>
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
          <table class="analysis-details-table">
            <tbody>
              <tr>
                <th scope="row">
                  Роль
                </th>
                <td>{{ item.role }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Source id
                </th>
                <td>{{ item.id }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Via
                </th>
                <td>{{ item.via }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Платформа
                </th>
                <td>{{ item.platform }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Модель
                </th>
                <td>{{ item.model }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вхід
                </th>
                <td>{{ item.inputTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вихід
                </th>
                <td>{{ item.outputTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Усього
                </th>
                <td>{{ item.totalTokens }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Вартість
                </th>
                <td>{{ item.costUsd }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Amp credits
                </th>
                <td>{{ item.ampCredits }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Час
                </th>
                <td>{{ item.at }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>
  </section>
</template>
