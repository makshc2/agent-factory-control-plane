<script setup>
import { computed, nextTick, onMounted, onUnmounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useRegistryStore } from '@/stores/registry'
import { useBoardStore } from '@/stores/board'
import { useToastsStore } from '@/stores/toasts'
import { usePoller } from '@/composables/usePoller'
import ProjectForm from '@/components/ProjectForm.vue'
import BoardTable from '@/components/BoardTable.vue'
import ProjectDetailPanel from '@/components/ProjectDetailPanel.vue'

const router = useRouter()
const registryStore = useRegistryStore()
const boardStore = useBoardStore()
const toasts = useToastsStore()
const { start, stop, refresh } = usePoller(() => boardStore.refreshAll(registryStore.projects))

const formOpen = shallowRef(false)
const editingProject = shallowRef(null)
const formError = shallowRef('')
const selectedProjectId = shallowRef(null)
const searchQuery = shallowRef('')
const providerFilter = shallowRef('')
const blockedOnly = shallowRef(false)
const errorOnly = shallowRef(false)

let detailsTriggerEl = null

const rows = computed(() => {
  const result = []
  for (const project of registryStore.projects) {
    const models = boardStore.statuses[project.id]
    if (!models || models.length === 0) {
      result.push({
        projectId: project.id,
        projectLabel: project.repo,
        changeName: null,
        nextCommand: null,
        nextRole: null,
        blocked: null,
        tasksDone: null,
        tasksTotal: null,
        verdict: null,
        updatedAt: null,
      })
      continue
    }
    for (const model of models) {
      result.push({
        projectId: project.id,
        projectLabel: project.repo,
        changeName: model.changeName,
        nextCommand: model.nextCommand,
        nextRole: model.nextRole,
        blocked: model.blocked,
        tasksDone: model.tasksDone,
        tasksTotal: model.tasksTotal,
        verdict: model.verdict,
        updatedAt: model.updatedAt,
      })
    }
  }
  return result
})

const projectStates = computed(() => ({
  loading: boardStore.loading,
  errors: boardStore.errors,
  lastUpdated: boardStore.lastUpdated,
}))

const projectCount = computed(() => registryStore.projects.length)

const activeChangeCount = computed(() => {
  let count = 0
  for (const project of registryStore.projects) {
    const models = boardStore.statuses[project.id]
    if (!Array.isArray(models)) {
      continue
    }
    for (const model of models) {
      if (model?.changeName) {
        count += 1
      }
    }
  }
  return count
})

const blockedCount = computed(() => {
  let count = 0
  for (const project of registryStore.projects) {
    const models = boardStore.statuses[project.id]
    if (!Array.isArray(models)) {
      continue
    }
    for (const model of models) {
      if (model?.blocked) {
        count += 1
      }
    }
  }
  return count
})

const errorCount = computed(() => Object.keys(boardStore.errors).length)

const filteredRows = computed(() => {
  const query = String(searchQuery.value).trim().toLowerCase()
  const provider = providerFilter.value
  const onlyBlocked = blockedOnly.value
  const onlyError = errorOnly.value
  return rows.value.filter((row) => {
    if (query) {
      const label = String(row.projectLabel ?? '').toLowerCase()
      const change = String(row.changeName ?? '').toLowerCase()
      if (!label.includes(query) && !change.includes(query)) {
        return false
      }
    }
    if (provider) {
      const project = registryStore.projects.find((item) => item.id === row.projectId)
      if (!project || project.provider !== provider) {
        return false
      }
    }
    if (onlyBlocked && !row.blocked) {
      return false
    }
    if (onlyError && !projectStates.value.errors[row.projectId]) {
      return false
    }
    return true
  })
})

const selectedProject = computed(() => {
  if (selectedProjectId.value == null) {
    return null
  }
  return registryStore.projects.find((item) => item.id === selectedProjectId.value) ?? null
})

function openAddForm() {
  editingProject.value = null
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingProject.value = null
  formError.value = ''
}

async function onManualRefresh() {
  await refresh()
  const total = registryStore.projects.length
  const failed = Object.keys(boardStore.errors).length
  if (failed > 0 && failed < total) {
    toasts.warning(
      failed === 1
        ? 'Борд оновлено з помилкою в 1 проєкті'
        : `Борд оновлено з помилками в ${failed} проєктах`,
    )
    return
  }
  if (failed > 0) {
    toasts.error(failed === 1 ? 'Не вдалося оновити 1 проєкт' : `Не вдалося оновити ${failed} проєкти`)
    return
  }
  toasts.success('Борд оновлено')
}

function onSave(data) {
  if (editingProject.value) {
    registryStore.updateProject(editingProject.value.id, data)
    closeForm()
    refresh()
    return
  }
  const result = registryStore.addProject(data)
  if (result.ok) {
    closeForm()
    refresh()
    return
  }
  formError.value = result.error.message
}

function onEdit(projectId) {
  const project = registryStore.projects.find((item) => item.id === projectId) ?? null
  if (!project) {
    return
  }
  editingProject.value = project
  formError.value = ''
  formOpen.value = true
}

function onRemove(projectId) {
  registryStore.removeProject(projectId)
}

function onAnalysis(projectId) {
  if (!registryStore.projects.some((item) => item.id === projectId)) {
    return
  }
  router.push({ name: 'analysis', params: { projectId } })
}

function onDetails(projectId) {
  const project = registryStore.projects.find((item) => item.id === projectId)
  if (!project) {
    return
  }
  detailsTriggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null
  selectedProjectId.value = projectId
  if (!boardStore.details[projectId]) {
    boardStore.loadProjectDetails(project)
  }
}

function closePanel() {
  selectedProjectId.value = null
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

async function onRefreshDetails() {
  if (!selectedProject.value) {
    return
  }
  await boardStore.loadProjectDetails(selectedProject.value)
  const detailsError = boardStore.detailsError[selectedProject.value.id]
  if (detailsError) {
    toasts.error(detailsError.message)
    return
  }
  toasts.success('Деталі оновлено')
}

onMounted(() => {
  start()
  refresh()
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <main class="board">
    <h1>Factory board</h1>
    <div class="board-toolbar">
      <button type="button" @click="onManualRefresh">
        Оновити
      </button>
      <button type="button" @click="openAddForm">
        Додати проєкт
      </button>
    </div>
    <section class="board-kpis">
      <article class="board-kpi">
        Проєкти
        <strong>{{ projectCount }}</strong>
      </article>
      <article class="board-kpi">
        Активні зміни
        <strong>{{ activeChangeCount }}</strong>
      </article>
      <article class="board-kpi">
        Заблоковані
        <strong>{{ blockedCount }}</strong>
      </article>
      <article class="board-kpi">
        Помилки
        <strong>{{ errorCount }}</strong>
      </article>
    </section>
    <div class="board-filters">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Пошук за репозиторієм або зміною"
      >
      <select v-model="providerFilter">
        <option value="">
          Усі
        </option>
        <option value="github">
          github
        </option>
        <option value="gitlab">
          gitlab
        </option>
      </select>
      <button
        type="button"
        class="board-filter-chip"
        :class="{ 'is-active': blockedOnly }"
        @click="blockedOnly = !blockedOnly"
      >
        Blocked
      </button>
      <button
        type="button"
        class="board-filter-chip"
        :class="{ 'is-active': errorOnly }"
        @click="errorOnly = !errorOnly"
      >
        Помилка
      </button>
    </div>
    <template v-if="formOpen">
      <ProjectForm
        v-if="editingProject"
        :project="editingProject"
        @save="onSave"
        @cancel="closeForm"
      />
      <ProjectForm
        v-else
        @save="onSave"
        @cancel="closeForm"
      />
      <p v-if="formError">
        {{ formError }}
      </p>
    </template>
    <p v-if="registryStore.projects.length === 0">
      Немає зареєстрованих проєктів.
    </p>
    <p v-else-if="filteredRows.length === 0">
      Немає рядків за фільтром.
    </p>
    <BoardTable
      v-else
      :rows="filteredRows"
      :project-states="projectStates"
      @edit="onEdit"
      @remove="onRemove"
      @details="onDetails"
      @analysis="onAnalysis"
    />
    <Teleport
      v-if="selectedProjectId != null && selectedProject"
      to="body"
    >
      <ProjectDetailPanel
        :project="selectedProject"
        :header-changes="boardStore.statuses[selectedProjectId] || []"
        :last-updated="boardStore.lastUpdated[selectedProjectId] ?? null"
        :poll-error="boardStore.errors[selectedProjectId] ?? null"
        :details="boardStore.details[selectedProjectId] ?? null"
        :details-loading="Boolean(boardStore.detailsLoading[selectedProjectId])"
        :details-error="boardStore.detailsError[selectedProjectId] ?? null"
        @close="closePanel"
        @refresh-details="onRefreshDetails"
      />
    </Teleport>
  </main>
</template>
