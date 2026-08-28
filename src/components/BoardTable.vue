<script setup>
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

const emit = defineEmits(['edit', 'remove'])

function isPlaceholder(row) {
  return row.changeName == null || row.changeName === ''
}

function display(value) {
  if (value == null || value === '') {
    return DASH
  }
  return value
}

function changeLabel(row) {
  if (isPlaceholder(row)) {
    return 'немає активних змін'
  }
  return display(row.changeName)
}

function commandLabel(row) {
  if (isPlaceholder(row)) {
    return DASH
  }
  return display(row.nextCommand)
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

function formatTimestamp(value) {
  if (value == null || value === '') {
    return DASH
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return DASH
  }
  return date.toLocaleString()
}

function updatedLabel(row) {
  const fromState = props.projectStates?.lastUpdated?.[row.projectId]
  return formatTimestamp(fromState ?? row.updatedAt)
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

function onEdit(projectId) {
  emit('edit', projectId)
}

function onRemove(projectId) {
  emit('remove', projectId)
}
</script>

<template>
  <table class="board-table">
    <thead>
      <tr>
        <th>Проєкт</th>
        <th>Зміна</th>
        <th>Наступна команда</th>
        <th>Задачі (n/m)</th>
        <th>Вердикт</th>
        <th>Оновлено</th>
        <th>Статус</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in rows" :key="`${row.projectId}:${row.changeName ?? 'empty'}:${index}`">
        <td>
          {{ display(row.projectLabel) }}
          <button type="button" @click="onEdit(row.projectId)">
            Редагувати
          </button>
          <button type="button" @click="onRemove(row.projectId)">
            Видалити
          </button>
        </td>
        <td>{{ changeLabel(row) }}</td>
        <td>{{ commandLabel(row) }}</td>
        <td>{{ tasksLabel(row) }}</td>
        <td>
          <span v-if="verdictValue(row)" class="badge badge-verdict">{{ verdictValue(row) }}</span>
          <span v-else>{{ DASH }}</span>
        </td>
        <td>{{ updatedLabel(row) }}</td>
        <td>
          <span v-if="isLoading(row)">оновлюється…</span>
          <template v-else>
            <span v-if="blockedReason(row)" class="badge badge-blocked">{{ blockedReason(row) }}</span>
            <span v-if="errorMessage(row)" class="badge badge-error">{{ errorMessage(row) }}</span>
            <span v-if="!blockedReason(row) && !errorMessage(row)">{{ DASH }}</span>
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>
