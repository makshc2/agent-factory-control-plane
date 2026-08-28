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

function truncateExcerpt(text) {
  if (text == null) {
    return null
  }
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.slice(0, 500)
}

function sectionAfterHeading(text, headingRe, untilRe) {
  const heading = headingRe.exec(text)
  if (!heading) {
    return null
  }
  const rest = text.slice(heading.index + heading[0].length)
  const until = rest.match(untilRe)
  return until ? rest.slice(0, until.index) : rest
}

function parseDone(text) {
  if (!text) {
    return null
  }
  const inline = firstField(text, /done\**:?\s*(.+)/i)
  if (inline != null) {
    return normalizeBlocked(inline)
  }
  return normalizeBlocked(sectionAfterHeading(text, /^##?\s*Done\b/im, /^#{1,6}\s/m))
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

export function parseTaskList(text) {
  if (!text) {
    return []
  }
  return Array.from(text.matchAll(/^\s*- \[([ xX])\]\s*(.*)$/gm), (match) => ({
    text: match[2].trim(),
    done: match[1] === 'x' || match[1] === 'X',
  }))
}

export function parseProposalExcerpt(text) {
  if (!text) {
    return { title: null, why: null }
  }

  const heading = text.match(/^#\s+(.+)/m)
  let title = heading ? heading[1].trim() || null : null
  if (!title) {
    for (const line of text.split(/\r?\n/)) {
      const value = line.trim()
      if (value) {
        title = value
        break
      }
    }
  }

  const whyBody = sectionAfterHeading(text, /^##\s*Why\b/im, /^##\s/m)
  return {
    title,
    why: whyBody == null ? null : truncateExcerpt(whyBody),
  }
}

export function parseDecisionsExcerpt(text) {
  if (!text) {
    return null
  }
  return truncateExcerpt(text.replace(/^#\s+.+/m, ''))
}

export function parseReviewExcerpt(text) {
  if (!text) {
    return null
  }
  return truncateExcerpt(text)
}

export function parseHandoffDetails(text) {
  return {
    ...parseHandoff(text),
    done: parseDone(text),
  }
}
