import { createHttp } from './http'

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
      { params: { ref: project.branch } },
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
