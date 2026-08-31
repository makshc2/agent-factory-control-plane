import { parseHandoff, parseReviewVerdict, parseTasksProgress } from '@/utils/openspecParsers'

const CSV_HEADER =
  'project,change,archived,archived_at,verdict,tasks_done,tasks_total,review_loops,has_acceptance_criteria,decisions_count,spec_hours,review_hours,apply_hours,change_hours,spec_started,spec_ended,review_started,review_ended,apply_started,apply_ended,change_started,change_ended,input_tokens,output_tokens,total_tokens,cost_usd,spend_source,runtime,roles,subagents,sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits,pending_platform,pending_thread_id,pending_client_source,session_spend_sources,thread_ids'

const SPEND_KEYS = ['inputTokens', 'outputTokens', 'totalTokens', 'costUsd']
const PLATFORM_KEYS = ['cursor', 'claude', 'amp']
const PHASE_KEYS = ['explore', 'design', 'spec', 'review', 'apply', 'archive', 'other']
const TOTALS_KEYS = ['sessions', 'durationMs', 'leadTimeMs', 'cloudSessions']
const PHASE_NUMBER_KEYS = [
  'sessions',
  'durationMs',
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'costUsd',
]
const PLATFORM_NUMBER_KEYS = [
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'costUsd',
  'ampCredits',
]
const SESSION_STRING_KEYS = [
  'startedAt',
  'endedAt',
  'role',
  'phase',
  'runtime',
  'agentId',
  'model',
  'platform',
  'threadId',
  'spendSource',
  'tasks',
]
const SESSION_NUMBER_KEYS = [
  'durationMs',
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'costUsd',
  'ampCredits',
]
const MODEL_SPEND_KEYS = [
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'costUsd',
  'ampCredits',
]
const SOURCE_NUMBER_KEYS = [
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'costUsd',
  'ampCredits',
]

function emptySpan() {
  return {
    startedAt: null,
    endedAt: null,
    durationMs: null,
    commitCount: 0,
    source: 'git-commits',
  }
}

function emptyPlatformSpend() {
  return {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    costUsd: null,
    ampCredits: null,
    source: 'none',
  }
}

function emptyJournal() {
  return {
    source: 'unknown',
    version: null,
    change: null,
    createdAt: null,
    updatedAt: null,
    archivedAt: null,
    spend: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costUsd: null,
    },
    spendByPlatform: {
      cursor: emptyPlatformSpend(),
      claude: emptyPlatformSpend(),
      amp: emptyPlatformSpend(),
    },
    spendByModel: [],
    totals: {
      sessions: null,
      durationMs: null,
      leadTimeMs: null,
      cloudSessions: null,
    },
    phases: {},
    sessions: [],
    pending: null,
  }
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonEmptyString(value) {
  return typeof value === 'string' && value !== '' ? value : null
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

function parseSpendFields(raw) {
  const result = {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    costUsd: null,
  }
  if (!isPlainObject(raw)) {
    return result
  }
  for (const key of SPEND_KEYS) {
    result[key] = finiteNumber(raw[key])
  }
  return result
}

function parsePlatformSpend(raw) {
  const result = emptyPlatformSpend()
  if (!isPlainObject(raw)) {
    return result
  }
  for (const key of PLATFORM_NUMBER_KEYS) {
    result[key] = finiteNumber(raw[key])
  }
  result.source = nonEmptyString(raw.source) ?? 'none'
  return result
}

function parseSpendByPlatform(raw) {
  const result = {
    cursor: emptyPlatformSpend(),
    claude: emptyPlatformSpend(),
    amp: emptyPlatformSpend(),
  }
  if (!isPlainObject(raw)) {
    return result
  }
  for (const key of PLATFORM_KEYS) {
    result[key] = parsePlatformSpend(raw[key])
  }
  return result
}

function parseSpendByModel(raw) {
  if (!Array.isArray(raw)) {
    return []
  }
  const result = []
  for (const item of raw) {
    if (!isPlainObject(item)) {
      continue
    }
    const entry = {
      model: nonEmptyString(item.model),
      platform: nonEmptyString(item.platform),
    }
    for (const key of MODEL_SPEND_KEYS) {
      entry[key] = finiteNumber(item[key])
    }
    result.push(entry)
  }
  return result
}

function parseTotals(raw) {
  const result = {
    sessions: null,
    durationMs: null,
    leadTimeMs: null,
    cloudSessions: null,
  }
  if (!isPlainObject(raw)) {
    return result
  }
  for (const key of TOTALS_KEYS) {
    result[key] = finiteNumber(raw[key])
  }
  return result
}

function parseStringList(raw) {
  if (!Array.isArray(raw)) {
    return []
  }
  const result = []
  for (const item of raw) {
    if (typeof item === 'string' && item !== '') {
      result.push(item)
    }
  }
  return result
}

function parsePhase(raw) {
  if (!isPlainObject(raw)) {
    return null
  }
  const phase = {
    agents: parseStringList(raw.agents),
    models: parseStringList(raw.models),
  }
  for (const key of PHASE_NUMBER_KEYS) {
    phase[key] = finiteNumber(raw[key])
  }
  return phase
}

function parsePhases(raw) {
  const result = {}
  if (!isPlainObject(raw)) {
    return result
  }
  for (const key of PHASE_KEYS) {
    const phase = parsePhase(raw[key])
    if (phase) {
      result[key] = phase
    }
  }
  return result
}

function parseSessionSources(raw) {
  if (!Array.isArray(raw)) {
    return []
  }
  const result = []
  for (const item of raw) {
    if (!isPlainObject(item)) {
      continue
    }
    const source = {
      id: nonEmptyString(item.id),
      platform: nonEmptyString(item.platform),
      model: nonEmptyString(item.model),
      at: nonEmptyString(item.at),
      via: nonEmptyString(item.via),
    }
    for (const key of SOURCE_NUMBER_KEYS) {
      source[key] = finiteNumber(item[key])
    }
    result.push(source)
  }
  return result
}

function parseSession(raw) {
  if (!isPlainObject(raw)) {
    return null
  }
  const session = {
    sources: parseSessionSources(raw.sources),
    models: parseStringList(raw.models),
  }
  for (const key of SESSION_STRING_KEYS) {
    session[key] = nonEmptyString(raw[key])
  }
  for (const key of SESSION_NUMBER_KEYS) {
    session[key] = finiteNumber(raw[key])
  }
  if (!session.spendSource) {
    session.spendSource = 'unreported'
  }
  return session
}

function parseSessions(raw) {
  if (!Array.isArray(raw)) {
    return []
  }
  const result = []
  for (const item of raw) {
    const session = parseSession(item)
    if (session) {
      result.push(session)
    }
  }
  return result
}

function parsePending(raw) {
  if (!isPlainObject(raw)) {
    return null
  }
  return {
    startedAt: nonEmptyString(raw.startedAt),
    role: nonEmptyString(raw.role),
    platform: nonEmptyString(raw.platform),
    threadId: nonEmptyString(raw.threadId),
    clientSource: nonEmptyString(raw.clientSource),
  }
}

function pushUnique(list, value) {
  if (typeof value === 'string' && value !== '' && !list.includes(value)) {
    list.push(value)
  }
}

function phaseHasAgentsOrModels(phases) {
  for (const key of PHASE_KEYS) {
    const phase = phases[key]
    if (!phase) {
      continue
    }
    if ((phase.agents?.length ?? 0) > 0 || (phase.models?.length ?? 0) > 0) {
      return true
    }
  }
  return false
}

function platformHasSignal(platform) {
  if (!platform) {
    return false
  }
  if (platform.source !== 'none') {
    return true
  }
  return PLATFORM_NUMBER_KEYS.some((key) => Number.isFinite(platform[key]))
}

function buildKitTimes(journal) {
  const phases = journal.phases ?? {}
  const phaseDurations = {}
  for (const key of PHASE_KEYS) {
    phaseDurations[key] = phases[key]?.durationMs ?? null
  }
  return {
    source: journal.source === 'metrics-file' ? 'kit-sessions' : 'unknown',
    workMs: journal.totals.durationMs,
    leadMs: journal.totals.leadTimeMs,
    phases: phaseDurations,
  }
}

function spendByModelHasNames(journal) {
  return (journal.spendByModel ?? []).some((item) => Boolean(item?.model))
}

export function collectJournalModels(journal, blockedNames = []) {
  const blocked = new Set(blockedNames)
  const models = []
  for (const item of journal.spendByModel ?? []) {
    if (item.model && !blocked.has(item.model)) {
      pushUnique(models, item.model)
    }
  }
  for (const session of journal.sessions ?? []) {
    if (session.model && !blocked.has(session.model)) {
      pushUnique(models, session.model)
    }
    for (const model of session.models ?? []) {
      if (model && !blocked.has(model)) {
        pushUnique(models, model)
      }
    }
    for (const source of session.sources ?? []) {
      if (source.model && !blocked.has(source.model)) {
        pushUnique(models, source.model)
      }
    }
  }
  for (const key of PHASE_KEYS) {
    for (const model of journal.phases?.[key]?.models ?? []) {
      if (model && !blocked.has(model)) {
        pushUnique(models, model)
      }
    }
  }
  return models
}

export function collectJournalModelRows(journal, blockedNames = []) {
  const blocked = new Set(blockedNames)
  const rows = []
  const seen = new Set()
  const seenModels = new Set()
  const addRow = (item) => {
    const model = item?.model
    if (!model || blocked.has(model)) {
      return
    }
    const platform = item.platform || null
    const key = `${model}::${platform || ''}`
    if (seen.has(key) || (platform == null && seenModels.has(model))) {
      return
    }
    seen.add(key)
    seenModels.add(model)
    rows.push({
      model,
      platform,
      inputTokens: item.inputTokens ?? null,
      outputTokens: item.outputTokens ?? null,
      totalTokens: item.totalTokens ?? null,
      costUsd: item.costUsd ?? null,
      ampCredits: item.ampCredits ?? null,
    })
  }
  for (const item of journal.spendByModel ?? []) {
    addRow(item)
  }
  for (const session of journal.sessions ?? []) {
    addRow(session)
    for (const model of session.models ?? []) {
      addRow({
        model,
        platform: session.platform,
      })
    }
    for (const source of session.sources ?? []) {
      addRow(source)
    }
  }
  for (const key of PHASE_KEYS) {
    for (const model of journal.phases?.[key]?.models ?? []) {
      addRow({ model, platform: null })
    }
  }
  return rows
}

function buildAgents(journal, handoffAgents) {
  const hasJournalAgents =
    journal.source === 'metrics-file' &&
    (journal.sessions.length > 0 ||
      phaseHasAgentsOrModels(journal.phases) ||
      spendByModelHasNames(journal))
  if (!hasJournalAgents) {
    return {
      ...handoffAgents,
      models: [],
      platforms: [],
    }
  }
  const roles = []
  for (const session of journal.sessions) {
    pushUnique(roles, session.role)
  }
  for (const key of PHASE_KEYS) {
    for (const agent of journal.phases[key]?.agents ?? []) {
      pushUnique(roles, agent)
    }
  }
  const blockedModels = new Set([...roles, ...(handoffAgents.roles ?? [])])
  const models = collectJournalModels(journal, blockedModels)
  let runtime = null
  for (const session of journal.sessions) {
    if (session.runtime) {
      runtime = session.runtime
      break
    }
  }
  if (!runtime) {
    runtime = handoffAgents.runtime
  }
  const platforms = []
  pushUnique(platforms, journal.pending?.platform)
  for (const session of journal.sessions) {
    pushUnique(platforms, session.platform)
  }
  for (const source of journal.sessions.flatMap((session) => session.sources ?? [])) {
    pushUnique(platforms, source.platform)
  }
  for (const item of journal.spendByModel ?? []) {
    pushUnique(platforms, item.platform)
  }
  for (const key of PLATFORM_KEYS) {
    if (platformHasSignal(journal.spendByPlatform[key])) {
      pushUnique(platforms, key)
    }
  }
  return {
    runtime,
    roles,
    subagents: handoffAgents.subagents,
    models,
    platforms,
  }
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

export function parseKitMetrics(text) {
  if (typeof text !== 'string' || text === '') {
    return emptyJournal()
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return emptyJournal()
  }
  if (!isPlainObject(parsed)) {
    return emptyJournal()
  }
  return {
    source: 'metrics-file',
    version: finiteNumber(parsed.version),
    change: nonEmptyString(parsed.change),
    createdAt: nonEmptyString(parsed.createdAt),
    updatedAt: nonEmptyString(parsed.updatedAt),
    archivedAt: nonEmptyString(parsed.archivedAt),
    spend: parseSpendFields(parsed.spend),
    spendByPlatform: parseSpendByPlatform(parsed.spendByPlatform),
    spendByModel: parseSpendByModel(parsed.spendByModel),
    totals: parseTotals(parsed.totals),
    phases: parsePhases(parsed.phases),
    sessions: parseSessions(parsed.sessions),
    pending: parsePending(parsed.pending),
  }
}

export function parseMetricsFile(text) {
  const journal = parseKitMetrics(text)
  const result = {
    inputTokens: journal.spend.inputTokens,
    outputTokens: journal.spend.outputTokens,
    totalTokens: journal.spend.totalTokens,
    costUsd: journal.spend.costUsd,
    source: 'unknown',
  }
  if (SPEND_KEYS.some((key) => Number.isFinite(result[key]))) {
    result.source = 'metrics-file'
  }
  return result
}

export function preferDuration(kitMs, span) {
  if (Number.isFinite(kitMs)) {
    return { durationMs: kitMs, source: 'kit-sessions' }
  }
  return { durationMs: span?.durationMs ?? null, source: 'git-commits' }
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
  const journal = parseKitMetrics(artifactMap.metrics)
  const handoffAgents = parseHandoffAgents(artifactMap.handoff)
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
    agents: buildAgents(journal, handoffAgents),
    spend: parseMetricsFile(artifactMap.metrics),
    journal,
    kitTimes: buildKitTimes(journal),
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
    const journal = row?.journal ?? {}
    const kitTimes = row?.kitTimes ?? {}
    const ampCredits = journal.spendByPlatform?.amp?.ampCredits
    const spendSources = []
    const threadIds = []
    pushUnique(threadIds, journal.pending?.threadId)
    for (const session of journal.sessions ?? []) {
      pushUnique(spendSources, session.spendSource)
      pushUnique(threadIds, session.threadId)
    }
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
        csvCell(journal.totals?.sessions),
        csvCell(journal.totals?.cloudSessions),
        csvCell(csvHours(kitTimes.workMs)),
        csvCell(csvHours(kitTimes.leadMs)),
        csvCell(journal.pending?.role),
        csvCell((agents.models ?? []).join('|')),
        csvCell((agents.platforms ?? []).join('|')),
        csvCell(Number.isFinite(ampCredits) ? ampCredits : null),
        csvCell(journal.pending?.platform),
        csvCell(journal.pending?.threadId),
        csvCell(journal.pending?.clientSource),
        csvCell(spendSources.join('|')),
        csvCell(threadIds.join('|')),
      ].join(','),
    )
  }
  return lines.join('\n')
}
