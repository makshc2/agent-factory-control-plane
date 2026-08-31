<script setup>
import { computed, shallowRef, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAnalysisStore } from '@/stores/analysis'
import { useRegistryStore } from '@/stores/registry'
import { useToastsStore } from '@/stores/toasts'
import {
  analysisChangeRef,
  metricsToCsv,
  preferDuration,
  resolveDisplayedCost,
} from '@/utils/changeMetrics'
import { formatDuration, formatKyivDate, formatKyivDateTime } from '@/utils/formatDateTime'
import { displayRepoPath } from '@/utils/repoPath'

const DASH = '—'

const route = useRoute()
const router = useRouter()
const registryStore = useRegistryStore()
const analysisStore = useAnalysisStore()
const toasts = useToastsStore()

const searchQuery = shallowRef('')
const archiveFilter = shallowRef('')

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

function changesCountLabel(count) {
  const n = Number(count) || 0
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) {
    return `${n} зміна`
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} зміни`
  }
  return `${n} змін`
}

async function loadAnalysis() {
  if (!project.value) {
    return
  }
  await analysisStore.loadAnalysis([project.value])
  const projectError = analysisStore.error[project.value.id]
  if (projectError) {
    toasts.error(projectError.message)
    return
  }
  toasts.success(`Аналіз оновлено: ${changesCountLabel(analysisStore.rows.length)}`)
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
  const resolved = resolveDisplayedCost(row)
  if (resolved.costUsd == null) {
    return DASH
  }
  const text = `$${resolved.costUsd.toFixed(2)}`
  return resolved.estimated ? `≈ ${text}` : text
}

function costTitle(row) {
  const resolved = resolveDisplayedCost(row)
  if (resolved.costUsd == null) {
    return ''
  }
  if (resolved.estimated) {
    return 'оцінка kit (costUsdEstimated), не рахунок Cursor / Amp / Claude'
  }
  if (Number.isFinite(resolved.estimatedCostUsd)) {
    return `$${resolved.costUsd.toFixed(2)} billed · ≈ $${resolved.estimatedCostUsd.toFixed(2)} kit`
  }
  return ''
}

function projectLabel(row) {
  return displayRepoPath(row.repo) || row.repo || DASH
}

function modelNames(row) {
  return row.agents?.models ?? []
}

function openDetails(row) {
  router.push({
    name: 'analysis-details',
    params: {
      projectId: row.projectId,
      changeRef: analysisChangeRef(row),
    },
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
      :title="project.repo"
    >
      {{ project.provider }} · {{ displayRepoPath(project.repo) || project.repo }}
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
        <colgroup>
          <col class="analysis-table__col-repo">
          <col class="analysis-table__col-change">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-num">
          <col class="analysis-table__col-models">
        </colgroup>
        <thead>
          <tr>
            <th>Проєкт</th>
            <th>Зміна</th>
            <th class="analysis-table__num">
              Архів
            </th>
            <th class="analysis-table__num">
              Вердикт
            </th>
            <th class="analysis-table__num">
              Задачі
            </th>
            <th class="analysis-table__num">
              Цикли рев’ю
            </th>
            <th class="analysis-table__num">
              Спека
            </th>
            <th class="analysis-table__num">
              Рев’ю
            </th>
            <th class="analysis-table__num">
              Apply
            </th>
            <th class="analysis-table__num">
              Усього
            </th>
            <th class="analysis-table__num">
              Сесії
            </th>
            <th class="analysis-table__num">
              Lead time
            </th>
            <th class="analysis-table__num">
              Токени
            </th>
            <th class="analysis-table__num">
              Вартість
            </th>
            <th class="analysis-table__stack-cell">
              Моделі
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="rowKey(row)"
          >
            <td class="analysis-table__clip analysis-table__clip--repo">
              <span
                class="analysis-table__ellipsis"
                :title="row.repo"
              >{{ projectLabel(row) }}</span>
            </td>
            <td class="analysis-table__clip analysis-table__clip--change">
              <span
                class="analysis-table__ellipsis"
                :title="row.changeName"
              >
                {{ row.changeName }}
                <span
                  v-if="row.journal?.pending != null"
                  class="analysis-pending"
                  :title="pendingTitle(row)"
                >триває</span>
              </span>
            </td>
            <td class="analysis-table__num">
              {{ archiveLabel(row) }}
            </td>
            <td class="analysis-table__num">
              {{ row.verdict ?? DASH }}
            </td>
            <td class="analysis-table__num">
              {{ `${row.tasksDone}/${row.tasksTotal}` }}
            </td>
            <td class="analysis-table__num">
              {{ row.reviewLoops }}
            </td>
            <td
              class="analysis-table__num"
              :title="preferredDurationTitle(preferDuration(row.kitTimes?.phases?.spec, row.spans?.spec), row.spans?.spec)"
            >
              {{ durationLabel(preferDuration(row.kitTimes?.phases?.spec, row.spans?.spec).durationMs) }}
            </td>
            <td
              class="analysis-table__num"
              :title="preferredDurationTitle(preferDuration(row.kitTimes?.phases?.review, row.spans?.review), row.spans?.review)"
            >
              {{ durationLabel(preferDuration(row.kitTimes?.phases?.review, row.spans?.review).durationMs) }}
            </td>
            <td
              class="analysis-table__num"
              :title="preferredDurationTitle(preferDuration(row.kitTimes?.phases?.apply, row.spans?.apply), row.spans?.apply)"
            >
              {{ durationLabel(preferDuration(row.kitTimes?.phases?.apply, row.spans?.apply).durationMs) }}
            </td>
            <td
              class="analysis-table__num"
              :title="preferredDurationTitle(preferDuration(row.kitTimes?.workMs, row.spans?.change), row.spans?.change)"
            >
              {{ durationLabel(preferDuration(row.kitTimes?.workMs, row.spans?.change).durationMs) }}
            </td>
            <td class="analysis-table__num">
              {{ sessionsLabel(row) }}
            </td>
            <td class="analysis-table__num">
              {{ durationLabel(row.kitTimes?.leadMs) }}
            </td>
            <td class="analysis-table__num">
              {{ tokensLabel(row) }}
            </td>
            <td
              class="analysis-table__num"
              :title="costTitle(row)"
            >
              {{ costLabel(row) }}
            </td>
            <td class="analysis-table__stack-cell">
              <div class="analysis-table__models-row">
                <div
                  v-if="modelNames(row).length > 0"
                  class="analysis-table__stack"
                >
                  <span
                    v-for="name in modelNames(row)"
                    :key="name"
                    class="analysis-table__stack-item analysis-table__stack-item--model"
                  >{{ name }}</span>
                </div>
                <span v-else>{{ DASH }}</span>
                <button
                  type="button"
                  class="analysis-table__icon-btn"
                  aria-label="Деталі метрик"
                  title="Деталі метрик"
                  @click="openDetails(row)"
                >
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="currentColor"
                      d="M4 4h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v8h10V6H5Zm2 1.5h6v1.25H7V7.5Zm0 2.5h6v1.25H7V10Zm0 2.5h4v1.25H7V12.5Z"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
