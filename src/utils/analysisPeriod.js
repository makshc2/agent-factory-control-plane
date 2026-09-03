const KYIV_TZ = 'Europe/Kyiv'
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function kyivToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

export function shiftIsoDate(iso, deltaDays) {
  const [year, month, day] = iso.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays))
  const yyyy = String(shifted.getUTCFullYear())
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(shifted.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function defaultAnalysisWindow(now = new Date()) {
  const to = kyivToday(now)
  return { from: shiftIsoDate(to, -6), to }
}

export function periodKey({ mode, from, to }) {
  if (mode === 'all') {
    return 'all'
  }
  return `${from}:${to}`
}

export function isValidAnalysisWindow(from, to) {
  return ISO_DATE_RE.test(from) && ISO_DATE_RE.test(to) && from <= to
}

export function shouldLoadChange({ archived, archivedAt, mode, from, to }) {
  if (mode === 'all' || archived === false || archivedAt == null) {
    return true
  }
  return from <= archivedAt && archivedAt <= to
}
