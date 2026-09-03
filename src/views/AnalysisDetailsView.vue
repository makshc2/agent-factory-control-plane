<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnalysisDetailsModal from '@/components/AnalysisDetailsModal.vue'
import AnalysisLoadingOverlay from '@/components/AnalysisLoadingOverlay.vue'
import { useAnalysisStore } from '@/stores/analysis'
import { useRegistryStore } from '@/stores/registry'
import { useToastsStore } from '@/stores/toasts'
import { analysisChangeRef } from '@/utils/changeMetrics'
import { displayRepoPath } from '@/utils/repoPath'

const route = useRoute()
const router = useRouter()
const registryStore = useRegistryStore()
const analysisStore = useAnalysisStore()
const toasts = useToastsStore()

const project = computed(
  () => registryStore.projects.find((item) => item.id === route.params.projectId) ?? null,
)

const row = computed(
  () =>
    analysisStore.rows.find(
      (item) =>
        item.projectId === route.params.projectId &&
        analysisChangeRef(item) === route.params.changeRef,
    ) ?? null,
)

const showOverlay = computed(
  () => analysisStore.loading && project.value != null && row.value == null,
)

function goBack() {
  router.push({ name: 'analysis', params: { projectId: route.params.projectId } })
}

async function ensureLoaded() {
  if (!project.value) {
    return
  }
  if (analysisStore.hasFreshAnalysis(project.value.id)) {
    return
  }
  await analysisStore.loadAnalysis([project.value])
  const projectError = analysisStore.error[project.value.id]
  if (projectError) {
    toasts.error(projectError.message)
    return
  }
  toasts.success('Аналіз оновлено')
}

watch(
  () => [route.params.projectId, route.params.changeRef, project.value?.id],
  () => {
    ensureLoaded()
  },
  { immediate: true },
)
</script>

<template>
  <main class="board analysis analysis-details-page">
    <div class="board-toolbar">
      <button
        type="button"
        @click="goBack"
      >
        Назад
      </button>
    </div>
    <h1>Деталі метрик</h1>
    <p
      v-if="project"
      class="analysis-project-title"
      :title="project.repo"
    >
      {{ project.provider }} · {{ displayRepoPath(project.repo) || project.repo }}
      <template v-if="row">
        · {{ row.changeName }}
      </template>
    </p>
    <AnalysisLoadingOverlay :visible="showOverlay" />
    <p
      v-for="(item, projectId) in analysisStore.error"
      :key="projectId"
      class="analysis-banner-error"
    >
      {{ item.message }}
    </p>
    <p v-if="registryStore.projects.length === 0">
      Немає зареєстрованих проєктів.
    </p>
    <p v-else-if="!project">
      Проєкт не знайдено. Відкрийте аналіз кнопкою в таблиці борду.
    </p>
    <p v-else-if="!analysisStore.loading && !row">
      Зміну не знайдено.
    </p>
    <AnalysisDetailsModal
      v-else-if="row"
      :row="row"
    />
  </main>
</template>
