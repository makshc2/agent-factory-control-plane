import { describe, it, expect } from 'vitest'
import {
  parseArchiveFolderName,
  spanFromCommits,
  parseMetricsFile,
  parseReviewLoops,
  hasAcceptanceCriteria,
  countDecisionLines,
  parseHandoffAgents,
  buildChangeMetrics,
  metricsToCsv,
} from './changeMetrics.js'

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
})
