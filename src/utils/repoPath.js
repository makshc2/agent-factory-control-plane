export function isRepoPath(value) {
  if (value == null) {
    return false
  }
  return /^[^/\s]+(?:\/[^/\s]+)+$/.test(String(value).trim())
}
