import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getProviderClient } from '@/api/providers'
import { useRegistryStore } from '@/stores/registry'
import { useToastsStore } from '@/stores/toasts'
import BoardView from './BoardView.vue'

vi.mock('@/api/providers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getProviderClient: vi.fn(),
  }
})

const STORAGE_KEY = 'factory-board.projects.v1'

const handoffText = [
  'Next command: /opsx:apply add-login',
  'Next role: Implementer',
  'Blocked: чекаємо токен',
].join('\n')

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
  if (artifact === 'handoff.md') {
    return Promise.resolve(handoffText)
  }
  if (artifact === 'tasks.md') {
    return Promise.resolve(tasksText)
  }
  if (artifact === 'review.md') {
    return Promise.resolve(reviewText)
  }
  return Promise.resolve(null)
}

function createClient(overrides = {}) {
  return {
    listChanges: vi.fn().mockResolvedValue(['add-login']),
    fetchArtifact: vi.fn(fetchArtifactFixture),
    fetchBranchHead: vi.fn().mockResolvedValue(null),
    listArchivedChanges: vi.fn().mockResolvedValue([]),
    listCommitsByPath: vi.fn().mockResolvedValue([]),
    listFolderEntries: vi.fn().mockResolvedValue({ files: [], dirs: [] }),
    ...overrides,
  }
}

describe('BoardView', () => {
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

  function createBoardRouter() {
    return createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'board', component: { template: '<div />' } },
        {
          path: '/analysis/:projectId',
          name: 'analysis',
          component: { template: '<div>Аналіз змін</div>' },
        },
      ],
    })
  }

  function mountBoard() {
    const router = createBoardRouter()
    wrapper = mount(BoardView, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router],
      },
    })
    return { wrapper, router }
  }

  function findButton(label) {
    const fromWrapper = wrapper.findAll('button').find((button) => button.text() === label)
    if (fromWrapper) {
      return fromWrapper
    }
    const element = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === label,
    )
    return element ? new DOMWrapper(element) : undefined
  }

  it('shows empty registry message', async () => {
    getProviderClient.mockReturnValue(createClient())
    mountBoard()
    await flushPromises()

    expect(wrapper.text()).toContain('Немає зареєстрованих проєктів.')
    expect(wrapper.text()).not.toContain('Аналіз')
  })

  it('renders a change row with progress and verdict after refresh', async () => {
    getProviderClient.mockReturnValue(createClient())
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    const table = wrapper.find('.board-table')
    expect(table.exists()).toBe(true)
    expect(table.text()).toContain('add-login')
    expect(table.text()).toContain('3/7')
    expect(table.text()).toContain('APPROVE')
    expect(table.text()).toContain('Аналіз')
  })

  it('navigates to analysis for one project when Аналіз is clicked', async () => {
    getProviderClient.mockReturnValue(createClient())
    useRegistryStore().addProject(projectData)
    const { router } = mountBoard()
    await flushPromises()

    await findButton('Аналіз').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('analysis')
    expect(router.currentRoute.value.params.projectId).toBe(useRegistryStore().projects[0].id)
  })

  it('shows duplicate message and does not add a second project', async () => {
    getProviderClient.mockReturnValue(createClient())
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    const addButton = wrapper.findAll('button').find((button) => button.text() === 'Додати проєкт')
    await addButton.trigger('click')

    await wrapper.find('#project-form-provider').setValue('github')
    await wrapper.find('#project-form-repo').setValue(projectData.repo)
    await wrapper.find('#project-form-branch').setValue(projectData.branch)
    await wrapper.find('form.project-form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Проєкт із таким провайдером, репозиторієм і гілкою вже є в реєстрі.',
    )
    expect(useRegistryStore().projects).toHaveLength(1)
  })

  it('shows authorization error badge after 401', async () => {
    getProviderClient.mockReturnValue(
      createClient({
        listChanges: vi.fn().mockRejectedValue({ response: { status: 401 } }),
      }),
    )
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    const errorBadge = wrapper.find('.badge-error')
    expect(errorBadge.exists()).toBe(true)
    expect(errorBadge.text()).toBe('Помилка авторизації. Перевірте токен доступу.')
    expect(wrapper.text()).toContain('Помилка авторизації. Перевірте токен доступу.')
  })

  it('shows loading indicator while listChanges is pending', async () => {
    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    getProviderClient.mockReturnValue(
      createClient({
        listChanges: vi.fn(() => deferred),
      }),
    )
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    const table = wrapper.find('.board-table')
    expect(table.exists()).toBe(true)
    expect(table.text()).toContain('оновлюється…')

    resolveList(['add-login'])
    await flushPromises()

    expect(wrapper.find('.board-table').text()).not.toContain('оновлюється…')
    expect(wrapper.find('.board-table').text()).toContain('add-login')
  })

  it('does not fetch branch head or extra artifacts on poll', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    expect(client.fetchBranchHead).not.toHaveBeenCalled()
    expect(client.listArchivedChanges).not.toHaveBeenCalled()
    expect(client.listCommitsByPath).not.toHaveBeenCalled()
    expect(client.listFolderEntries).not.toHaveBeenCalled()
    const artifacts = client.fetchArtifact.mock.calls.map((call) => call[2])
    expect(artifacts).not.toContain('proposal.md')
    expect(artifacts).not.toContain('decisions.md')
    expect(artifacts).not.toContain('design.md')
    expect(artifacts).not.toContain('metrics.json')
  })

  it('fetches extra artifacts when Деталі is clicked and closes the panel', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    await findButton('Деталі').trigger('click')
    await flushPromises()

    expect(client.fetchBranchHead).toHaveBeenCalled()
    expect(client.fetchArtifact.mock.calls.some((call) => call[2] === 'proposal.md')).toBe(true)
    expect(
      document.body.querySelector('.board-detail-panel')
      || document.body.querySelector('[role="dialog"]'),
    ).not.toBeNull()

    await findButton('Закрити').trigger('click')
    await flushPromises()

    expect(document.body.querySelector('.board-detail-panel')).toBeNull()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('returns focus to Деталі after closing the panel', async () => {
    getProviderClient.mockReturnValue(createClient())
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    const detailsBtn = wrapper.findAll('button').find((b) => b.text() === 'Деталі')
    const trigger = detailsBtn.element
    await detailsBtn.trigger('click')
    await flushPromises()
    const closeBtn = wrapper.findAll('button').find((b) => b.text() === 'Закрити') ?? findButton('Закрити')
    await closeBtn.trigger('click')
    await nextTick()
    await flushPromises()

    expect(document.activeElement).toBe(trigger)
  })

  it('toasts after a manual refresh', async () => {
    getProviderClient.mockReturnValue(createClient())
    useRegistryStore().addProject(projectData)
    mountBoard()
    await flushPromises()

    await findButton('Оновити').trigger('click')
    await flushPromises()

    expect(useToastsStore().items.some((item) => item.message === 'Борд оновлено')).toBe(true)
  })
})
