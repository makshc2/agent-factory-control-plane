import { parseHandoff, parseReviewVerdict, parseTasksProgress } from '@/utils/openspecParsers'

const CSV_HEADER =
  'project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents'

const SPEND_KEYS = ['inputTokens', 'outputTokens', 'totalTokens', 'costUsd']

function emptySpan() {
  return {
    startedAt: null,
    endedAt: null,
    durationMs: null,
    commitCount: 0,
    source: 'git-commits',
  }
}

function emptySpend() {
  return {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    costUsd: null,
    source: 'unknown',
  }
}

function durationMsFrom(startedAt, endedAt) {
  if (startedAt == null || endedAt == null) {
    return null
  }
  const startedMs = Date.parse(startedAt)
  const endedMs = Date.parse(endedAt)
  if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs)) {
    return null
  }
  return endedMs - startedMs
}

function uniqueCommits(commits) {
  const seen = new Set()
  const result = []
  for (const commit of commits ?? []) {
    const sha = commit?.sha
    if (sha == null || sha === '') {
      result.push(commit)
      continue
    }
    if (seen.has(sha)) {
      continue
    }
    seen.add(sha)
    result.push(commit)
  }
  return result
}

function minString(values) {
  let result = null
  for (const value of values) {
    if (result == null || value < result) {
      result = value
    }
  }
  return result
}

function maxString(values) {
  let result = null
  for (const value of values) {
    if (result == null || value > result) {
      result = value
    }
  }
  return result
}

function dateStringsFromCommits(commits) {
  const dates = []
  for (const commit of commits) {
    const date = commit?.date
    if (typeof date === 'string' && date !== '') {
      dates.push(date)
    }
  }
  return dates
}

function sectionAfterHeading(text, headingRe) {
  const heading = headingRe.exec(text)
  if (!heading) {
    return null
  }
  const rest = text.slice(heading.index + heading[0].length)
  const until = rest.match(/^##\s/m)
  return until ? rest.slice(0, until.index) : rest
}

function firstNonEmptyLine(text) {
  if (!text) {
    return null
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed) {
      return trimmed
    }
  }
  return null
}

function stripBackticks(value) {
  return value.replace(/`/g, '')
}

function cutClosedRoleName(value) {
  const index = value.search(/\s+[—–]\s+|\s+-\s+| \(/)
  if (index === -1) {
    return value.trim()
  }
  return value.slice(0, index).trim()
}

function cutSubagentName(value) {
  const index = value.search(/\s+[—–]\s+|\s+-\s+/)
  if (index === -1) {
    return value.trim()
  }
  return value.slice(0, index).trim()
}

function parseClosedRole(text) {
  const body = sectionAfterHeading(text, /^##\s*Closed role\b/im)
  const line = firstNonEmptyLine(body)
  if (!line) {
    return null
  }
  const name = cutClosedRoleName(stripBackticks(line).trim())
  return name || null
}

function parseSubagents(text) {
  const body = sectionAfterHeading(text, /^##\s*Subagents to spawn\b/im)
  if (!body) {
    return []
  }
  const names = []
  for (const match of body.matchAll(/^\s*[-*]\s+(.+)$/gm)) {
    const name = cutSubagentName(stripBackticks(match[1]).trim())
    if (name) {
      names.push(name)
    }
  }
  return names
}

function csvCell(value) {
  if (value == null) {
    return ''
  }
  const str = typeof value === 'string' ? value : String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

function csvHours(durationMs) {
  if (durationMs == null) {
    return ''
  }
  return Math.round((durationMs / 3600000) * 10) / 10
}

function csvBool(value) {
  return value ? 'true' : 'false'
}

export function parseArchiveFolderName(folder) {
  const match = String(folder ?? '').match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (!match) {
    return { archivedAt: null, changeName: folder }
  }
  return { archivedAt: match[1], changeName: match[2] }
}

export function spanFromCommits(commits) {
  if (!Array.isArray(commits) || commits.length === 0) {
    return emptySpan()
  }
  const dates = dateStringsFromCommits(commits)
  const startedAt = minString(dates)
  const endedAt = maxString(dates)
  return {
    startedAt,
    endedAt,
    durationMs: durationMsFrom(startedAt, endedAt),
    commitCount: commits.length,
    source: 'git-commits',
  }
}

export function mergeSpans(spans) {
  if (!Array.isArray(spans)) {
    return emptySpan()
  }
  let commitCount = 0
  const startedDates = []
  const endedDates = []
  let seen = false
  for (const span of spans) {
    if (span == null) {
      continue
    }
    seen = true
    commitCount += span.commitCount ?? 0
    if (typeof span.startedAt === 'string' && span.startedAt !== '') {
      startedDates.push(span.startedAt)
    }
    if (typeof span.endedAt === 'string' && span.endedAt !== '') {
      endedDates.push(span.endedAt)
    }
  }
  if (!seen) {
    return emptySpan()
  }
  const startedAt = minString(startedDates)
  const endedAt = maxString(endedDates)
  return {
    startedAt,
    endedAt,
    durationMs: durationMsFrom(startedAt, endedAt),
    commitCount,
    source: 'git-commits',
  }
}

export function parseMetricsFile(text) {
  if (text == null || text === '' || typeof text !== 'string') {
    return emptySpend()
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return emptySpend()
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return emptySpend()
  }
  const spend = parsed.spend
  if (spend == null || typeof spend !== 'object' || Array.isArray(spend)) {
    return emptySpend()
  }
  const result = emptySpend()
  let hasNumber = false
  for (const key of SPEND_KEYS) {
    const value = spend[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value
      hasNumber = true
    }
  }
  if (hasNumber) {
    result.source = 'metrics-file'
  }
  return result
}

export function parseReviewLoops(text) {
  if (text == null || text === '') {
    return 0
  }
  return (String(text).match(/request[ _-]?changes/gi) || []).length
}

export function hasAcceptanceCriteria(text) {
  if (!text) {
    return false
  }
  return /^##\s*Acceptance criteria\b/im.test(text)
}

export function countDecisionLines(text) {
  if (text == null || text === '') {
    return 0
  }
  return (String(text).match(/^- \d{4}-\d{2}-\d{2}\b/gm) || []).length
}

export function parseHandoffAgents(text) {
  if (!text) {
    return { runtime: null, roles: [], subagents: [] }
  }
  const roles = []
  const nextRole = parseHandoff(text).nextRole
  if (nextRole) {
    roles.push(nextRole)
  }
  const closedRole = parseClosedRole(text)
  if (closedRole && !roles.includes(closedRole)) {
    roles.push(closedRole)
  }
  const runtimeMatch = text.match(/runtime\**:?\s*(local|cloud)\b/i)
  return {
    runtime: runtimeMatch ? runtimeMatch[1].toLowerCase() : null,
    roles,
    subagents: parseSubagents(text),
  }
}

export function buildChangeMetrics({
  project,
  changeName,
  archived,
  archiveFolder,
  archivedAt,
  artifacts,
  commits,
}) {
  const projectMap = project ?? {}
  const artifactMap = artifacts ?? {}
  const commitMap = commits ?? {}
  const tasks = parseTasksProgress(artifactMap.tasks)
  const spec = spanFromCommits(commitMap.spec)
  const review = spanFromCommits(commitMap.review)
  const apply = spanFromCommits(commitMap.apply)
  const change = spanFromCommits(
    uniqueCommits([
      ...(commitMap.spec ?? []),
      ...(commitMap.review ?? []),
      ...(commitMap.apply ?? []),
    ]),
  )
  return {
    projectId: projectMap.id,
    repo: projectMap.repo,
    provider: projectMap.provider,
    changeName,
    archived,
    archiveFolder,
    archivedAt,
    verdict: parseReviewVerdict(artifactMap.review),
    tasksDone: tasks.done,
    tasksTotal: tasks.total,
    reviewLoops: parseReviewLoops(artifactMap.review),
    hasAcceptanceCriteria: hasAcceptanceCriteria(artifactMap.proposal),
    decisionsCount: countDecisionLines(artifactMap.decisions),
    agents: parseHandoffAgents(artifactMap.handoff),
    spend: parseMetricsFile(artifactMap.metrics),
    spans: {
      spec,
      review,
      apply,
      change,
    },
  }
}

export function metricsToCsv(rows) {
  const lines = [CSV_HEADER]
  for (const row of rows ?? []) {
    const spans = row?.spans ?? {}
    const spend = row?.spend ?? {}
    const agents = row?.agents ?? {}
    lines.push(
      [
        csvCell(row?.repo),
        csvCell(row?.changeName),
        csvBool(row?.archived),
        csvCell(row?.archivedAt),
        csvCell(row?.verdict),
        csvCell(row?.tasksDone),
        csvCell(row?.tasksTotal),
        csvCell(row?.reviewLoops),
        csvBool(row?.hasAcceptanceCriteria),
        csvCell(row?.decisionsCount),
        csvCell(csvHours(spans.spec?.durationMs)),
        csvCell(csvHours(spans.review?.durationMs)),
        csvCell(csvHours(spans.apply?.durationMs)),
        csvCell(csvHours(spans.change?.durationMs)),
        csvCell(spans.spec?.startedAt),
        csvCell(spans.spec?.endedAt),
        csvCell(spans.review?.startedAt),
        csvCell(spans.review?.endedAt),
        csvCell(spans.apply?.startedAt),
        csvCell(spans.apply?.endedAt),
        csvCell(spans.change?.startedAt),
        csvCell(spans.change?.endedAt),
        csvCell(spend.inputTokens),
        csvCell(spend.outputTokens),
        csvCell(spend.totalTokens),
        csvCell(spend.costUsd),
        csvCell(spend.source),
        csvCell(agents.runtime),
        csvCell((agents.roles ?? []).join('|')),
        csvCell((agents.subagents ?? []).join('|')),
      ].join(','),
    )
  }
  return lines.join('\n')
}
