import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { getProviderClient } from '@/api/providers'
import { useRegistryStore } from '@/stores/registry'
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
  })

  function mountBoard() {
    wrapper = mount(BoardView, {
      global: {
        plugins: [pinia],
      },
    })
    return wrapper
  }

  it('shows empty registry message', async () => {
    getProviderClient.mockReturnValue(createClient())
    mountBoard()
    await flushPromises()

    expect(wrapper.text()).toContain('Немає зареєстрованих проєктів.')
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
})
