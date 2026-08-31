export function isRepoPath(value) {
  if (value == null) {
    return false
  }
  return /^[^/\s]+(?:\/[^/\s]+)+$/.test(String(value).trim())
}

const NPD_CORE_PREFIX = 'nova_digital/npd/core-department/'

export function displayRepoPath(value) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return ''
  }
  const index = raw.toLowerCase().indexOf(NPD_CORE_PREFIX)
  if (index === -1) {
    return raw
  }
  return raw.slice(index + NPD_CORE_PREFIX.length) || raw
}
