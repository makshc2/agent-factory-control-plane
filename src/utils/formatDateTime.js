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

function toValidDate(value) {
  if (value == null || value === '') {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
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
