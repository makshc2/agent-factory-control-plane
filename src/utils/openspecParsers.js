function firstField(text, regex) {
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(regex)
    if (!match) {
      continue
    }
    const value = match[1].trim()
    if (value) {
      return value
    }
  }
  return null
}

function normalizeBlocked(value) {
  if (!value) {
    return null
  }
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === 'none' || normalized === 'немає' || normalized === '-') {
    return null
  }
  return value.trim()
}

export function parseTasksProgress(text) {
  if (!text) {
    return { done: 0, total: 0 }
  }
  return {
    done: text.match(/^\s*- \[[xX]\]/gm)?.length ?? 0,
    total: text.match(/^\s*- \[[ xX]\]/gm)?.length ?? 0,
  }
}

export function parseHandoff(text) {
  if (!text) {
    return { nextCommand: null, nextRole: null, blocked: null }
  }
  return {
    nextCommand: firstField(text, /next command\**:?\s*(.+)/i),
    nextRole: firstField(text, /next role\**:?\s*(.+)/i),
    blocked: normalizeBlocked(firstField(text, /blocked\**:?\s*(.+)/i)),
  }
}

export function parseReviewVerdict(text) {
  if (text == null) {
    return null
  }
  if (/reject(ed)?/i.test(text)) {
    return 'REJECT'
  }
  if (/request[ _-]?changes/i.test(text)) {
    return 'REQUEST CHANGES'
  }
  if (/approved?/i.test(text)) {
    return 'APPROVE'
  }
  return null
}
