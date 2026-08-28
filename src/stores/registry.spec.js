import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRegistryStore } from './registry.js'

const STORAGE_KEY = 'factory-board.projects.v1'

const validProject = {
  provider: 'github',
  repo: 'owner/repo',
  branch: 'main',
}

describe('useRegistryStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('adds a valid project and records it in projects', () => {
    const store = useRegistryStore()

    const result = store.addProject(validProject)

    expect(result).toMatchObject({ ok: true })
    expect(store.projects).toHaveLength(1)
    expect(store.projects[0]).toMatchObject(validProject)
  })

  it('rejects a repo that is only a login without owner/repo slash', () => {
    const store = useRegistryStore()

    const result = store.addProject({
      provider: 'github',
      repo: 'makshc2',
      branch: 'main',
    })

    expect(result).toMatchObject({ ok: false, error: { code: 'required' } })
    expect(result.error.message).toMatch(/owner\/repo/)
    expect(store.projects).toEqual([])
  })

  it('rejects a project without repo and leaves the list unchanged', () => {
    const store = useRegistryStore()
    store.addProject(validProject)
    const snapshot = [...store.projects]

    const result = store.addProject({
      provider: 'github',
      branch: 'main',
    })

    expect(result).toMatchObject({ ok: false, error: { code: 'required' } })
    expect(store.projects).toEqual(snapshot)
  })

  it('rejects a duplicate provider+repo+branch and leaves the list unchanged', () => {
    const store = useRegistryStore()
    store.addProject(validProject)
    const snapshot = [...store.projects]

    const result = store.addProject({ ...validProject })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('duplicate')
    expect(result.error.message).toBeTruthy()
    expect(store.projects).toEqual(snapshot)
  })

  it('persists added projects to localStorage and restores them in a new store instance', () => {
    const store = useRegistryStore()
    store.addProject(validProject)

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const persisted = JSON.parse(raw)
    expect(persisted).toHaveLength(1)
    expect(persisted[0]).toMatchObject(validProject)

    setActivePinia(createPinia())
    const restored = useRegistryStore()
    expect(restored.projects).toHaveLength(1)
    expect(restored.projects[0]).toMatchObject(validProject)
  })

  it('starts with an empty list when storage JSON is broken', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    setActivePinia(createPinia())

    const store = useRegistryStore()

    expect(store.projects).toEqual([])
  })
})
