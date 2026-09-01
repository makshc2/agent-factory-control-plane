<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { formatKyivDateTime } from '@/utils/formatDateTime'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

const EMPTY_FILE = 'немає файлу'

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
  headerChanges: {
    type: Array,
    default: () => [],
  },
  lastUpdated: {
    type: Number,
    default: null,
  },
  pollError: {
    type: Object,
    default: null,
  },
  details: {
    type: Object,
    default: null,
  },
  detailsLoading: {
    type: Boolean,
    default: false,
  },
  detailsError: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'refresh-details'])

const closeBtn = shallowRef(null)

const lastUpdatedLabel = computed(() => formatRelativeTime(props.lastUpdated))

const changeEntries = computed(() => {
  const changes = props.details?.changes
  if (changes == null || typeof changes !== 'object') {
    return []
  }
  return Object.entries(changes)
})

function isEmptyField(value) {
  if (value == null) {
    return true
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true
  }
  if (Array.isArray(value) && value.length === 0) {
    return true
  }
  return false
}

function fieldText(value) {
  if (isEmptyField(value)) {
    return EMPTY_FILE
  }
  return value
}

function shortSha(sha) {
  return String(sha).slice(0, 7)
}

function commitDateLabel(value) {
  return formatKyivDateTime(value) ?? (value == null || value === '' ? '' : String(value))
}

function tasksNm(change) {
  if (typeof change?.tasksDone === 'number' && typeof change?.tasksTotal === 'number') {
    return `${change.tasksDone}/${change.tasksTotal}`
  }
  return ''
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

function emitClose() {
  emit('close')
}

function emitRefresh() {
  emit('refresh-details')
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
  <div class="board-detail-overlay" @click.self="emitClose">
    <aside
      class="board-detail-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-detail-title"
    >
      <header class="board-detail-header">
        <h2 id="board-detail-title">
          {{ project.repo }}
        </h2>
        <button ref="closeBtn" type="button" @click="emitClose">
          Закрити
        </button>
        <p>
          <span class="badge">{{ project.provider }}</span>
          <span>{{ project.repo }}</span>
          <span>{{ project.branch }}</span>
          <span>{{ lastUpdatedLabel }}</span>
        </p>
        <p v-if="pollError?.message">
          {{ pollError.message }}
        </p>
        <ul v-if="headerChanges.length">
          <li
            v-for="(change, index) in headerChanges"
            :key="change.changeName ?? index"
          >
            <span>{{ change.changeName }}</span>
            <span class="badge">{{ change.nextRole }}</span>
            <span>{{ tasksNm(change) }}</span>
            <span
              v-if="change.verdict"
              class="badge badge-verdict"
              :class="verdictModifier(change.verdict)"
            >{{ change.verdict }}</span>
            <span v-if="change.blocked" class="badge badge-blocked">{{ change.blocked }}</span>
          </li>
        </ul>
      </header>
      <p v-if="detailsLoading">
        Завантаження деталей…
      </p>
      <p v-if="detailsError" class="board-detail-error">
        {{ detailsError.message }}
      </p>
      <template v-if="details">
        <article v-if="details.branchHead" class="board-detail-card">
          <p>
            {{ shortSha(details.branchHead.sha) }}
          </p>
          <p>{{ details.branchHead.message }}</p>
          <p>{{ details.branchHead.author }}</p>
          <p>{{ commitDateLabel(details.branchHead.date) }}</p>
          <p v-if="details.branchHead.url">
            <a
              :href="details.branchHead.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ shortSha(details.branchHead.sha) }}</a>
          </p>
        </article>
        <p v-else>
          Немає даних про коміт
        </p>
        <article
          v-for="[changeName, change] in changeEntries"
          :key="changeName"
          class="board-detail-card"
        >
          <h3>{{ changeName }}</h3>
          <div>
            <h4>Задачі</h4>
            <ul v-if="!isEmptyField(change?.taskList)">
              <li
                v-for="(task, taskIndex) in change.taskList"
                :key="`${changeName}-${taskIndex}`"
              >
                <input type="checkbox" disabled :checked="task.done">
                {{ task.text }}
              </li>
            </ul>
            <p v-else>
              {{ EMPTY_FILE }}
            </p>
          </div>
          <div>
            <h4>Handoff</h4>
            <p>{{ fieldText(change?.handoff?.nextCommand) }}</p>
            <p>{{ fieldText(change?.handoff?.nextRole) }}</p>
            <p>{{ fieldText(change?.handoff?.done) }}</p>
            <p>{{ fieldText(change?.handoff?.blocked) }}</p>
          </div>
          <div>
            <h4>Review</h4>
            <p>{{ fieldText(change?.reviewExcerpt) }}</p>
          </div>
          <div>
            <h4>Proposal</h4>
            <p>{{ fieldText(change?.proposal?.title) }}</p>
            <p>{{ fieldText(change?.proposal?.why) }}</p>
          </div>
          <div>
            <h4>Decisions</h4>
            <p>{{ fieldText(change?.decisionsExcerpt) }}</p>
          </div>
          <div>
            <h4>Design</h4>
            <p>{{ fieldText(change?.designExcerpt) }}</p>
          </div>
        </article>
      </template>
      <button type="button" @click="emitRefresh">
        Оновити деталі
      </button>
    </aside>
  </div>
</template>
