import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getProviderClient } from '@/api/providers'
import { useRegistryStore } from '@/stores/registry'
import { useToastsStore } from '@/stores/toasts'
import AnalysisView from './AnalysisView.vue'

vi.mock('@/api/providers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getProviderClient: vi.fn(),
  }
})

const STORAGE_KEY = 'factory-board.projects.v1'

const tasksText = [
  '- [x] first',
  '- [ ] second',
  '- [x] third',
  '- [ ] fourth',
  '- [ ] fifth',
  '- [x] sixth',
  '- [ ] seventh',
].join('\n')

const reviewText = 'Verdict: APPROVE'

const projectData = {
  provider: 'github',
  repo: 'owner/repo',
  branch: 'main',
}

function fetchArtifactFixture(_project, _changeName, artifact) {
  if (artifact === 'tasks.md') {
    return Promise.resolve(tasksText)
  }
  if (artifact === 'review.md') {
    return Promise.resolve(reviewText)
  }
  return Promise.resolve(null)
}

function kitJournal(overrides = {}) {
  return {
    version: 1,
    spend: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costUsd: null,
    },
    totals: {
      sessions: 7,
      durationMs: 2449985,
      leadTimeMs: 3151528,
      cloudSessions: 0,
    },
    phases: {
      spec: {
        durationMs: 467553,
      },
    },
    sessions: [
      { role: 'Architect', model: 'cursor-grok-4.6' },
      { role: 'Architect', model: 'cursor-grok-4.6' },
      { role: 'Spec Reviewer', model: 'cursor-grok-4.6' },
      { role: 'Spec Architect', model: 'cursor-grok-4.6' },
      { role: 'Spec Reviewer', model: 'cursor-grok-4.6' },
      { role: 'Implementer', model: 'cursor-grok-4.6' },
      { role: 'Archiver', model: 'cursor-grok-4.6' },
    ],
    pending: null,
    spendByModel: [{ model: 'cursor-grok-4.6' }],
    ...overrides,
  }
}

function createClient(overrides = {}) {
  return {
    listChanges: vi.fn().mockResolvedValue(['add-login']),
    listArchivedChanges: vi.fn().mockResolvedValue([
      {
        folder: '2026-08-28-add-factory-board',
        changeName: 'add-factory-board',
        archivedAt: '2026-08-28',
      },
    ]),
    fetchArtifact: vi.fn(fetchArtifactFixture),
    fetchArchivedArtifact: vi.fn().mockResolvedValue(null),
    listCommitsByPath: vi.fn().mockResolvedValue([]),
    listFolderEntries: vi.fn().mockResolvedValue({
      files: ['tasks.md', 'review.md'],
      dirs: [],
    }),
    ...overrides,
  }
}

function createJournalClient(journalOverrides = {}) {
  const journal = kitJournal(journalOverrides)
  return createClient({
    listFolderEntries: vi.fn().mockResolvedValue({
      files: ['tasks.md', 'review.md', 'metrics.json'],
      dirs: [],
    }),
    fetchArtifact: vi.fn((_project, _changeName, artifact) => {
      if (artifact === 'metrics.json') {
        return Promise.resolve(JSON.stringify(journal))
      }
      return fetchArtifactFixture(_project, _changeName, artifact)
    }),
  })
}

function columnText(wrapper, header, rowIndex = 0) {
  const index = wrapper.findAll('thead th').findIndex((th) => th.text() === header)
  return wrapper.findAll('tbody tr')[rowIndex].findAll('td')[index].text()
}

async function createTestRouter(projectId) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'board', component: { template: '<div>Board stub</div>' } },
      { path: '/analysis/:projectId', name: 'analysis', component: AnalysisView },
    ],
  })
  await router.push(`/analysis/${projectId}`)
  await router.isReady()
  return router
}

describe('AnalysisView', () => {
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
    document.body.innerHTML = ''
  })

  async function mountAnalysis(projectId = 'missing-project') {
    const router = await createTestRouter(projectId)
    wrapper = mount(AnalysisView, {
      global: {
        plugins: [router, pinia],
      },
    })
    return wrapper
  }

  it('shows empty registry message', async () => {
    getProviderClient.mockReturnValue(createClient())
    await mountAnalysis()
    await flushPromises()

    expect(wrapper.text()).toContain('Немає зареєстрованих проєктів.')
    expect(getProviderClient).not.toHaveBeenCalled()
  })

  it('does not load analysis when the project is missing', async () => {
    getProviderClient.mockReturnValue(createClient())
    useRegistryStore().addProject(projectData)
    await mountAnalysis('missing-project')
    await flushPromises()

    expect(wrapper.text()).toContain('Проєкт не знайдено. Відкрийте аналіз кнопкою в таблиці борду.')
    expect(getProviderClient).not.toHaveBeenCalled()
  })

  it('loads analysis on mount and shows dash for unknown cost', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    const project = useRegistryStore().projects[0]
    await mountAnalysis(project.id)
    await flushPromises()

    expect(client.listChanges).toHaveBeenCalledTimes(1)
    expect(client.listChanges.mock.calls[0][0].id).toBe(project.id)
    const exportButton = wrapper.findAll('button').find((button) => button.text() === 'Експорт CSV')
    expect(exportButton?.exists()).toBe(true)
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('$0.00')
  })

  it('loads only the routed project when several are registered', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    useRegistryStore().addProject({
      provider: 'gitlab',
      repo: 'group/other',
      branch: 'main',
    })
    const [first] = useRegistryStore().projects
    await mountAnalysis(first.id)
    await flushPromises()

    expect(client.listChanges).toHaveBeenCalledTimes(1)
    expect(client.listChanges.mock.calls[0][0].id).toBe(first.id)
    expect(wrapper.text()).toContain('github · owner/repo')
    expect(wrapper.text()).not.toContain('gitlab · group/other')
  })

  it('filters visible rows to archived changes', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    await mountAnalysis(useRegistryStore().projects[0].id)
    await flushPromises()

    expect(wrapper.text()).toContain('add-login')
    expect(wrapper.text()).toContain('add-factory-board')

    await wrapper.find('select').setValue('archived')
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('add-factory-board')
    expect(wrapper.text()).not.toContain('add-login')
  })

  it('opens analysis details in a modal with Kyiv dates', async () => {
    const client = createClient({
      listCommitsByPath: vi.fn().mockResolvedValue([
        { sha: 'a', date: '2026-08-27T10:56:57.000Z' },
        { sha: 'b', date: '2026-08-27T10:59:21.000Z' },
      ]),
    })
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    wrapper = mount(AnalysisView, {
      attachTo: document.body,
      global: {
        plugins: [await createTestRouter(useRegistryStore().projects[0].id), pinia],
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('2 хв 24 с')
    expect(wrapper.text()).not.toContain('0.0 год')

    const detailsBtn = wrapper.findAll('button').find((button) => button.text() === 'Деталі метрик')
    await detailsBtn.trigger('click')
    await nextTick()

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('Деталі метрик')
    expect(dialog.textContent).toContain('Джерело витрат')
    expect(dialog.textContent).toContain('27.08.2026, 13:56')
    expect(dialog.textContent).not.toContain('spend.source')
  })

  it('shows kit journal columns from metrics.json without zero cost', async () => {
    const client = createJournalClient()
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    await mountAnalysis(useRegistryStore().projects[0].id)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Сесії')
    expect(text).toContain('Lead time')
    expect(text).toContain('Моделі')
    expect(text).toContain('Платформи')
    expect(text).toContain('7')
    expect(text).toContain('cursor-grok-4.6')
    expect(text).not.toContain('$0.00')
  })

  it('shows pending badge when the journal has an open session', async () => {
    const client = createJournalClient({
      pending: {
        startedAt: '2026-08-29T09:00:00Z',
        role: 'Implementer',
        platform: 'amp',
        threadId: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8',
        clientSource: 'amp-threads-list',
      },
    })
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    await mountAnalysis(useRegistryStore().projects[0].id)
    await flushPromises()

    expect(wrapper.text()).toContain('триває')
    const badge = wrapper.find('.analysis-pending')
    expect(badge.attributes('title')).toBe(
      'Implementer · amp · T-01a0541e-a7f5-779f-9305-4b9a467c90f8 · amp-threads-list',
    )
  })

  it('keeps a dash in sessions without metrics.json and hides pending', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    await mountAnalysis(useRegistryStore().projects[0].id)
    await flushPromises()

    expect(columnText(wrapper, 'Сесії')).toBe('—')
    expect(wrapper.text()).not.toContain('триває')
  })

  it('shows kit journal when metrics.json arrives as a parsed object', async () => {
    const client = createClient({
      listFolderEntries: vi.fn().mockResolvedValue({
        files: ['tasks.md', 'review.md', 'metrics.json'],
        dirs: [],
      }),
      fetchArtifact: vi.fn((_project, _changeName, artifact) => {
        if (artifact === 'metrics.json') {
          return Promise.resolve(kitJournal())
        }
        return fetchArtifactFixture(_project, _changeName, artifact)
      }),
    })
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    await mountAnalysis(useRegistryStore().projects[0].id)
    await flushPromises()

    expect(columnText(wrapper, 'Сесії')).toBe('7')
    expect(wrapper.text()).toContain('cursor-grok-4.6')
    expect(useToastsStore().items.some((item) => item.message.includes('Аналіз оновлено'))).toBe(true)
  })

  it('toasts after CSV export', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    getProviderClient.mockReturnValue(createJournalClient())
    useRegistryStore().addProject(projectData)
    await mountAnalysis(useRegistryStore().projects[0].id)
    await flushPromises()

    const exportButton = wrapper.findAll('button').find((button) => button.text() === 'Експорт CSV')
    await exportButton.trigger('click')

    expect(useToastsStore().items.some((item) => item.message === 'CSV експортовано')).toBe(true)
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})
