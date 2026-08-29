<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { formatDuration, formatKyivDate, formatKyivDateTime } from '@/utils/formatDateTime'

const DASH = '—'

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
  return [
    { label: 'Зміна', value: textOrDash(row.changeName) },
    { label: 'Архів', value: archiveValue.value },
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
    {
      label: 'Вартість',
      value: typeof spend.costUsd === 'number' ? `$${spend.costUsd.toFixed(2)}` : DASH,
    },
    { label: 'Середовище', value: textOrDash(agents.runtime) },
    { label: 'Ролі', value: listLabel(agents.roles, DASH) },
    {
      label: 'Як рахується час',
      value: 'інтервал комітів файлів, не wall-clock сесії',
    },
  ]
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
    </aside>
  </div>
</template>
