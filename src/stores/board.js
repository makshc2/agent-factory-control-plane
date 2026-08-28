import { reactive } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { getProviderClient, normalizeProviderError } from '@/api/providers'
import {
  parseDecisionsExcerpt,
  parseHandoff,
  parseHandoffDetails,
  parseProposalExcerpt,
  parseReviewExcerpt,
  parseReviewVerdict,
  parseTaskList,
  parseTasksProgress,
} from '@/utils/openspecParsers'

const DETAIL_ARTIFACTS = [
  'tasks.md',
  'handoff.md',
  'review.md',
  'proposal.md',
  'decisions.md',
  'design.md',
]

export const useBoardStore = defineStore('board', () => {
  const statuses = reactive({})
  const loading = reactive({})
  const errors = reactive({})
  const lastUpdated = reactive({})
  const details = reactive({})
  const detailsLoading = reactive({})
  const detailsError = reactive({})

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

  async function loadProjectDetails(project) {
    const id = project.id
    detailsLoading[id] = true
    try {
      const client = getProviderClient(project.provider)
      const statusList = statuses[id]
      const changeNames = Array.isArray(statusList)
        ? statusList.filter((entry) => entry?.changeName).map((entry) => entry.changeName)
        : []

      const [branchHead, ...artifactResults] = await Promise.all([
        client.fetchBranchHead(project),
        ...changeNames.flatMap((changeName) =>
          DETAIL_ARTIFACTS.map((artifact) => client.fetchArtifact(project, changeName, artifact)),
        ),
      ])

      const changes = {}
      changeNames.forEach((changeName, index) => {
        const offset = index * DETAIL_ARTIFACTS.length
        const [tasks, handoff, review, proposal, decisions, design] = artifactResults.slice(
          offset,
          offset + DETAIL_ARTIFACTS.length,
        )
        changes[changeName] = {
          taskList: parseTaskList(tasks),
          handoff: parseHandoffDetails(handoff),
          reviewExcerpt: parseReviewExcerpt(review),
          proposal: parseProposalExcerpt(proposal),
          decisionsExcerpt: parseDecisionsExcerpt(decisions),
          designExcerpt: parseReviewExcerpt(design),
        }
      })

      details[id] = { branchHead, changes }
      delete detailsError[id]
    } catch (error) {
      detailsError[id] = normalizeProviderError(error)
    } finally {
      detailsLoading[id] = false
    }
  }

  return {
    statuses,
    loading,
    errors,
    lastUpdated,
    details,
    detailsLoading,
    detailsError,
    loadProjectDetails,
    refreshProject,
    refreshAll,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBoardStore, import.meta.hot))
}
