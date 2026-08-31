import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getProviderClient } from '@/api/providers'
import { useRegistryStore } from '@/stores/registry'
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

function createClient() {
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
})
