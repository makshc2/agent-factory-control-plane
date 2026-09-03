import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getProviderClient } from '@/api/providers'
import { useAnalysisStore } from './analysis.js'

vi.mock('@/api/providers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getProviderClient: vi.fn(),
  }
})

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

const project = {
  id: 'proj-1',
  provider: 'github',
  repo: 'owner/repo',
  branch: 'main',
}

describe('useAnalysisStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getProviderClient.mockReset()
  })

  it('loadAnalysis fills rows with active and archived changes', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()
    store.setPeriodAllTime()

    await store.loadAnalysis([project])

    expect(store.rows).toHaveLength(2)
    expect(store.rows.map((row) => row.changeName)).toEqual([
      'add-login',
      'add-factory-board',
    ])
    expect(store.rows[0]).toMatchObject({
      changeName: 'add-login',
      archived: false,
    })
    expect(store.rows[1]).toMatchObject({
      changeName: 'add-factory-board',
      archived: true,
    })
    expect(client.fetchArtifact).toHaveBeenCalledWith(project, 'add-login', 'tasks.md')
    expect(client.fetchArtifact).not.toHaveBeenCalledWith(project, 'add-login', 'metrics.json')
    expect(client.listFolderEntries).toHaveBeenCalled()
    expect(client.fetchArchivedArtifact).toHaveBeenCalled()
    expect(client.listCommitsByPath).toHaveBeenCalled()
    const commitPaths = client.listCommitsByPath.mock.calls.map((call) => call[1])
    expect(commitPaths).not.toContain('openspec/changes/add-login')
    expect(commitPaths).not.toContain('openspec/changes/archive/2026-08-28-add-factory-board')
  })

  it('keeps successful project rows when another project returns 401', async () => {
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
    const store = useAnalysisStore()
    store.setPeriodAllTime()

    await store.loadAnalysis([okProject, failProject])

    expect(store.rows.map((row) => row.changeName)).toEqual([
      'add-login',
      'add-factory-board',
    ])
    expect(store.error[failProject.id].code).toBe('auth')
    expect(store.error[okProject.id]).toBeUndefined()
  })

  it('treats invalid metrics.json as unknown spend without throwing', async () => {
    const client = createClient({
      listFolderEntries: vi.fn().mockResolvedValue({
        files: ['tasks.md', 'review.md', 'metrics.json'],
        dirs: [],
      }),
      fetchArtifact: vi.fn((_project, _changeName, artifact) => {
        if (artifact === 'metrics.json') {
          return Promise.resolve('{')
        }
        return fetchArtifactFixture(_project, _changeName, artifact)
      }),
    })
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()

    await expect(store.loadAnalysis([project])).resolves.toBeUndefined()

    const activeRow = store.rows.find((row) => row.changeName === 'add-login')
    expect(activeRow.spend.source).toBe('unknown')
    expect(activeRow.journal.source).toBe('unknown')
    expect(activeRow.journal.sessions).toEqual([])
  })

  it('attaches kit journal from metrics.json without treating null spend as metrics-file', async () => {
    const journalPayload = {
      totals: { sessions: 7 },
      sessions: [{}, {}, {}, {}, {}, {}, {}],
      spend: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        costUsd: null,
      },
    }
    const client = createClient({
      listFolderEntries: vi.fn().mockResolvedValue({
        files: ['tasks.md', 'review.md', 'metrics.json'],
        dirs: [],
      }),
      fetchArtifact: vi.fn((_project, _changeName, artifact) => {
        if (artifact === 'metrics.json') {
          return Promise.resolve(JSON.stringify(journalPayload))
        }
        return fetchArtifactFixture(_project, _changeName, artifact)
      }),
    })
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()

    await expect(store.loadAnalysis([project])).resolves.toBeUndefined()

    const activeRow = store.rows.find((row) => row.changeName === 'add-login')
    expect(activeRow.journal.source).toBe('metrics-file')
    expect(activeRow.journal.totals.sessions).toBe(7)
    expect(activeRow.spend.source).toBe('unknown')
  })

  it('attaches kit journal when fetchArtifact already decoded metrics.json', async () => {
    const journalPayload = {
      totals: { sessions: 5, durationMs: 1427241, leadTimeMs: 1578794 },
      sessions: [{ role: 'Explorer', platform: 'cursor' }],
      spend: {
        inputTokens: 3818279,
        outputTokens: 38764,
        totalTokens: 3857043,
        costUsd: null,
      },
      spendByPlatform: {
        cursor: { totalTokens: 2839940, source: 'cursor-hook' },
        amp: { totalTokens: 1017103, source: 'amp-thread' },
      },
    }
    const client = createClient({
      listFolderEntries: vi.fn().mockResolvedValue({
        files: ['tasks.md', 'review.md', 'metrics.json'],
        dirs: [],
      }),
      fetchArtifact: vi.fn((_project, _changeName, artifact) => {
        if (artifact === 'metrics.json') {
          return Promise.resolve(journalPayload)
        }
        return fetchArtifactFixture(_project, _changeName, artifact)
      }),
    })
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()

    await expect(store.loadAnalysis([project])).resolves.toBeUndefined()

    const activeRow = store.rows.find((row) => row.changeName === 'add-login')
    expect(activeRow.journal.source).toBe('metrics-file')
    expect(activeRow.journal.totals.sessions).toBe(5)
    expect(activeRow.spend.source).toBe('metrics-file')
    expect(activeRow.spend.totalTokens).toBe(3857043)
    expect(activeRow.agents.platforms).toEqual(expect.arrayContaining(['cursor', 'amp']))
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
    const store = useAnalysisStore()

    const pending = store.loadAnalysis([project])

    expect(store.loading).toBe(true)

    resolveList(['add-login'])
    await pending

    expect(store.loading).toBe(false)
  })

  it('loads a second project only after the first finishes', async () => {
    let resolveFirst
    const deferred = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const githubProject = { ...project, id: 'gh' }
    const gitlabProject = { ...project, id: 'gl', provider: 'gitlab', repo: 'group/app' }
    const githubClient = createClient({
      listChanges: vi.fn(() => deferred),
    })
    const gitlabClient = createClient({
      listChanges: vi.fn().mockResolvedValue(['add-gitlab']),
    })
    getProviderClient.mockImplementation((provider) => {
      if (provider === 'gitlab') {
        return gitlabClient
      }
      return githubClient
    })
    const store = useAnalysisStore()

    const pending = store.loadAnalysis([githubProject, gitlabProject])

    expect(githubClient.listChanges).toHaveBeenCalled()
    expect(gitlabClient.listChanges).not.toHaveBeenCalled()

    resolveFirst(['add-login'])
    await pending

    expect(gitlabClient.listChanges).toHaveBeenCalled()
    expect(store.rows.map((row) => row.changeName)).toContain('add-login')
    expect(store.rows.map((row) => row.changeName)).toContain('add-gitlab')
  })

  it('keeps rows while a second loadAnalysis of the same project is pending', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()

    await store.loadAnalysis([project])

    expect(store.rows.length).toBeGreaterThanOrEqual(1)

    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    client.listChanges.mockImplementation(() => deferred)

    const pending = store.loadAnalysis([project])

    expect(store.loading).toBe(true)
    expect(store.rows.length).toBeGreaterThanOrEqual(1)

    resolveList(['add-login'])
    await pending
  })

  it('clears rows when loadAnalysis starts for a different project id', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()

    await store.loadAnalysis([project])

    expect(store.rows.length).toBeGreaterThanOrEqual(1)

    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    client.listChanges.mockImplementation(() => deferred)
    const otherProject = { ...project, id: 'proj-2' }

    const pending = store.loadAnalysis([otherProject])

    expect(store.rows.length).toBe(0)

    resolveList(['add-login'])
    await pending
  })

  it('skips archived changes outside the selected window', async () => {
    const client = createClient({
      listArchivedChanges: vi.fn().mockResolvedValue([
        {
          folder: '2026-08-28-add-factory-board',
          changeName: 'add-factory-board',
          archivedAt: '2026-08-28',
        },
        {
          folder: '2026-01-01-old-change',
          changeName: 'old-change',
          archivedAt: '2026-01-01',
        },
      ]),
    })
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()
    store.setPeriodRange('2026-08-27', '2026-09-02')

    await store.loadAnalysis([project])

    expect(store.rows.map((row) => row.changeName)).toEqual([
      'add-login',
      'add-factory-board',
    ])
    expect(store.rows.map((row) => row.changeName)).not.toContain('old-change')
    expect(client.listFolderEntries).not.toHaveBeenCalledWith(
      project,
      'openspec/changes/archive/2026-01-01-old-change',
    )
    expect(
      client.fetchArchivedArtifact.mock.calls.some(
        (call) => call[1] === '2026-01-01-old-change',
      ),
    ).toBe(false)
    expect(client.listFolderEntries).toHaveBeenCalledWith(
      project,
      'openspec/changes/archive/2026-08-28-add-factory-board',
    )
  })

  it('loads every archive after setPeriodAllTime', async () => {
    const client = createClient({
      listArchivedChanges: vi.fn().mockResolvedValue([
        {
          folder: '2026-08-28-add-factory-board',
          changeName: 'add-factory-board',
          archivedAt: '2026-08-28',
        },
        {
          folder: '2026-01-01-old-change',
          changeName: 'old-change',
          archivedAt: '2026-01-01',
        },
      ]),
    })
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()
    store.setPeriodAllTime()

    await store.loadAnalysis([project])

    expect(store.rows.map((row) => row.changeName)).toEqual([
      'add-login',
      'add-factory-board',
      'old-change',
    ])
  })

  it('loads an archive without archivedAt inside the window', async () => {
    const client = createClient({
      listArchivedChanges: vi.fn().mockResolvedValue([
        {
          folder: 'hotfix',
          changeName: 'hotfix',
          archivedAt: null,
        },
      ]),
    })
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()
    store.setPeriodRange('2026-08-27', '2026-09-02')

    await store.loadAnalysis([project])

    expect(store.rows.map((row) => row.changeName)).toContain('hotfix')
  })

  it('does not clear rows while reloading the same project and period', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()
    store.setPeriodRange('2026-08-27', '2026-09-02')

    await store.loadAnalysis([project])

    expect(store.rows.length).toBeGreaterThanOrEqual(1)

    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    client.listChanges.mockImplementation(() => deferred)

    const pending = store.loadAnalysis([project])

    expect(store.loading).toBe(true)
    expect(store.rows.length).toBeGreaterThanOrEqual(1)

    resolveList(['add-login'])
    await pending
  })

  it('clears rows when loadAnalysis starts after the period changes', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()
    store.setPeriodRange('2026-08-27', '2026-09-02')

    await store.loadAnalysis([project])

    expect(store.rows.length).toBeGreaterThanOrEqual(1)

    store.setPeriodRange('2026-01-01', '2026-01-31')
    let resolveList
    const deferred = new Promise((resolve) => {
      resolveList = resolve
    })
    client.listChanges.mockImplementation(() => deferred)

    const pending = store.loadAnalysis([project])

    expect(store.rows.length).toBe(0)

    resolveList(['add-login'])
    await pending
  })

  it('calls listCommitsByPath with exactly two arguments and no since/until', async () => {
    const client = createClient()
    getProviderClient.mockReturnValue(client)
    const store = useAnalysisStore()
    store.setPeriodAllTime()

    await store.loadAnalysis([project])

    expect(client.listCommitsByPath.mock.calls.length).toBeGreaterThan(0)
    for (const call of client.listCommitsByPath.mock.calls) {
      expect(call.length).toBe(2)
      for (const arg of call) {
        if (arg != null && typeof arg === 'object') {
          expect('since' in arg).toBe(false)
          expect('until' in arg).toBe(false)
        }
      }
    }
  })
})
