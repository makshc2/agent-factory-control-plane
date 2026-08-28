<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useRegistryStore } from '@/stores/registry'
import { useBoardStore } from '@/stores/board'
import { usePoller } from '@/composables/usePoller'
import ProjectForm from '@/components/ProjectForm.vue'
import BoardTable from '@/components/BoardTable.vue'

const registryStore = useRegistryStore()
const boardStore = useBoardStore()
const { start, stop, refresh } = usePoller(() => boardStore.refreshAll(registryStore.projects))

const formOpen = shallowRef(false)
const editingProject = shallowRef(null)
const formError = shallowRef('')

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
      <button type="button" @click="refresh">
        Оновити
      </button>
      <button type="button" @click="openAddForm">
        Додати проєкт
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
    <BoardTable
      v-else
      :rows="rows"
      :project-states="projectStates"
      @edit="onEdit"
      @remove="onRemove"
    />
  </main>
</template>
