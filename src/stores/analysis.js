import { reactive, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { getProviderClient, normalizeProviderError } from '@/api/providers'
import { buildChangeMetrics, parseArchiveFolderName } from '@/utils/changeMetrics'
import {
  defaultAnalysisWindow,
  isValidAnalysisWindow,
  periodKey,
  shouldLoadChange,
} from '@/utils/analysisPeriod'

function uniqueBySha(commits) {
  const seen = new Set()
  const result = []
  for (const commit of commits) {
    const sha = commit?.sha
    if (sha == null || sha === '') {
      result.push(commit)
      continue
    }
    if (seen.has(sha)) {
      continue
    }
    seen.add(sha)
    result.push(commit)
  }
  return result
}

function emptyEntries() {
  return { files: [], dirs: [] }
}

function currentPeriodKey(periodMode, periodFrom, periodTo) {
  return periodKey({
    mode: periodMode,
    from: periodFrom,
    to: periodTo,
  })
}

async function loadChange(client, project, { changeName, archived, archiveFolder, archivedAt, fetchFn }) {
  const prefix = archived
    ? `openspec/changes/archive/${archiveFolder}/`
    : `openspec/changes/${changeName}/`
  const changePath = archived
    ? `openspec/changes/archive/${archiveFolder}`
    : `openspec/changes/${changeName}`

  const listed = await client.listFolderEntries(project, changePath)
  const entries = listed ?? emptyEntries()
  const files = new Set(entries.files ?? [])
  const dirs = new Set(entries.dirs ?? [])

  const [
    tasks,
    review,
    handoff,
    proposal,
    decisions,
    metrics,
    specProposal,
    specDesign,
    specSpecs,
    reviewCommits,
    applyCommits,
  ] = await Promise.all([
    files.has('tasks.md') ? fetchFn('tasks.md') : null,
    files.has('review.md') ? fetchFn('review.md') : null,
    files.has('handoff.md') ? fetchFn('handoff.md') : null,
    files.has('proposal.md') ? fetchFn('proposal.md') : null,
    files.has('decisions.md') ? fetchFn('decisions.md') : null,
    files.has('metrics.json') ? fetchFn('metrics.json') : null,
    files.has('proposal.md') ? client.listCommitsByPath(project, `${prefix}proposal.md`) : [],
    files.has('design.md') ? client.listCommitsByPath(project, `${prefix}design.md`) : [],
    dirs.has('specs') ? client.listCommitsByPath(project, `${prefix}specs`) : [],
    files.has('review.md') ? client.listCommitsByPath(project, `${prefix}review.md`) : [],
    files.has('tasks.md') ? client.listCommitsByPath(project, `${prefix}tasks.md`) : [],
  ])

  return buildChangeMetrics({
    project,
    changeName,
    archived,
    archiveFolder,
    archivedAt,
    artifacts: { tasks, review, handoff, proposal, decisions, metrics },
    commits: {
      spec: uniqueBySha([...specProposal, ...specDesign, ...specSpecs]),
      review: reviewCommits,
      apply: applyCommits,
    },
  })
}

async function loadProject(project, period) {
  const client = getProviderClient(project.provider)
  const [changeNames, archivedItems] = await Promise.all([
    client.listChanges(project),
    client.listArchivedChanges(project),
  ])

  const activeRows = []
  for (const changeName of changeNames) {
    activeRows.push(
      await loadChange(client, project, {
        changeName,
        archived: false,
        archiveFolder: null,
        archivedAt: null,
        fetchFn: (fileName) => client.fetchArtifact(project, changeName, fileName),
      }),
    )
  }

  const archiveRows = []
  for (const item of archivedItems) {
    const folder = item.folder
    const parsed = parseArchiveFolderName(folder)
    if (
      !shouldLoadChange({
        archived: true,
        archivedAt: parsed.archivedAt,
        mode: period.mode,
        from: period.from,
        to: period.to,
      })
    ) {
      continue
    }
    archiveRows.push(
      await loadChange(client, project, {
        changeName: parsed.changeName,
        archived: true,
        archiveFolder: folder,
        archivedAt: parsed.archivedAt,
        fetchFn: (fileName) => client.fetchArchivedArtifact(project, folder, fileName),
      }),
    )
  }

  return [...activeRows, ...archiveRows]
}

export const useAnalysisStore = defineStore('analysis', () => {
  const initialWindow = defaultAnalysisWindow()
  const rows = ref([])
  const loading = ref(false)
  const error = reactive({})
  const lastLoadedAt = ref(null)
  const periodMode = ref('range')
  const periodFrom = ref(initialWindow.from)
  const periodTo = ref(initialWindow.to)
  const loadedPeriodKey = ref(null)

  function setPeriodRange(from, to) {
    periodMode.value = 'range'
    periodFrom.value = from
    periodTo.value = to
  }

  function setPeriodAllTime() {
    periodMode.value = 'all'
  }

  function hasFreshAnalysis(projectId) {
    return (
      rows.value.some((row) => row.projectId === projectId) &&
      loadedPeriodKey.value === currentPeriodKey(periodMode.value, periodFrom.value, periodTo.value)
    )
  }

  async function loadAnalysis(projects) {
    const keep = projects.length === 1 && hasFreshAnalysis(projects[0].id)
    loading.value = true
    if (!keep) {
      rows.value = []
    }
    try {
      const collected = []
      let hadSuccess = false
      for (const project of projects) {
        const id = project.id
        try {
          const part = await loadProject(project, {
            mode: periodMode.value,
            from: periodFrom.value,
            to: periodTo.value,
          })
          collected.push(...part)
          delete error[id]
          hadSuccess = true
          if (!keep) {
            rows.value = [...collected]
          }
        } catch (reason) {
          error[id] = normalizeProviderError(reason)
        }
      }
      if (!(keep && !hadSuccess)) {
        rows.value = collected
        if (hadSuccess) {
          loadedPeriodKey.value = currentPeriodKey(
            periodMode.value,
            periodFrom.value,
            periodTo.value,
          )
        }
      }
      lastLoadedAt.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  return {
    rows,
    loading,
    error,
    lastLoadedAt,
    periodMode,
    periodFrom,
    periodTo,
    loadedPeriodKey,
    setPeriodRange,
    setPeriodAllTime,
    hasFreshAnalysis,
    isValidAnalysisWindow,
    loadAnalysis,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAnalysisStore, import.meta.hot))
}
