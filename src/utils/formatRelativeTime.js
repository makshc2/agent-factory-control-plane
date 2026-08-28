export function formatRelativeTime(value, now = Date.now()) {
  if (value == null) {
    return '—'
  }

  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) {
    return '—'
  }

  const diff = now - ts
  if (!Number.isFinite(diff) || diff < 0) {
    return '—'
  }

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) {
    return 'щойно'
  }

  const minutes = Math.floor(diff / (60 * 1000))
  if (minutes < 60) {
    return `${minutes} хв тому`
  }

  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 24) {
    return `${hours} год тому`
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  return `${days} дн. тому`
}
