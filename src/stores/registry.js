import { ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { isRepoPath } from '@/utils/repoPath'

const STORAGE_KEY = 'factory-board.projects.v1'

const REQUIRED_MESSAGE = 'Заповніть обовʼязкові поля: провайдер, репозиторій і гілка.'
const REPO_FORMAT_MESSAGE = 'Репозиторій має бути у форматі owner/repo, не лише логін.'
const DUPLICATE_MESSAGE = 'Проєкт із таким провайдером, репозиторієм і гілкою вже є в реєстрі.'

function readProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    return
  }
}

function isMissing(value) {
  return value == null || String(value).trim() === ''
}

export const useRegistryStore = defineStore('registry', () => {
  const projects = ref(readProjects())

  function addProject(data) {
    const provider = typeof data?.provider === 'string' ? data.provider.trim() : data?.provider
    const repo = typeof data?.repo === 'string' ? data.repo.trim() : data?.repo
    const branch = typeof data?.branch === 'string' ? data.branch.trim() : data?.branch

    if (isMissing(provider) || isMissing(repo) || isMissing(branch)) {
      return {
        ok: false,
        error: { code: 'required', message: REQUIRED_MESSAGE },
      }
    }

    if (!isRepoPath(repo)) {
      return {
        ok: false,
        error: { code: 'required', message: REPO_FORMAT_MESSAGE },
      }
    }

    const isDuplicate = projects.value.some(
      (project) => project.provider === provider && project.repo === repo && project.branch === branch,
    )
    if (isDuplicate) {
      return {
        ok: false,
        error: { code: 'duplicate', message: DUPLICATE_MESSAGE },
      }
    }

    const project = {
      id: crypto.randomUUID(),
      provider,
      repo,
      branch,
    }

    if (!isMissing(data?.token)) {
      project.token = data.token
    }
    if (!isMissing(data?.baseUrl)) {
      project.baseUrl = typeof data.baseUrl === 'string' ? data.baseUrl.trim() : data.baseUrl
    }

    projects.value = [...projects.value, project]
    persist(projects.value)
    return { ok: true, project }
  }

  function updateProject(id, patch) {
    const index = projects.value.findIndex((project) => project.id === id)
    if (index === -1) {
      return
    }
    projects.value[index] = { ...projects.value[index], ...patch, id }
    persist(projects.value)
  }

  function removeProject(id) {
    const next = projects.value.filter((project) => project.id !== id)
    if (next.length === projects.value.length) {
      return
    }
    projects.value = next
    persist(projects.value)
  }

  return { projects, addProject, updateProject, removeProject }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRegistryStore, import.meta.hot))
}
