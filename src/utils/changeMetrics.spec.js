import { describe, it, expect } from 'vitest'
import {
  parseArchiveFolderName,
  spanFromCommits,
  parseKitMetrics,
  parseMetricsFile,
  preferDuration,
  parseReviewLoops,
  hasAcceptanceCriteria,
  countDecisionLines,
  parseHandoffAgents,
  buildChangeMetrics,
  metricsToCsv,
} from './changeMetrics.js'

const KIT_JOURNAL = {
  version: 1,
  spend: {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    costUsd: null,
  },
  totals: {
    sessions: 7,
    durationMs: 2449985,
    leadTimeMs: 3151528,
    cloudSessions: 0,
  },
  phases: {
    spec: {
      durationMs: 467553,
      agents: ['Architect', 'Spec Architect'],
      models: ['cursor-grok-4.6'],
    },
    review: {
      durationMs: 763251,
    },
    apply: {
      durationMs: 1219181,
    },
  },
  sessions: [
    { role: 'Architect', model: 'cursor-grok-4.6', runtime: 'local' },
    { role: 'Architect', model: 'cursor-grok-4.6', runtime: 'local' },
    { role: 'Spec Reviewer', model: 'cursor-grok-4.6', runtime: 'local' },
    { role: 'Spec Architect', model: 'cursor-grok-4.6', runtime: 'local' },
    { role: 'Spec Reviewer', model: 'cursor-grok-4.6', runtime: 'local' },
    { role: 'Implementer', model: 'cursor-grok-4.6', runtime: 'local' },
    { role: 'Archiver', model: null, runtime: 'local' },
  ],
  pending: null,
}

describe('parseArchiveFolderName', () => {
  it('parses dated archive folder name', () => {
    expect(parseArchiveFolderName('2026-08-28-add-factory-board')).toEqual({
      archivedAt: '2026-08-28',
      changeName: 'add-factory-board',
    })
  })

  it('returns folder as change name without date', () => {
    expect(parseArchiveFolderName('hotfix')).toEqual({
      archivedAt: null,
      changeName: 'hotfix',
    })
  })
})

describe('spanFromCommits', () => {
  it('returns empty git-commits span for no commits', () => {
    const result = spanFromCommits([])

    expect(result.durationMs).toBeNull()
    expect(result.commitCount).toBe(0)
    expect(result.source).toBe('git-commits')
  })

  it('returns zero duration for a single commit', () => {
    const result = spanFromCommits([{ sha: 'a', date: '2026-08-01T10:00:00Z', message: 'x' }])

    expect(result.durationMs).toBe(0)
  })

  it('returns two-hour duration for 10:00 and 12:00 commits', () => {
    const result = spanFromCommits([
      { sha: 'a', date: '2026-08-01T10:00:00Z', message: 'x' },
      { sha: 'b', date: '2026-08-01T12:00:00Z', message: 'y' },
    ])

    expect(result.durationMs).toBe(7200000)
  })
})

describe('parseMetricsFile', () => {
  const unknownSpend = {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    costUsd: null,
    source: 'unknown',
  }

  it('returns unknown spend for null and invalid json', () => {
    expect(parseMetricsFile(null)).toEqual(unknownSpend)
    expect(parseMetricsFile('{')).toEqual(unknownSpend)
  })

  it('reads numeric spend fields from metrics file', () => {
    expect(parseMetricsFile('{"spend":{"costUsd":1.5,"totalTokens":30}}')).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: 30,
      costUsd: 1.5,
      source: 'metrics-file',
    })
  })

  it('treats string cost as unknown spend', () => {
    const result = parseMetricsFile('{"spend":{"costUsd":"1"}}')

    expect(result.costUsd).toBeNull()
    expect(result.source).toBe('unknown')
  })
})

describe('parseKitMetrics', () => {
  it('parses a kit v1 journal fixture', () => {
    const result = parseKitMetrics(JSON.stringify(KIT_JOURNAL))

    expect(result.source).toBe('metrics-file')
    expect(result.sessions).toHaveLength(7)
    expect(result.totals.sessions).toBe(7)
    expect(result.totals.durationMs).toBe(2449985)
  })

  it('returns unknown journal for null and invalid json', () => {
    expect(() => parseKitMetrics(null)).not.toThrow()
    expect(() => parseKitMetrics('{')).not.toThrow()

    const fromNull = parseKitMetrics(null)
    const fromInvalid = parseKitMetrics('{')

    expect(fromNull.source).toBe('unknown')
    expect(fromNull.sessions).toEqual([])
    expect(fromNull.totals.sessions).toBeNull()
    expect(fromInvalid.source).toBe('unknown')
    expect(fromInvalid.sessions).toEqual([])
    expect(fromInvalid.totals.sessions).toBeNull()
  })

  it('treats a valid object as a metrics file with empty spend maps', () => {
    const result = parseKitMetrics('{"change":"x"}')

    expect(result.source).toBe('metrics-file')
    expect(Object.keys(result.spendByPlatform)).toEqual(['cursor', 'claude', 'amp'])
    expect(result.spendByModel).toEqual([])
  })

  it('keeps ampCredits out of the spend overlay', () => {
    const text =
      '{"spend":{"costUsd":null},"spendByPlatform":{"amp":{"ampCredits":12,"costUsd":null}}}'
    const overlay = parseMetricsFile(text)
    const journal = parseKitMetrics(text)

    expect(overlay.costUsd).toBeNull()
    expect(overlay.source).toBe('unknown')
    expect(journal.spendByPlatform.amp.ampCredits).toBe(12)
  })
})

describe('preferDuration', () => {
  it('prefers finite kit duration over git span', () => {
    expect(preferDuration(467553, { durationMs: 7200000, source: 'git-commits' })).toEqual({
      durationMs: 467553,
      source: 'kit-sessions',
    })
  })

  it('falls back to git span when kit duration is null', () => {
    expect(preferDuration(null, { durationMs: 7200000, source: 'git-commits' })).toEqual({
      durationMs: 7200000,
      source: 'git-commits',
    })
  })
})

describe('parseReviewLoops', () => {
  it('returns 0 for null', () => {
    expect(parseReviewLoops(null)).toBe(0)
  })

  it('counts request-changes variants', () => {
    expect(parseReviewLoops('REQUEST CHANGES\nrequest-changes')).toBe(2)
  })
})

describe('hasAcceptanceCriteria', () => {
  it('detects acceptance criteria heading', () => {
    expect(hasAcceptanceCriteria('# T\n## Acceptance criteria\n- x')).toBe(true)
  })

  it('returns false without acceptance criteria heading', () => {
    expect(hasAcceptanceCriteria('# T\n## Why\n')).toBe(false)
  })
})

describe('countDecisionLines', () => {
  it('counts dated decision bullets', () => {
    expect(countDecisionLines('- 2026-08-28 one\n- nope\n- 2026-08-29 two')).toBe(2)
  })

  it('returns 0 for null', () => {
    expect(countDecisionLines(null)).toBe(0)
  })
})

describe('parseHandoffAgents', () => {
  it('parses runtime, roles, and subagents', () => {
    const text = [
      'Next role: Implementer',
      '## Closed role',
      'Architect — done',
      'runtime: local',
      '## Subagents to spawn',
      '- openspec-guide — a',
      '- code-writer - b',
    ].join('\n')

    const result = parseHandoffAgents(text)

    expect(result.runtime).toBe('local')
    expect(result.roles).toEqual(expect.arrayContaining(['Implementer', 'Architect']))
    expect(result.subagents).toEqual(expect.arrayContaining(['openspec-guide', 'code-writer']))
  })
})

describe('buildChangeMetrics', () => {
  const project = { id: 'p1', repo: 'org/repo', provider: 'github' }

  it('uses unknown spend and empty apply span without artifacts', () => {
    const result = buildChangeMetrics({
      project,
      changeName: 'add-x',
      archived: false,
      artifacts: {},
      commits: {},
    })

    expect(result.spend.source).toBe('unknown')
    expect(result.tasksDone).toBe(0)
    expect(result.spans.apply.durationMs).toBeNull()
  })

  it('builds Усього from spec, review and apply commits, ignoring folder-only change commits', () => {
    const result = buildChangeMetrics({
      project,
      changeName: 'vms-office-camera-settings',
      archived: true,
      archiveFolder: '2026-08-27-vms-office-camera-settings',
      archivedAt: '2026-08-27',
      artifacts: {},
      commits: {
        spec: [
          { sha: 'a', date: '2026-08-27T10:56:57.000Z' },
          { sha: 'b', date: '2026-08-27T10:59:21.000Z' },
        ],
        review: [
          { sha: 'a', date: '2026-08-27T10:56:57.000Z' },
          { sha: 'b', date: '2026-08-27T10:59:21.000Z' },
        ],
        apply: [
          { sha: 'a', date: '2026-08-27T10:56:57.000Z' },
          { sha: 'b', date: '2026-08-27T10:59:21.000Z' },
        ],
        change: [{ sha: 'archive-only', date: '2026-08-27T10:59:21.000Z' }],
      },
    })

    expect(result.spans.change.durationMs).toBe(144000)
    expect(result.spans.change.commitCount).toBe(2)
    expect(result.spans.change.startedAt).toBe('2026-08-27T10:56:57.000Z')
    expect(result.spans.change.endedAt).toBe('2026-08-27T10:59:21.000Z')
  })

  it('reads zero cost from metrics file', () => {
    const result = buildChangeMetrics({
      project,
      changeName: 'add-x',
      archived: false,
      artifacts: { metrics: '{"spend":{"costUsd":0}}' },
      commits: {},
    })

    expect(result.spend.costUsd).toBe(0)
    expect(result.spend.source).toBe('metrics-file')
  })

  it('reads kit journal times and agents from metrics file', () => {
    const result = buildChangeMetrics({
      project,
      changeName: 'add-x',
      archived: false,
      artifacts: { metrics: JSON.stringify(KIT_JOURNAL) },
      commits: {},
    })

    expect(result.journal.source).toBe('metrics-file')
    expect(result.spend.source).toBe('unknown')
    expect(result.kitTimes.source).toBe('kit-sessions')
    expect(result.kitTimes.workMs).toBe(2449985)
    expect(result.kitTimes.phases.spec).toBe(467553)
    expect(result.agents.models).toEqual(['cursor-grok-4.6'])
    expect(result.agents.roles).toEqual(
      expect.arrayContaining([
        'Architect',
        'Spec Architect',
        'Spec Reviewer',
        'Implementer',
        'Archiver',
      ]),
    )
    for (const role of result.agents.roles) {
      expect(result.agents.models).not.toContain(role)
    }
    expect(result.agents.runtime).toBe('local')
  })
})

describe('metricsToCsv', () => {
  it('writes empty spec_hours when duration is null', () => {
    const csv = metricsToCsv([
      {
        repo: 'org/repo',
        changeName: 'add-x',
        archived: false,
        spans: { spec: { durationMs: null } },
      },
    ])
    const [header, data] = csv.split('\n')
    const specHoursIndex = header.split(',').indexOf('spec_hours')
    const specHoursCell = data.split(',')[specHoursIndex]

    expect(header.startsWith('project,change,archived')).toBe(true)
    expect(header).toContain('spec_hours')
    expect(specHoursCell).toBe('')
    expect(specHoursCell).not.toBe('0')
    expect(specHoursCell).not.toBe('0.0')
  })

  it('appends kit journal columns and keeps git spec_hours', () => {
    const row = buildChangeMetrics({
      project: { id: 'p1', repo: 'org/repo', provider: 'github' },
      changeName: 'add-x',
      archived: false,
      artifacts: { metrics: JSON.stringify(KIT_JOURNAL) },
      commits: {
        spec: [
          { sha: 'a', date: '2026-08-01T10:00:00Z' },
          { sha: 'b', date: '2026-08-01T12:00:00Z' },
        ],
      },
    })
    const csv = metricsToCsv([row])
    const [header, data] = csv.split('\n')
    const cells = data.split(',')
    const specHoursIndex = header.split(',').indexOf('spec_hours')
    const sessionsIndex = header.split(',').indexOf('sessions')
    const pendingRoleIndex = header.split(',').indexOf('pending_role')

    const kitTail =
      ',sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits'
    expect(header).toContain(kitTail)
    expect(header.endsWith(kitTail)).toBe(true)
    expect(cells[sessionsIndex]).toBe('7')
    expect(cells[specHoursIndex]).toBe('2')
    expect(row.spans.spec.durationMs).toBe(7200000)
    expect(cells[pendingRoleIndex]).toBe('')
  })
})
