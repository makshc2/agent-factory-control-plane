import axios from 'axios'

const MAX_IN_FLIGHT = 4
const MAX_RETRY_AFTER_MS = 60_000
const DEFAULT_RETRY_AFTER_MS = 5_000

const hostStates = new Map()

function hostKey(baseURL) {
  try {
    return new URL(baseURL).host || 'default'
  } catch {
    return String(baseURL || 'default')
  }
}

function getHostState(baseURL) {
  const key = hostKey(baseURL)
  let state = hostStates.get(key)
  if (!state) {
    state = { active: 0, queue: [] }
    hostStates.set(key, state)
  }
  return state
}

function acquire(state) {
  return new Promise((resolve) => {
    if (state.active < MAX_IN_FLIGHT) {
      state.active += 1
      resolve()
      return
    }
    state.queue.push(resolve)
  })
}

function release(state) {
  if (!state) {
    return
  }
  const next = state.queue.shift()
  if (next) {
    next()
    return
  }
  state.active = Math.max(0, state.active - 1)
}

function headerValue(headers, name) {
  if (!headers) {
    return undefined
  }
  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (direct != null) {
    return String(direct)
  }
  return headers.get?.(name) == null ? undefined : String(headers.get(name))
}

function retryAfterMs(headers) {
  const raw = headerValue(headers, 'retry-after')
  if (raw != null && raw !== '') {
    const seconds = Number(raw)
    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(0, seconds) * 1000, MAX_RETRY_AFTER_MS)
    }
  }
  return DEFAULT_RETRY_AFTER_MS
}

function attachGuards(instance) {
  instance.interceptors.request.use(async (config) => {
    const state = getHostState(config.baseURL || instance.defaults.baseURL)
    config.__limitState = state
    await acquire(state)
    return config
  })

  instance.interceptors.response.use(
    (response) => {
      release(response.config.__limitState)
      return response
    },
    async (error) => {
      const config = error.config
      const state = config?.__limitState
      if (error.response?.status === 429 && config && !config.__retried429) {
        release(state)
        config.__retried429 = true
        await new Promise((resolve) => {
          setTimeout(resolve, retryAfterMs(error.response.headers))
        })
        return instance.request(config)
      }
      release(state)
      return Promise.reject(error)
    },
  )

  return instance
}

export function artifactGetConfig(params) {
  return {
    params,
    responseType: 'text',
    transitional: { forcedJSONParsing: false },
    transformResponse: [
      (data) => {
        if (data == null || typeof data === 'string') {
          return data
        }
        if (typeof data === 'object') {
          try {
            return JSON.stringify(data)
          } catch {
            return null
          }
        }
        return String(data)
      },
    ],
  }
}

export function createHttp({ baseURL, headers }) {
  return attachGuards(
    axios.create({
      baseURL,
      headers,
      timeout: 30_000,
    }),
  )
}

const http = attachGuards(
  axios.create({
    timeout: 30_000,
  }),
)

export default http
