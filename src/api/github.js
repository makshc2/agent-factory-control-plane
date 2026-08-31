import { artifactGetConfig, createHttp } from './http'
import { parseArchiveFolderName } from '@/utils/changeMetrics'

function createGithubHttp(project, extraHeaders = {}) {
  const headers = { ...extraHeaders }
  const token = project.token || import.meta.env.VITE_GITHUB_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return createHttp({
    baseURL: 'https://api.github.com',
    headers,
  })
}

export async function listChanges(project) {
  const http = createGithubHttp(project)
  try {
    const { data } = await http.get(`/repos/${project.repo}/contents/openspec/changes`, {
      params: { ref: project.branch },
    })
    return data
      .filter((item) => item.type === 'dir' && item.name !== 'archive')
      .map((item) => item.name)
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error
    }
    try {
      await http.get(`/repos/${project.repo}/branches/${project.branch}`)
      return []
    } catch (checkError) {
      if (checkError.response?.status === 404) {
        throw error
      }
      throw checkError
    }
  }
}

export async function fetchArtifact(project, changeName, fileName) {
  const http = createGithubHttp(project, {
    Accept: 'application/vnd.github.raw+json',
  })
  try {
    const { data } = await http.get(
      `/repos/${project.repo}/contents/openspec/changes/${changeName}/${fileName}`,
      artifactGetConfig({ ref: project.branch }),
    )
    return data
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function fetchBranchHead(project) {
  const http = createGithubHttp(project)
  try {
    const { data } = await http.get(
      `/repos/${project.repo}/commits/${encodeURIComponent(project.branch)}`,
    )
    return {
      sha: data.sha,
      message: String(data.commit?.message ?? '').split(/\r?\n/)[0],
      author: data.commit?.author?.name,
      date: data.commit?.author?.date,
      url: data.html_url,
    }
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 409) {
      return null
    }
    throw error
  }
}

export async function listArchivedChanges(project) {
  const http = createGithubHttp(project)
  try {
    const { data } = await http.get(`/repos/${project.repo}/contents/openspec/changes/archive`, {
      params: { ref: project.branch },
    })
    if (!Array.isArray(data)) {
      return []
    }
    return data
      .filter((item) => item.type === 'dir')
      .map((item) => ({ folder: item.name, ...parseArchiveFolderName(item.name) }))
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error
    }
    try {
      await http.get(`/repos/${project.repo}/branches/${project.branch}`)
      return []
    } catch (checkError) {
      if (checkError.response?.status === 404) {
        throw error
      }
      throw checkError
    }
  }
}

export async function fetchArchivedArtifact(project, archiveFolder, fileName) {
  const http = createGithubHttp(project, {
    Accept: 'application/vnd.github.raw+json',
  })
  try {
    const { data } = await http.get(
      `/repos/${project.repo}/contents/openspec/changes/archive/${archiveFolder}/${fileName}`,
      artifactGetConfig({ ref: project.branch }),
    )
    return data
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function listFolderEntries(project, path) {
  const http = createGithubHttp(project)
  try {
    const { data } = await http.get(`/repos/${project.repo}/contents/${path}`, {
      params: { ref: project.branch },
    })
    if (!Array.isArray(data)) {
      return { files: [], dirs: [] }
    }
    return {
      files: data.filter((item) => item.type === 'file').map((item) => item.name),
      dirs: data.filter((item) => item.type === 'dir').map((item) => item.name),
    }
  } catch (error) {
    if (error.response?.status === 404) {
      return { files: [], dirs: [] }
    }
    throw error
  }
}

export async function listCommitsByPath(project, path) {
  const http = createGithubHttp(project)
  try {
    const { data } = await http.get(`/repos/${project.repo}/commits`, {
      params: { sha: project.branch, path, per_page: 100 },
    })
    if (!Array.isArray(data)) {
      return []
    }
    return data.map((item) => ({
      sha: item.sha,
      date: item.commit?.author?.date ?? null,
      message: String(item.commit?.message ?? '').split(/\r?\n/)[0],
    }))
  } catch (error) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}
