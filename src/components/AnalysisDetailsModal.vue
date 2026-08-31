<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { collectJournalModelRows } from '@/utils/changeMetrics'
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

const emit = defineEmits(['close'])

const closeBtn = shallowRef(null)

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

function costLabel(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `$${value.toFixed(2)}`
  }
  return DASH
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
    {
      label: 'Журнал · статус',
      value: journal?.pending != null ? 'триває' : 'немає',
    },
    { label: 'Журнал · роль pending', value: textOrDash(journal?.pending?.role) },
    {
      label: 'Журнал · pending з',
      value: textOrDash(formatKyivDateTime(journal?.pending?.startedAt)),
    },
    { label: 'Журнал · pending платформа', value: textOrDash(journal?.pending?.platform) },
    { label: 'Журнал · pending thread', value: textOrDash(journal?.pending?.threadId) },
    { label: 'Журнал · pending клієнт', value: textOrDash(journal?.pending?.clientSource) },
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
    { label: 'Вартість', value: costLabel(spend.costUsd) },
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
      costUsd: costLabel(item.costUsd),
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
    costUsd: costLabel(item.costUsd),
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
      costUsd: costLabel(item.costUsd),
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
      costUsd,
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
      costUsd: costLabel(costUsd),
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
        costUsd: costLabel(source.costUsd),
        ampCredits: textOrDash(source.ampCredits),
        at: textOrDash(formatKyivDateTime(source.at)),
      })
    }
  }
  return rows
})

function emitClose() {
  emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    emitClose()
  }
}

onMounted(() => {
  closeBtn.value?.focus?.()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="board-detail-overlay"
    @click.self="emitClose"
  >
    <aside
      class="analysis-details-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-details-title"
    >
      <header class="analysis-details-header">
        <h2 id="analysis-details-title">
          Деталі метрик
        </h2>
        <button
          ref="closeBtn"
          type="button"
          @click="emitClose"
        >
          Закрити
        </button>
      </header>
      <p class="analysis-details-subtitle">
        {{ row.repo }}
      </p>
      <table class="analysis-details-table">
        <thead>
          <tr>
            <th>Показник</th>
            <th>Значення</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in detailRows"
            :key="item.label"
          >
            <th scope="row">
              {{ item.label }}
            </th>
            <td>{{ item.value }}</td>
          </tr>
        </tbody>
      </table>
      <div class="analysis-journal-scroll">
        <table class="analysis-journal-table">
          <thead>
            <tr>
              <th>Платформа</th>
              <th>Вхід</th>
              <th>Вихід</th>
              <th>Усього</th>
              <th>Вартість</th>
              <th>Amp credits</th>
              <th>Джерело</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in platformRows"
              :key="item.platform"
            >
              <td>{{ item.platform }}</td>
              <td>{{ item.inputTokens }}</td>
              <td>{{ item.outputTokens }}</td>
              <td>{{ item.totalTokens }}</td>
              <td>{{ item.costUsd }}</td>
              <td>{{ item.ampCredits }}</td>
              <td>{{ item.source }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="analysis-journal-scroll">
        <table class="analysis-journal-table">
          <thead>
            <tr>
              <th>Модель</th>
              <th>Платформа</th>
              <th>Вхід</th>
              <th>Вихід</th>
              <th>Усього</th>
              <th>Вартість</th>
              <th>Amp credits</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="modelRows.length === 0">
              <td colspan="7">
                немає
              </td>
            </tr>
            <tr
              v-for="(item, index) in modelRows"
              v-else
              :key="index"
            >
              <td>{{ item.model }}</td>
              <td>{{ item.platform }}</td>
              <td>{{ item.inputTokens }}</td>
              <td>{{ item.outputTokens }}</td>
              <td>{{ item.totalTokens }}</td>
              <td>{{ item.costUsd }}</td>
              <td>{{ item.ampCredits }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="analysis-journal-scroll">
        <table class="analysis-journal-table">
          <thead>
            <tr>
              <th>Фаза</th>
              <th>Сесії</th>
              <th>Тривалість</th>
              <th>Токени</th>
              <th>Вартість</th>
              <th>Агенти</th>
              <th>Моделі</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in phaseRows"
              :key="item.phase"
            >
              <td>{{ item.phase }}</td>
              <td>{{ item.sessions }}</td>
              <td>{{ item.duration }}</td>
              <td>{{ item.tokens }}</td>
              <td>{{ item.costUsd }}</td>
              <td>{{ item.agents }}</td>
              <td>{{ item.models }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="analysis-journal-scroll">
        <table class="analysis-journal-table">
          <thead>
            <tr>
              <th>Роль</th>
              <th>Фаза</th>
              <th>Модель</th>
              <th>Платформа</th>
              <th>Середовище</th>
              <th>Thread</th>
              <th>Джерело spend</th>
              <th>Початок</th>
              <th>Кінець</th>
              <th>Тривалість</th>
              <th>Токени</th>
              <th>Вартість</th>
              <th>Amp credits</th>
              <th>Задачі</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sessionRows.length === 0">
              <td colspan="14">
                немає
              </td>
            </tr>
            <tr
              v-for="(item, index) in sessionRows"
              v-else
              :key="index"
            >
              <td>{{ item.role }}</td>
              <td>{{ item.phase }}</td>
              <td>{{ item.model }}</td>
              <td>{{ item.platform }}</td>
              <td>{{ item.runtime }}</td>
              <td>{{ item.threadId }}</td>
              <td>{{ item.spendSource }}</td>
              <td>{{ item.startedAt }}</td>
              <td>{{ item.endedAt }}</td>
              <td>{{ item.duration }}</td>
              <td>{{ item.tokens }}</td>
              <td>{{ item.costUsd }}</td>
              <td>{{ item.ampCredits }}</td>
              <td>{{ item.tasks }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="analysis-journal-scroll">
        <table class="analysis-journal-table">
          <thead>
            <tr>
              <th>Роль</th>
              <th>Source id</th>
              <th>Via</th>
              <th>Платформа</th>
              <th>Модель</th>
              <th>Вхід</th>
              <th>Вихід</th>
              <th>Усього</th>
              <th>Вартість</th>
              <th>Amp credits</th>
              <th>Час</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sourceRows.length === 0">
              <td colspan="11">
                немає
              </td>
            </tr>
            <tr
              v-for="(item, index) in sourceRows"
              v-else
              :key="index"
            >
              <td>{{ item.role }}</td>
              <td>{{ item.id }}</td>
              <td>{{ item.via }}</td>
              <td>{{ item.platform }}</td>
              <td>{{ item.model }}</td>
              <td>{{ item.inputTokens }}</td>
              <td>{{ item.outputTokens }}</td>
              <td>{{ item.totalTokens }}</td>
              <td>{{ item.costUsd }}</td>
              <td>{{ item.ampCredits }}</td>
              <td>{{ item.at }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  </div>
</template>
