<script setup>
import { formatKyivDateTime } from '@/utils/formatDateTime'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { displayRepoPath } from '@/utils/repoPath'

const DASH = '—'

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  projectStates: {
    type: Object,
    default: () => ({
      loading: {},
      errors: {},
      lastUpdated: {},
    }),
  },
})

const emit = defineEmits(['edit', 'remove', 'details', 'analysis'])

function isPlaceholder(row) {
  return row.changeName == null || row.changeName === ''
}

function display(value) {
  if (value == null || value === '') {
    return DASH
  }
  return value
}

function projectLabel(row) {
  return displayRepoPath(row.projectLabel) || display(row.projectLabel)
}

function changeLabel(row) {
  if (isPlaceholder(row)) {
    return 'немає активних змін'
  }
  return display(row.changeName)
}

function phaseLabel(row) {
  return display(row.nextRole)
}

function commandValue(row) {
  if (row.nextCommand == null || row.nextCommand === '') {
    return null
  }
  return row.nextCommand
}

function tasksLabel(row) {
  if (isPlaceholder(row)) {
    return DASH
  }
  if (typeof row.tasksDone === 'number' && typeof row.tasksTotal === 'number') {
    return `${row.tasksDone}/${row.tasksTotal}`
  }
  return DASH
}

function verdictValue(row) {
  if (isPlaceholder(row)) {
    return null
  }
  return row.verdict || null
}

function verdictModifier(verdict) {
  if (verdict === 'APPROVE') {
    return 'badge-verdict-approve'
  }
  if (verdict === 'REQUEST CHANGES') {
    return 'badge-verdict-changes'
  }
  if (verdict === 'REJECT') {
    return 'badge-verdict-reject'
  }
  return ''
}

function formatTimestamp(value) {
  return formatKyivDateTime(value) ?? DASH
}

function updatedSource(row) {
  return props.projectStates?.lastUpdated?.[row.projectId] ?? row.updatedAt
}

function updatedLabel(row) {
  return formatTimestamp(updatedSource(row))
}

function updatedExact(row) {
  const relative = formatRelativeTime(updatedSource(row))
  return relative === DASH ? '' : relative
}

function isLoading(row) {
  return Boolean(props.projectStates?.loading?.[row.projectId])
}

function errorMessage(row) {
  return props.projectStates?.errors?.[row.projectId]?.message || null
}

function blockedReason(row) {
  if (isPlaceholder(row) || row.blocked == null || row.blocked === '') {
    return null
  }
  return row.blocked
}

function isFirstRowOfProject(index) {
  if (index === 0) {
    return true
  }
  return props.rows[index - 1]?.projectId !== props.rows[index]?.projectId
}

function onEdit(projectId) {
  emit('edit', projectId)
}

function onRemove(projectId) {
  emit('remove', projectId)
}

function onDetails(event, projectId) {
  event.currentTarget.focus()
  emit('details', projectId)
}

function onAnalysis(projectId) {
  emit('analysis', projectId)
}
</script>

<template>
  <div class="board-table-wrap">
    <table class="board-table">
      <colgroup>
        <col class="board-table__col-project">
        <col class="board-table__col-change">
        <col class="board-table__col-command">
        <col class="board-table__col-tasks">
        <col class="board-table__col-verdict">
        <col class="board-table__col-updated">
        <col class="board-table__col-status">
        <col class="board-table__col-actions">
      </colgroup>
      <thead>
        <tr>
          <th class="board-table__col-project">
            Проєкт
          </th>
          <th class="board-table__col-change">
            Зміна
          </th>
          <th class="board-table__col-command">
            Фаза
          </th>
          <th class="board-table__col-tasks">
            Задачі
          </th>
          <th class="board-table__col-verdict">
            Вердикт
          </th>
          <th class="board-table__col-updated">
            Оновлено
          </th>
          <th class="board-table__col-status">
            Статус
          </th>
          <th class="board-table__col-actions" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="`${row.projectId}:${row.changeName ?? 'empty'}:${index}`">
          <td class="board-table__project">
            <span
              v-if="isFirstRowOfProject(index)"
              class="board-table__repo"
              tabindex="-1"
              :title="display(row.projectLabel)"
              @click="onDetails($event, row.projectId)"
            >{{ projectLabel(row) }}</span>
          </td>
          <td :class="{ 'board-table__muted': isPlaceholder(row) }">
            {{ changeLabel(row) }}
          </td>
          <td class="board-table__command" :title="commandValue(row) || undefined">
            {{ phaseLabel(row) }}
            <div v-if="commandValue(row)" class="board-table__command-secondary">
              {{ commandValue(row) }}
            </div>
          </td>
          <td class="board-table__tasks">
            {{ tasksLabel(row) }}
            <progress
              v-if="row.tasksTotal > 0"
              class="board-detail-progress"
              :max="row.tasksTotal"
              :value="row.tasksDone"
            />
          </td>
          <td>
            <span
              v-if="verdictValue(row)"
              class="badge badge-verdict"
              :class="verdictModifier(verdictValue(row))"
            >{{ verdictValue(row) }}</span>
            <span v-else class="board-table__muted">{{ DASH }}</span>
          </td>
          <td class="board-table__updated" :title="updatedExact(row)">
            {{ updatedLabel(row) }}
          </td>
          <td class="board-table__status">
            <span v-if="isLoading(row)" class="board-table__loading">оновлюється…</span>
            <template v-else>
              <span v-if="blockedReason(row)" class="badge badge-blocked">{{ blockedReason(row) }}</span>
              <span v-if="errorMessage(row)" class="badge badge-error">{{ errorMessage(row) }}</span>
              <span v-if="!blockedReason(row) && !errorMessage(row)" class="badge badge-ok">ok</span>
            </template>
          </td>
          <td class="board-table__actions">
            <template v-if="isFirstRowOfProject(index)">
              <button type="button" @click="onAnalysis(row.projectId)">
                Аналіз
              </button>
              <button type="button" @click="onDetails($event, row.projectId)">
                Деталі
              </button>
              <button type="button" @click="onEdit(row.projectId)">
                Редагувати
              </button>
              <button type="button" class="board-table__danger" @click="onRemove(row.projectId)">
                Видалити
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
