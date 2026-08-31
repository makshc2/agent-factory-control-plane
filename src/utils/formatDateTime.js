const KYIV_TIME_ZONE = 'Europe/Kyiv'

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('uk-UA', {
  timeZone: KYIV_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const DATE_FORMAT = new Intl.DateTimeFormat('uk-UA', {
  timeZone: KYIV_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function parseFlexibleIso(value) {
  if (value == null || value === '') {
    return NaN
  }
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : NaN
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value
  }
  if (typeof value !== 'string') {
    return NaN
  }
  let raw = value.trim()
  if (!raw) {
    return NaN
  }
  raw = raw.replace(/(\.\d{3})\d*\.000Z$/i, '$1Z')
  raw = raw.replace(/(\.\d{3})\d+Z$/i, '$1Z')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)) {
    raw += 'Z'
  }
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : NaN
}

function toValidDate(value) {
  const ms = parseFlexibleIso(value)
  if (!Number.isFinite(ms)) {
    return null
  }
  return new Date(ms)
}

export function formatKyivDateTime(value) {
  const date = toValidDate(value)
  if (!date) {
    return null
  }
  return DATE_TIME_FORMAT.format(date)
}

export function formatKyivDate(value) {
  const date = toValidDate(value)
  if (!date) {
    return null
  }
  return DATE_FORMAT.format(date)
}

export function formatDuration(durationMs) {
  if (durationMs == null || !Number.isFinite(durationMs)) {
    return null
  }
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  if (totalSeconds === 0) {
    return '0 с'
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return minutes > 0 ? `${hours} год ${minutes} хв` : `${hours} год`
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes} хв ${seconds} с` : `${minutes} хв`
  }
  return `${seconds} с`
}
