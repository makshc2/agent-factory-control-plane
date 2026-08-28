import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getProviderClient } from '@/api/providers'
import { useBoardStore } from './board.js'

vi.mock('@/api/providers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getProviderClient: vi.fn(),
  }
})

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

const project = {
  id: 'proj-1',
  provider: 'github',
  repo: 'owner/repo',
  branch: 'main',
}

describe('useBoardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getProviderClient.mockReset()
  })

  it('refreshProject fills statuses with parsed model and sets lastUpdated', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useBoardStore()
    const before = Date.now()

    await store.refreshProject(project)

    const after = Date.now()
    expect(store.statuses[project.id]).toHaveLength(1)
    expect(store.statuses[project.id][0]).toMatchObject({
      changeName: 'add-login',
      nextCommand: '/opsx:apply add-login',
      nextRole: 'Implementer',
      blocked: 'чекаємо токен',
      tasksDone: 3,
      tasksTotal: 7,
      verdict: 'APPROVE',
    })
    expect(store.lastUpdated[project.id]).toBeGreaterThanOrEqual(before)
    expect(store.lastUpdated[project.id]).toBeLessThanOrEqual(after)
    expect(store.errors[project.id]).toBeUndefined()
    expect(store.loading[project.id]).toBe(false)
  })

  it('sets loading true while listChanges is pending and false after completion', async () => {
    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    const client = createClient({
      listChanges: vi.fn(() => deferred),
    })
    getProviderClient.mockReturnValue(client)
    const store = useBoardStore()

    const pending = store.refreshProject(project)

    expect(store.loading[project.id]).toBe(true)

    resolveList(['add-login'])
    await pending

    expect(store.loading[project.id]).toBe(false)
  })

  it('maps 401 to auth, clears loading, and keeps previous statuses', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useBoardStore()

    await store.refreshProject(project)
    const previous = store.statuses[project.id]

    client.listChanges.mockRejectedValue({ response: { status: 401 } })

    await store.refreshProject(project)

    expect(store.errors[project.id].code).toBe('auth')
    expect(store.loading[project.id]).toBe(false)
    expect(store.statuses[project.id]).toBe(previous)
  })

  it('refreshAll updates the successful project when another fails', async () => {
    const okProject = { ...project, id: 'ok' }
    const failProject = { ...project, id: 'fail', provider: 'gitlab' }
    const okClient = createClient()
    const failClient = createClient({
      listChanges: vi.fn().mockRejectedValue({ response: { status: 401 } }),
    })
    getProviderClient.mockImplementation((provider) => {
      if (provider === 'github') {
        return okClient
      }
      return failClient
    })
    const store = useBoardStore()

    await store.refreshAll([okProject, failProject])

    expect(store.statuses[okProject.id]).toHaveLength(1)
    expect(store.statuses[okProject.id][0]).toMatchObject({
      changeName: 'add-login',
      tasksDone: 3,
      tasksTotal: 7,
      verdict: 'APPROVE',
    })
    expect(store.lastUpdated[okProject.id]).toEqual(expect.any(Number))
    expect(store.errors[failProject.id].code).toBe('auth')
    expect(store.statuses[failProject.id]).toBeUndefined()
    expect(store.loading[okProject.id]).toBe(false)
    expect(store.loading[failProject.id]).toBe(false)
  })
})
