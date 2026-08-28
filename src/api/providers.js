import * as github from '@/api/github'
import * as gitlab from '@/api/gitlab'

const clients = {
  github,
  gitlab,
}

const messages = {
  auth: 'Помилка авторизації. Перевірте токен доступу.',
  'rate-limit': 'Перевищено ліміт запитів. Спробуйте пізніше.',
  'not-found': 'Репозиторій або гілку не знайдено.',
  network:
    'Немає відповіді від сервера (мережа або CORS). Репозиторій має бути owner/repo, наприклад makshc2/my-project.',
}

function getHeader(headers, name) {
  if (!headers) {
    return undefined
  }
  const value = headers[name] ?? headers.get?.(name)
  return value == null ? undefined : String(value)
}

export function getProviderClient(provider) {
  const client = clients[provider]
  if (!client) {
    throw new Error(`Unknown provider: ${provider}`)
  }
  return client
}

export function normalizeProviderError(error) {
  const response = error?.response
  if (!response) {
    return { code: 'network', message: messages.network }
  }

  const status = response.status
  let code = 'network'

  if (status === 401) {
    code = 'auth'
  } else if (status === 429) {
    code = 'rate-limit'
  } else if (status === 403) {
    code = getHeader(response.headers, 'x-ratelimit-remaining') === '0' ? 'rate-limit' : 'auth'
  } else if (status === 404) {
    code = 'not-found'
  }

  return { code, message: messages[code] }
}
