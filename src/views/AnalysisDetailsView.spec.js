import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getProviderClient } from '@/api/providers'
import { useAnalysisStore } from '@/stores/analysis'
import { useRegistryStore } from '@/stores/registry'
import { analysisChangeRef } from '@/utils/changeMetrics'
import AnalysisDetailsView from './AnalysisDetailsView.vue'
import AnalysisView from './AnalysisView.vue'

vi.mock('@/api/providers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getProviderClient: vi.fn(),
  }
})

const STORAGE_KEY = 'factory-board.projects.v1'

const projectData = {
  provider: 'github',
  repo: 'owner/repo',
  branch: 'main',
}

function createClient(overrides = {}) {
  return {
    listChanges: vi.fn().mockResolvedValue(['add-login']),
    listArchivedChanges: vi.fn().mockResolvedValue([]),
    fetchArtifact: vi.fn((_project, _changeName, artifact) => {
      if (artifact === 'tasks.md') {
        return Promise.resolve('- [x] first\n- [ ] second')
      }
      if (artifact === 'review.md') {
        return Promise.resolve('Verdict: APPROVE')
      }
      return Promise.resolve(null)
    }),
    fetchArchivedArtifact: vi.fn().mockResolvedValue(null),
    listCommitsByPath: vi.fn().mockResolvedValue([]),
    listFolderEntries: vi.fn().mockResolvedValue({
      files: ['tasks.md', 'review.md'],
      dirs: [],
    }),
    ...overrides,
  }
}

function seedActiveRow(projectId, changeName = 'add-login') {
  return {
    projectId,
    changeName,
    archived: false,
    archiveFolder: null,
    archivedAt: null,
    hasAcceptanceCriteria: false,
    decisionsCount: 0,
    spend: {
      source: 'unknown',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costUsd: null,
    },
    agents: {
      runtime: null,
      roles: [],
      subagents: [],
    },
    spans: {
      spec: {},
      review: {},
      apply: {},
      change: {},
    },
    journal: {
      source: 'unknown',
      pending: null,
      totals: {},
      sessions: [],
      spendByPlatform: {},
      spendByModel: [],
      phases: {},
    },
    kitTimes: {},
  }
}

describe('AnalysisDetailsView', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    pinia = createPinia()
    setActivePinia(pinia)
    getProviderClient.mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  async function mountDetails(projectId, changeRef) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'board', component: { template: '<div>Board stub</div>' } },
        { path: '/analysis/:projectId', name: 'analysis', component: AnalysisView },
        {
          path: '/analysis/:projectId/metrics/:changeRef',
          name: 'analysis-details',
          component: AnalysisDetailsView,
        },
      ],
    })
    await router.push(`/analysis/${projectId}/metrics/${changeRef}`)
    await router.isReady()
    wrapper = mount(AnalysisDetailsView, {
      global: {
        plugins: [router, pinia],
      },
    })
    return { wrapper, router }
  }

  it('loads details on a full-width page and goes back to analysis', async () => {
    getProviderClient.mockReturnValue(createClient())
    useRegistryStore().addProject(projectData)
    const project = useRegistryStore().projects[0]
    const { router } = await mountDetails(project.id, 'c:add-login')
    await flushPromises()

    expect(wrapper.text()).toContain('Деталі метрик')
    expect(wrapper.text()).toContain('Назад')
    expect(wrapper.text()).toContain('Джерело витрат')
    expect(wrapper.find('.analysis-details').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.findAll('button').find((button) => button.text() === 'Назад').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('analysis')
    expect(router.currentRoute.value.params.projectId).toBe(project.id)
  })

  it('shows loading overlay on a cold deep-link while listChanges is pending', async () => {
    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    const client = createClient({
      listChanges: vi.fn(() => deferred),
    })
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    const project = useRegistryStore().projects[0]
    await mountDetails(project.id, 'c:add-login')
    await nextTick()

    const overlay = wrapper.find('.analysis-loading-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.text()).toContain('Завантаження аналізу…')
    expect(wrapper.find('.analysis-details').exists()).toBe(false)

    resolveList(['add-login'])
    await flushPromises()
  })

  it('does not show overlay when analysis rows already exist', async () => {
    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    const client = createClient({
      listChanges: vi.fn(() => deferred),
    })
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    const project = useRegistryStore().projects[0]
    const seededRow = seedActiveRow(project.id, 'add-login')
    useAnalysisStore().rows.push(seededRow)
    await mountDetails(project.id, analysisChangeRef(seededRow))
    await nextTick()

    expect(wrapper.find('.analysis-loading-overlay').exists()).toBe(false)
    expect(wrapper.find('.analysis-details').exists()).toBe(true)
    expect(wrapper.text()).toContain('Джерело витрат')
    expect(client.listChanges).not.toHaveBeenCalled()

    resolveList(['add-login'])
  })
})
