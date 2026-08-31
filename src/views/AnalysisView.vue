<script setup>
import { computed, nextTick, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AnalysisDetailsModal from '@/components/AnalysisDetailsModal.vue'
import { useAnalysisStore } from '@/stores/analysis'
import { useRegistryStore } from '@/stores/registry'
import { metricsToCsv, preferDuration } from '@/utils/changeMetrics'
import { formatDuration, formatKyivDate, formatKyivDateTime } from '@/utils/formatDateTime'

const DASH = '—'

const route = useRoute()
const registryStore = useRegistryStore()
const analysisStore = useAnalysisStore()

const searchQuery = shallowRef('')
const archiveFilter = shallowRef('')
const selectedRow = shallowRef(null)

let detailsTriggerEl = null

const project = computed(
  () => registryStore.projects.find((item) => item.id === route.params.projectId) ?? null,
)

const filteredRows = computed(() => {
  const query = String(searchQuery.value).trim().toLowerCase()
  const archive = archiveFilter.value
  return analysisStore.rows.filter((row) => {
    if (query) {
      const repo = String(row.repo ?? '').toLowerCase()
      const change = String(row.changeName ?? '').toLowerCase()
      if (!repo.includes(query) && !change.includes(query)) {
        return false
      }
    }
    if (archive === 'active' && row.archived) {
      return false
    }
    if (archive === 'archived' && !row.archived) {
      return false
    }
    return true
  })
})

function loadAnalysis() {
  if (!project.value) {
    return Promise.resolve()
  }
  return analysisStore.loadAnalysis([project.value])
}

function exportCsv() {
  const blob = new Blob([`\uFEFF${metricsToCsv(analysisStore.rows)}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'factory-board-analysis.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function rowKey(row) {
  return `${row.projectId}:${row.archived ? (row.archiveFolder ?? row.changeName) : row.changeName}`
}

function archiveLabel(row) {
  if (!row.archived) {
    return 'ні'
  }
  const dated = formatKyivDate(row.archivedAt)
  if (dated) {
    return `так, ${dated}`
  }
  return 'так'
}

function durationLabel(durationMs) {
  return formatDuration(durationMs) ?? DASH
}

function spanTitle(span) {
  const started = formatKyivDateTime(span?.startedAt) ?? DASH
  const ended = formatKyivDateTime(span?.endedAt) ?? DASH
  return `${started} – ${ended}, комітів: ${span?.commitCount ?? 0}, інтервал комітів файлів, не wall-clock сесії`
}

function preferredDurationTitle(preferred, span) {
  if (preferred.source === 'kit-sessions') {
    return 'час сесій kit (metrics.json), не інтервал комітів'
  }
  return spanTitle(span)
}

function sessionsLabel(row) {
  const sessions = row.journal?.totals?.sessions
  if (sessions == null) {
    return DASH
  }
  return sessions
}

function modelsLabel(row) {
  const models = row.agents?.models ?? []
  if (models.length === 0) {
    return DASH
  }
  return models.join(' · ')
}

function platformsLabel(row) {
  const platforms = row.agents?.platforms ?? []
  if (platforms.length === 0) {
    return DASH
  }
  return platforms.join(' · ')
}

function pendingTitle(row) {
  const pending = row.journal?.pending
  if (!pending) {
    return ''
  }
  return [pending.role, pending.platform, pending.threadId, pending.clientSource]
    .filter(Boolean)
    .join(' · ')
}

function tokensLabel(row) {
  const totalTokens = row.spend?.totalTokens
  if (totalTokens == null) {
    return DASH
  }
  return totalTokens
}

function costLabel(row) {
  const costUsd = row.spend?.costUsd
  if (costUsd == null) {
    return DASH
  }
  return `$${costUsd.toFixed(2)}`
}

function agentsLabel(row) {
  const runtime = row.agents?.runtime
  const roles = row.agents?.roles ?? []
  const parts = [runtime, ...roles].filter(Boolean)
  if (parts.length === 0) {
    return DASH
  }
  return parts.join(' · ')
}

function openDetails(event, row) {
  detailsTriggerEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  selectedRow.value = row
}

function closeDetails() {
  selectedRow.value = null
  nextTick(() => {
    if (
      detailsTriggerEl instanceof HTMLElement
      && detailsTriggerEl.isConnected
      && typeof detailsTriggerEl.focus === 'function'
    ) {
      detailsTriggerEl.focus()
    }
    detailsTriggerEl = null
  })
}

watch(
  () => [route.params.projectId, project.value?.id],
  () => {
    loadAnalysis()
  },
  { immediate: true },
)
</script>

<template>
  <main class="board analysis">
    <h1>Аналіз змін</h1>
    <p
      v-if="project"
      class="analysis-project-title"
    >
      {{ project.provider }} · {{ project.repo }}
    </p>
    <div class="board-toolbar">
      <button
        type="button"
        :disabled="!project || analysisStore.loading"
        @click="loadAnalysis"
      >
        Оновити
      </button>
      <button
        type="button"
        :disabled="analysisStore.rows.length === 0"
        @click="exportCsv"
      >
        Експорт CSV
      </button>
      <RouterLink to="/">
        Борд
      </RouterLink>
    </div>
    <p v-if="analysisStore.loading">
      Завантаження аналізу…
    </p>
    <p
      v-for="(item, projectId) in analysisStore.error"
      :key="projectId"
      class="analysis-banner-error"
    >
      {{ item.message }}
    </p>
    <div class="board-filters">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Пошук за репозиторієм або зміною"
      >
      <select v-model="archiveFilter">
        <option value="">
          усі
        </option>
        <option value="active">
          активні
        </option>
        <option value="archived">
          архів
        </option>
      </select>
    </div>
    <p v-if="registryStore.projects.length === 0">
      Немає зареєстрованих проєктів.
    </p>
    <p v-else-if="!project">
      Проєкт не знайдено. Відкрийте аналіз кнопкою в таблиці борду.
    </p>
    <p v-else-if="!analysisStore.loading && analysisStore.rows.length === 0">
      Немає даних для аналізу.
    </p>
    <p v-else-if="analysisStore.rows.length > 0 && filteredRows.length === 0">
      Немає рядків за фільтром.
    </p>
    <div
      v-else-if="filteredRows.length > 0"
      class="board-table-wrap"
    >
      <table class="analysis-table">
        <thead>
          <tr>
            <th>Проєкт</th>
            <th>Зміна</th>
            <th>Архів</th>
            <th>Вердикт</th>
            <th>Задачі</th>
            <th>Цикли рев’ю</th>
            <th>Спека</th>
            <th>Рев’ю</th>
            <th>Apply</th>
            <th>Усього</th>
            <th>Сесії</th>
            <th>Lead time</th>
            <th>Токени</th>
            <th>Вартість</th>
            <th>Агенти</th>
            <th>Моделі</th>
            <th>Платформи</th>
            <th>Деталі</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="rowKey(row)"
          >
            <td>{{ row.repo }}</td>
            <td>
              {{ row.changeName }}
              <span
                v-if="row.journal?.pending != null"
                class="analysis-pending"
                :title="pendingTitle(row)"
              >триває</span>
            </td>
            <td>{{ archiveLabel(row) }}</td>
            <td>{{ row.verdict ?? DASH }}</td>
            <td>{{ `${row.tasksDone}/${row.tasksTotal}` }}</td>
            <td>{{ row.reviewLoops }}</td>
            <td :title="preferredDurationTitle(preferDuration(row.kitTimes?.phases?.spec, row.spans?.spec), row.spans?.spec)">
              {{ durationLabel(preferDuration(row.kitTimes?.phases?.spec, row.spans?.spec).durationMs) }}
            </td>
            <td :title="preferredDurationTitle(preferDuration(row.kitTimes?.phases?.review, row.spans?.review), row.spans?.review)">
              {{ durationLabel(preferDuration(row.kitTimes?.phases?.review, row.spans?.review).durationMs) }}
            </td>
            <td :title="preferredDurationTitle(preferDuration(row.kitTimes?.phases?.apply, row.spans?.apply), row.spans?.apply)">
              {{ durationLabel(preferDuration(row.kitTimes?.phases?.apply, row.spans?.apply).durationMs) }}
            </td>
            <td :title="preferredDurationTitle(preferDuration(row.kitTimes?.workMs, row.spans?.change), row.spans?.change)">
              {{ durationLabel(preferDuration(row.kitTimes?.workMs, row.spans?.change).durationMs) }}
            </td>
            <td>{{ sessionsLabel(row) }}</td>
            <td>{{ durationLabel(row.kitTimes?.leadMs) }}</td>
            <td>{{ tokensLabel(row) }}</td>
            <td>{{ costLabel(row) }}</td>
            <td>{{ agentsLabel(row) }}</td>
            <td>{{ modelsLabel(row) }}</td>
            <td>{{ platformsLabel(row) }}</td>
            <td>
              <button
                type="button"
                @click="openDetails($event, row)"
              >
                Деталі метрик
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Teleport
      v-if="selectedRow"
      to="body"
    >
      <AnalysisDetailsModal
        :row="selectedRow"
        @close="closeDetails"
      />
    </Teleport>
  </main>
</template>
