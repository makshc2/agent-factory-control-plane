import { createHttp } from '@/api/http'

function createGitlabHttp(project) {
  const base = project.baseUrl || import.meta.env.VITE_GITLAB_BASE_URL || 'https://gitlab.com'
  const token = project.token || import.meta.env.VITE_GITLAB_TOKEN
  const headers = {}
  if (token) {
    headers['PRIVATE-TOKEN'] = token
  }
  return createHttp({ baseURL: base, headers })
}

export async function listChanges(project) {
  const http = createGitlabHttp(project)
  const id = encodeURIComponent(project.repo)
  try {
    const { data } = await http.get(`/api/v4/projects/${id}/repository/tree`, {
      params: {
        path: 'openspec/changes',
        ref: project.branch,
        per_page: 100,
      },
    })
    return data.filter((item) => item.type === 'tree' && item.name !== 'archive').map((item) => item.name)
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error
    }
    try {
      await http.get(`/api/v4/projects/${id}/repository/branches/${encodeURIComponent(project.branch)}`)
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
  const http = createGitlabHttp(project)
  const id = encodeURIComponent(project.repo)
  const filePath = encodeURIComponent(`openspec/changes/${changeName}/${fileName}`)
  try {
    const { data } = await http.get(`/api/v4/projects/${id}/repository/files/${filePath}/raw`, {
      params: { ref: project.branch },
    })
    return data
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}
