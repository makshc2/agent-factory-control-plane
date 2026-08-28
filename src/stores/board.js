import { reactive } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { getProviderClient, normalizeProviderError } from '@/api/providers'
import { parseHandoff, parseReviewVerdict, parseTasksProgress } from '@/utils/openspecParsers'

export const useBoardStore = defineStore('board', () => {
  const statuses = reactive({})
  const loading = reactive({})
  const errors = reactive({})
  const lastUpdated = reactive({})

  async function refreshProject(project) {
    const id = project.id
    loading[id] = true
    try {
      const client = getProviderClient(project.provider)
      const changeNames = await client.listChanges(project)
      const models = await Promise.all(
        changeNames.map(async (changeName) => {
          const [handoffText, tasksText, reviewText] = await Promise.all([
            client.fetchArtifact(project, changeName, 'handoff.md'),
            client.fetchArtifact(project, changeName, 'tasks.md'),
            client.fetchArtifact(project, changeName, 'review.md'),
          ])
          const { nextCommand, nextRole, blocked } = parseHandoff(handoffText)
          const { done, total } = parseTasksProgress(tasksText)
          return {
            changeName,
            nextCommand,
            nextRole,
            blocked,
            tasksDone: done,
            tasksTotal: total,
            verdict: parseReviewVerdict(reviewText),
            updatedAt: Date.now(),
          }
        }),
      )
      statuses[id] = models
      lastUpdated[id] = Date.now()
      delete errors[id]
    } catch (error) {
      errors[id] = normalizeProviderError(error)
    } finally {
      loading[id] = false
    }
  }

  function refreshAll(projects) {
    return Promise.allSettled(projects.map((project) => refreshProject(project)))
  }

  return { statuses, loading, errors, lastUpdated, refreshProject, refreshAll }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBoardStore, import.meta.hot))
}
