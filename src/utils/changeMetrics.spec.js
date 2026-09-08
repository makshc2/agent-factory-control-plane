import { describe, it, expect } from 'vitest'
import {
  parseArchiveFolderName,
  spanFromCommits,
  spanFromJournal,
  parseKitMetrics,
  parseMetricsFile,
  preferDuration,
  parseReviewLoops,
  resolveReviewLoops,
  resolveDisplayedCost,
  recordedEstimatedCostUsd,
  analysisChangeRef,
  hasAcceptanceCriteria,
  countDecisionLines,
  parseHandoffAgents,
  buildChangeMetrics,
  metricsToCsv,
  collectJournalModels,
  collectJournalModelRows,
  shortAgentRole,
  uniqueShortAgentRoles,
  formatAgentsCell,
  formatAgentsTitle,
} from './changeMetrics.js'

const KIT_JOURNAL = {
  version: 1,
  spend: {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    costUsd: null,
    costUsdEstimated: null,
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
    costUsdEstimated: null,
    costUsdTotal: null,
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
      costUsdEstimated: null,
      costUsdTotal: null,
      source: 'metrics-file',
    })
  })

  it('treats finite costUsdEstimated as metrics-file overlay', () => {
    expect(parseMetricsFile('{"spend":{"costUsdEstimated":0.42}}')).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costUsd: null,
      costUsdEstimated: 0.42,
      costUsdTotal: null,
      source: 'metrics-file',
    })
  })

  it('reads costUsdTotal as a metrics-file overlay field', () => {
    expect(parseMetricsFile('{"spend":{"costUsdTotal":21.0779}}')).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costUsd: null,
      costUsdEstimated: null,
      costUsdTotal: 21.0779,
      source: 'metrics-file',
    })
  })

  it('treats string cost as unknown spend', () => {
    const result = parseMetricsFile('{"spend":{"costUsd":"1"}}')

    expect(result.costUsd).toBeNull()
    expect(result.source).toBe('unknown')
  })

  it('treats string costUsdEstimated as unknown spend', () => {
    const result = parseMetricsFile('{"spend":{"costUsdEstimated":"0.42"}}')

    expect(result.costUsdEstimated).toBeNull()
    expect(result.source).toBe('unknown')
  })

  it('treats string costUsdTotal as unknown spend', () => {
    const result = parseMetricsFile('{"spend":{"costUsdTotal":"21.07"}}')

    expect(result.costUsdTotal).toBeNull()
    expect(result.source).toBe('unknown')
  })
})

describe('parseKitMetrics', () => {
  it('reads phase bounds, lead time and costUsdTotal from a v2 journal', () => {
    const result = parseKitMetrics(
      JSON.stringify({
        version: 2,
        spend: { costUsd: 14.48, costUsdEstimated: null, costUsdTotal: 14.48 },
        spendByPlatform: {
          amp: { costUsd: 14.48, costUsdTotal: 14.48, source: 'amp-usage' },
        },
        spendByModel: [{ model: 'gpt-6-astra', platform: 'amp', costUsdTotal: 6.47 }],
        phases: {
          spec: {
            sessions: 2,
            durationMs: 539356,
            startedAt: '2026-09-07T15:17:07.490Z',
            endedAt: '2026-09-07T15:31:40.934Z',
            leadTimeMs: 873444,
            costUsd: 6.47,
            costUsdTotal: 6.47,
          },
        },
        sessions: [{ role: 'Architect', phase: 'spec', costUsd: 6.47, costUsdTotal: 6.47 }],
      }),
    )

    expect(result.spend.costUsdTotal).toBe(14.48)
    expect(result.spendByPlatform.amp.costUsdTotal).toBe(14.48)
    expect(result.spendByPlatform.cursor.costUsdTotal).toBeNull()
    expect(result.spendByModel[0].costUsdTotal).toBe(6.47)
    expect(result.phases.spec.startedAt).toBe('2026-09-07T15:17:07.490Z')
    expect(result.phases.spec.endedAt).toBe('2026-09-07T15:31:40.934Z')
    expect(result.phases.spec.leadTimeMs).toBe(873444)
    expect(result.phases.spec.costUsdTotal).toBe(6.47)
    expect(result.sessions[0].costUsdTotal).toBe(6.47)
  })

  it('keeps phase bounds null when the journal has none', () => {
    const result = parseKitMetrics(JSON.stringify(KIT_JOURNAL))

    expect(result.phases.spec.startedAt).toBeNull()
    expect(result.phases.spec.endedAt).toBeNull()
    expect(result.phases.spec.leadTimeMs).toBeNull()
    expect(result.spend.costUsdTotal).toBeNull()
    expect(result.spendByPlatform.amp.costUsdTotal).toBeNull()
    expect(result.sessions[0].costUsdTotal).toBeNull()
  })

  it('keeps costUsdTotal null on overlay and platforms for an empty journal', () => {
    const overlay = parseMetricsFile(null)
    const journal = parseKitMetrics(null)

    expect(overlay.costUsdTotal).toBeNull()
    expect(journal.spend.costUsdTotal).toBeNull()
    expect(journal.spendByPlatform.cursor.costUsdTotal).toBeNull()
    expect(journal.spendByPlatform.claude.costUsdTotal).toBeNull()
    expect(journal.spendByPlatform.amp.costUsdTotal).toBeNull()
  })

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

  it('parses an already-decoded JSON object from axios', () => {
    const result = parseKitMetrics({
      change: 'unavailable-cameras-role-access',
      totals: { sessions: 5, durationMs: 1427241, leadTimeMs: 1578794, cloudSessions: 0 },
      spend: { inputTokens: 3818279, outputTokens: 38764, totalTokens: 3857043, costUsd: null },
      spendByPlatform: {
        cursor: { inputTokens: 2807832, totalTokens: 2839940, source: 'cursor-hook' },
        amp: { inputTokens: 1010447, totalTokens: 1017103, source: 'amp-thread' },
      },
      sessions: [{ role: 'Explorer', platform: 'cursor', model: 'cursor-grok-4.6' }],
    })

    expect(result.source).toBe('metrics-file')
    expect(result.change).toBe('unavailable-cameras-role-access')
    expect(result.totals.sessions).toBe(5)
    expect(result.spend.totalTokens).toBe(3857043)
    expect(result.spendByPlatform.cursor.source).toBe('cursor-hook')
    expect(result.sessions).toHaveLength(1)
  })

  it('canonicalizes Amp microsecond+.000Z timestamps', () => {
    const result = parseKitMetrics({
      updatedAt: '2026-08-31T07:08:17.563449.000Z',
      archivedAt: '2026-08-31T07:08:17.563464.000Z',
      sessions: [
        {
          startedAt: '2026-08-31T07:08:17.563468.000Z',
          endedAt: '2026-08-31T07:08:17.563471.000Z',
          role: 'Archiver',
        },
      ],
    })

    expect(result.source).toBe('metrics-file')
    expect(result.updatedAt).toBe('2026-08-31T07:08:17.563Z')
    expect(result.archivedAt).toBe('2026-08-31T07:08:17.563Z')
    expect(result.sessions[0].startedAt).toBe('2026-08-31T07:08:17.563Z')
    expect(result.sessions[0].endedAt).toBe('2026-08-31T07:08:17.563Z')
  })

  it('canonicalizes leftover Europe/Kyiv offset timestamps to UTC', () => {
    const result = parseKitMetrics({
      createdAt: '2026-08-31T10:08:17.563+03:00',
      updatedAt: '2026-08-31T10:08:17.563+03:00',
    })

    expect(result.createdAt).toBe('2026-08-31T07:08:17.563Z')
    expect(result.updatedAt).toBe('2026-08-31T07:08:17.563Z')
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

  it('keeps cursor costUsdEstimated on the platform bucket', () => {
    const journal = parseKitMetrics(
      '{"spendByPlatform":{"cursor":{"costUsdEstimated":0.18,"costUsd":null}}}',
    )

    expect(journal.spendByPlatform.cursor.costUsdEstimated).toBe(0.18)
  })
})

describe('spanFromJournal', () => {
  it('returns min and max bounds from phases and sessions', () => {
    const result = spanFromJournal({
      totals: { leadTimeMs: 4691796 },
      phases: {
        spec: {
          startedAt: '2026-09-07T15:17:07.490Z',
          endedAt: '2026-09-07T15:31:40.934Z',
        },
      },
      sessions: [
        { startedAt: '2026-09-07T15:03:59.069Z', endedAt: '2026-09-07T15:15:49.265Z' },
        { startedAt: '2026-09-07T16:20:46.589Z', endedAt: '2026-09-07T16:22:10.865Z' },
      ],
    })

    expect(result).toEqual({
      startedAt: '2026-09-07T15:03:59.069Z',
      endedAt: '2026-09-07T16:22:10.865Z',
      durationMs: 4691796,
      commitCount: null,
      source: 'kit-sessions',
    })
  })

  it('returns null when phases and sessions have no dates', () => {
    expect(spanFromJournal({ phases: { spec: { durationMs: 1 } }, sessions: [] })).toBeNull()
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

  it('reports kit-span when the span came from journal phases', () => {
    expect(preferDuration(null, { durationMs: 873444, source: 'kit-sessions' })).toEqual({
      durationMs: 873444,
      source: 'kit-span',
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

describe('resolveReviewLoops', () => {
  it('counts Spec Reviewer sessions from the kit journal', () => {
    expect(resolveReviewLoops(KIT_JOURNAL, 'Verdict: APPROVE')).toBe(2)
  })

  it('falls back to review.md when the journal has no reviewer sessions', () => {
    expect(resolveReviewLoops({ sessions: [], phases: {} }, 'REQUEST CHANGES')).toBe(1)
  })
})

describe('resolveDisplayedCost', () => {
  it('keeps a recorded cost from spend', () => {
    expect(resolveDisplayedCost({ spend: { costUsd: 1.5, totalTokens: 30 } })).toEqual({
      costUsd: 1.5,
      estimated: false,
      billedCostUsd: 1.5,
      estimatedCostUsd: null,
      source: 'billed',
    })
  })

  it('returns null when tokens exist without billed or kit estimate', () => {
    expect(
      resolveDisplayedCost({
        spend: { inputTokens: 3818279, outputTokens: 38764, totalTokens: 3857043, costUsd: null },
      }),
    ).toEqual({
      costUsd: null,
      estimated: false,
      billedCostUsd: null,
      estimatedCostUsd: null,
      source: 'none',
    })
  })

  it('returns null without tokens or recorded cost', () => {
    expect(resolveDisplayedCost({ spend: { costUsd: null, totalTokens: null } })).toEqual({
      costUsd: null,
      estimated: false,
      billedCostUsd: null,
      estimatedCostUsd: null,
      source: 'none',
    })
  })

  it('prefers billed and keeps kit estimate in estimatedCostUsd', () => {
    expect(
      resolveDisplayedCost({
        spend: { costUsd: 1.5, costUsdEstimated: 0.42 },
      }),
    ).toEqual({
      costUsd: 1.5,
      estimated: false,
      billedCostUsd: 1.5,
      estimatedCostUsd: 0.42,
      source: 'billed',
    })
  })

  it('shows kit estimate when billed is missing', () => {
    expect(resolveDisplayedCost({ spend: { costUsdEstimated: 0 } })).toEqual({
      costUsd: 0,
      estimated: true,
      billedCostUsd: null,
      estimatedCostUsd: 0,
      source: 'estimated',
    })
  })

  it('prefers costUsdTotal over billed and estimated parts', () => {
    expect(
      resolveDisplayedCost({
        spend: { costUsd: 14.48, costUsdEstimated: 6.5979, costUsdTotal: 21.0779 },
      }),
    ).toEqual({
      costUsd: 21.0779,
      estimated: false,
      billedCostUsd: 14.48,
      estimatedCostUsd: 6.5979,
      source: 'total',
    })
  })

  it('marks costUsdTotal as estimated when nothing was billed', () => {
    expect(
      resolveDisplayedCost({
        spend: { costUsd: null, costUsdEstimated: 4.6377, costUsdTotal: 4.6377 },
      }),
    ).toEqual({
      costUsd: 4.6377,
      estimated: true,
      billedCostUsd: null,
      estimatedCostUsd: 4.6377,
      source: 'total',
    })
  })

  it('walks journal costUsdTotal when the spend overlay has none', () => {
    const resolved = resolveDisplayedCost({
      spend: { costUsd: null, costUsdEstimated: null, costUsdTotal: null },
      journal: {
        spend: { costUsd: null, costUsdEstimated: null, costUsdTotal: null },
        spendByPlatform: {
          cursor: { costUsd: null, costUsdEstimated: 1.43, costUsdTotal: 1.43 },
          claude: { costUsd: null, costUsdEstimated: 5.16, costUsdTotal: 5.16 },
          amp: { costUsd: 14.48, costUsdEstimated: null, costUsdTotal: 14.48 },
        },
      },
    })

    expect(resolved.costUsd).toBeCloseTo(21.07, 2)
    expect(resolved.source).toBe('total')
  })
})

describe('recordedEstimatedCostUsd', () => {
  it('walks platform estimates when spend overlay is empty', () => {
    expect(
      recordedEstimatedCostUsd({
        spend: { costUsd: null, costUsdEstimated: null },
        journal: {
          spend: { costUsdEstimated: null },
          spendByPlatform: {
            cursor: { costUsdEstimated: 0.18 },
            claude: { costUsdEstimated: null },
            amp: { costUsdEstimated: null },
          },
          spendByModel: [],
          sessions: [],
          phases: {},
        },
      }),
    ).toBe(0.18)
  })
})

describe('analysisChangeRef', () => {
  it('prefixes active and archived rows', () => {
    expect(analysisChangeRef({ archived: false, changeName: 'add-login' })).toBe('c:add-login')
    expect(
      analysisChangeRef({
        archived: true,
        archiveFolder: '2026-08-28-add-factory-board',
        changeName: 'add-factory-board',
      }),
    ).toBe('a:2026-08-28-add-factory-board')
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

  it('takes phase bounds from journal phases instead of git commits', () => {
    const result = buildChangeMetrics({
      project,
      changeName: 'fix-location-search-filter-cascade',
      archived: true,
      artifacts: {
        metrics: JSON.stringify({
          version: 2,
          totals: { sessions: 8, durationMs: 2849244, leadTimeMs: 4691796, cloudSessions: 0 },
          phases: {
            explore: {
              durationMs: 710196,
              startedAt: '2026-09-07T15:03:59.069Z',
              endedAt: '2026-09-07T15:15:49.265Z',
              leadTimeMs: 710196,
            },
            spec: {
              durationMs: 539356,
              startedAt: '2026-09-07T15:17:07.490Z',
              endedAt: '2026-09-07T15:31:40.934Z',
              leadTimeMs: 873444,
            },
            review: {
              durationMs: 505022,
              startedAt: '2026-09-07T15:26:14.472Z',
              endedAt: '2026-09-07T15:39:40.339Z',
              leadTimeMs: 805867,
            },
            apply: {
              durationMs: 1010394,
              startedAt: '2026-09-07T15:41:28.560Z',
              endedAt: '2026-09-07T16:01:28.873Z',
              leadTimeMs: 1200313,
            },
            archive: {
              durationMs: 84276,
              startedAt: '2026-09-07T16:20:46.589Z',
              endedAt: '2026-09-07T16:22:10.865Z',
              leadTimeMs: 84276,
            },
          },
          sessions: [],
        }),
      },
      commits: {
        spec: [
          { sha: 'a', date: '2026-09-01T10:00:00Z' },
          { sha: 'b', date: '2026-09-01T12:00:00Z' },
        ],
        review: [{ sha: 'c', date: '2026-09-02T10:00:00Z' }],
      },
    })

    expect(result.spans.spec).toEqual({
      startedAt: '2026-09-07T15:17:07.490Z',
      endedAt: '2026-09-07T15:31:40.934Z',
      durationMs: 873444,
      commitCount: null,
      source: 'kit-sessions',
    })
    expect(result.spans.review.source).toBe('kit-sessions')
    expect(result.spans.review.durationMs).toBe(805867)
    expect(result.spans.apply.startedAt).toBe('2026-09-07T15:41:28.560Z')
    expect(result.spans.change).toEqual({
      startedAt: '2026-09-07T15:03:59.069Z',
      endedAt: '2026-09-07T16:22:10.865Z',
      durationMs: 4691796,
      commitCount: null,
      source: 'kit-sessions',
    })
  })

  it('falls back to git commits when journal phases carry no bounds', () => {
    const result = buildChangeMetrics({
      project,
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

    expect(result.spans.spec.source).toBe('git-commits')
    expect(result.spans.spec.durationMs).toBe(7200000)
    expect(result.spans.spec.commitCount).toBe(2)
    expect(result.spans.change.source).toBe('git-commits')
  })

  it('falls back to git commits when there is no journal', () => {
    const result = buildChangeMetrics({
      project,
      changeName: 'add-x',
      archived: false,
      artifacts: {},
      commits: {
        spec: [
          { sha: 'a', date: '2026-08-01T10:00:00Z' },
          { sha: 'b', date: '2026-08-01T12:00:00Z' },
        ],
      },
    })

    expect(result.journal.source).toBe('unknown')
    expect(result.spans.spec.source).toBe('git-commits')
    expect(result.spans.spec.commitCount).toBe(2)
    expect(result.spans.spec.durationMs).toBe(7200000)
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
    expect(result.reviewLoops).toBe(2)
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

  it('reads models from spendByModel when session.model is null', () => {
    const result = buildChangeMetrics({
      project,
      changeName: 'amp-archive',
      archived: true,
      artifacts: {
        metrics: JSON.stringify({
          version: 1,
          spend: {
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            costUsd: null,
          },
          spendByPlatform: {
            amp: { source: 'amp-thread' },
          },
          spendByModel: [
            {
              model: 'amp-sonnet',
              platform: 'amp',
              inputTokens: 40,
              outputTokens: 6,
              totalTokens: 46,
              costUsd: null,
              ampCredits: null,
            },
          ],
          totals: { sessions: 1, durationMs: null, leadTimeMs: null, cloudSessions: 0 },
          phases: {
            archive: { agents: ['Archiver'], models: [] },
          },
          sessions: [
            {
              role: 'Archiver',
              phase: 'archive',
              model: null,
              platform: 'amp',
              runtime: 'local',
              sources: [{ model: 'amp-sonnet', platform: 'amp', totalTokens: 46 }],
            },
          ],
        }),
        handoff: '## Closed role\nArchiver\n',
      },
      commits: {},
    })

    expect(result.journal.source).toBe('metrics-file')
    expect(result.spend.source).toBe('unknown')
    expect(result.agents.models).toEqual(['amp-sonnet'])
    expect(result.agents.platforms).toEqual(['amp'])
    expect(result.agents.roles).toEqual(['Archiver'])
    expect(result.journal.sessions).toHaveLength(1)
    expect(result.agents.models).not.toContain('Archiver')
  })
})

describe('kit 0.8.0 journal fields', () => {
  const kit080 = {
    version: 1,
    change: 'amp-web-thread-lock',
    spend: {
      inputTokens: 190000,
      outputTokens: 5000,
      totalTokens: 195000,
      costUsd: null,
    },
    spendByPlatform: {
      amp: {
        inputTokens: 190000,
        outputTokens: 5000,
        totalTokens: 195000,
        costUsd: null,
        ampCredits: 12,
        source: 'amp-cli',
      },
    },
    spendByModel: [
      {
        model: 'glm-5.2',
        platform: 'amp',
        inputTokens: 180000,
        outputTokens: 4000,
        totalTokens: 184000,
        costUsd: null,
        ampCredits: 10,
      },
      {
        model: 'cursor-grok-4.5-low',
        platform: 'amp',
        inputTokens: 10000,
        outputTokens: 1000,
        totalTokens: 11000,
        costUsd: null,
        ampCredits: 2,
      },
    ],
    totals: {
      sessions: 1,
      durationMs: 1200000,
      leadTimeMs: 1200000,
      cloudSessions: 0,
    },
    phases: {
      apply: {
        sessions: 1,
        durationMs: 1200000,
        agents: ['Implementer'],
        models: ['glm-5.2', 'cursor-grok-4.5-low'],
      },
    },
    sessions: [
      {
        role: 'Implementer',
        phase: 'apply',
        runtime: 'local',
        model: 'glm-5.2',
        models: ['glm-5.2', 'cursor-grok-4.5-low'],
        platform: 'amp',
        threadId: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8',
        spendSource: 'adapter',
        ampCredits: 12,
        totalTokens: 195000,
        sources: [
          {
            id: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8:1',
            platform: 'amp',
            model: 'glm-5.2',
            via: 'amp-cli',
            totalTokens: 184000,
            ampCredits: 10,
            at: '2026-08-31T05:10:00.000Z',
          },
        ],
      },
    ],
    pending: {
      startedAt: '2026-08-31T05:21:00.000Z',
      role: 'Spec Reviewer',
      platform: 'amp',
      threadId: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8',
      clientSource: 'amp-threads-list',
    },
  }

  it('keeps locked client, spendSource, thread, via, and extra models', () => {
    const journal = parseKitMetrics(JSON.stringify(kit080))
    const session = journal.sessions[0]

    expect(journal.pending).toEqual({
      startedAt: '2026-08-31T05:21:00.000Z',
      role: 'Spec Reviewer',
      platform: 'amp',
      threadId: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8',
      clientSource: 'amp-threads-list',
    })
    expect(session.spendSource).toBe('adapter')
    expect(session.threadId).toBe('T-01a0541e-a7f5-779f-9305-4b9a467c90f8')
    expect(session.ampCredits).toBe(12)
    expect(session.models).toEqual(['glm-5.2', 'cursor-grok-4.5-low'])
    expect(session.sources[0].via).toBe('amp-cli')
    expect(journal.spend.costUsd).toBeNull()
    expect(journal.spendByPlatform.amp.ampCredits).toBe(12)
  })

  it('treats a legacy session without spendSource as unreported', () => {
    const journal = parseKitMetrics('{"sessions":[{"role":"Architect"}]}')
    expect(journal.sessions[0].spendSource).toBe('unreported')
    expect(journal.sessions[0].models).toEqual([])
    expect(journal.pending).toBeNull()
  })

  it('exposes 0.8.0 fields on the analysis row and csv', () => {
    const row = buildChangeMetrics({
      project: { id: 'p1', repo: 'org/kit', provider: 'github' },
      changeName: 'amp-web-thread-lock',
      archived: false,
      artifacts: { metrics: JSON.stringify(kit080) },
      commits: {},
    })
    const csv = metricsToCsv([row])
    const [header, data] = csv.split('\n')
    const cells = Object.fromEntries(
      header.split(',').map((key, index) => [key, data.split(',')[index]]),
    )

    expect(row.agents.platforms).toEqual(['amp'])
    expect(row.agents.models).toEqual(['glm-5.2', 'cursor-grok-4.5-low'])
    expect(row.journal.pending.clientSource).toBe('amp-threads-list')
    expect(cells.platforms).toBe('amp')
    expect(cells.pending_platform).toBe('amp')
    expect(cells.pending_thread_id).toBe('T-01a0541e-a7f5-779f-9305-4b9a467c90f8')
    expect(cells.pending_client_source).toBe('amp-threads-list')
    expect(cells.session_spend_sources).toBe('adapter')
    expect(cells.thread_ids).toBe('T-01a0541e-a7f5-779f-9305-4b9a467c90f8')
    expect(cells.amp_credits).toBe('12')
    expect(cells.cost_usd).toBe('')
  })
})

describe('collectJournalModels', () => {
  it('merges spendByModel, session.model, sources, and phase models and skips roles', () => {
    const journal = {
      spendByModel: [{ model: 'amp-sonnet', platform: 'amp' }],
      sessions: [
        { role: 'Archiver', model: null, sources: [{ model: 'amp-sonnet', platform: 'amp' }] },
        { role: 'Implementer', model: 'cursor-grok-4.6', platform: 'cursor' },
      ],
      phases: {
        spec: { models: ['cursor-grok-4.6'] },
        archive: { models: ['Archiver'] },
      },
    }

    const models = collectJournalModels(journal, ['Archiver', 'Implementer'])
    expect(models).toEqual(['amp-sonnet', 'cursor-grok-4.6'])
    expect(models).not.toContain('Archiver')
    expect(models).not.toContain('Implementer')
    const rows = collectJournalModelRows(journal, ['Archiver', 'Implementer'])
    expect(rows.map((row) => `${row.model}::${row.platform || ''}`)).toEqual([
      'amp-sonnet::amp',
      'cursor-grok-4.6::cursor',
    ])
    expect(rows.some((row) => row.model === 'Archiver')).toBe(false)
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
      ',sessions,cloud_sessions,work_hours,lead_hours,pending_role,models,platforms,amp_credits,pending_platform,pending_thread_id,pending_client_source,session_spend_sources,thread_ids,cost_usd_estimated,cost_usd_total'
    expect(header).toContain(kitTail)
    expect(header.endsWith(kitTail)).toBe(true)
    expect(cells[sessionsIndex]).toBe('7')
    expect(cells[specHoursIndex]).toBe('2')
    expect(row.spans.spec.durationMs).toBe(7200000)
    expect(cells[pendingRoleIndex]).toBe('')
  })

  it('appends billed, estimated and total cost columns', () => {
    const csv = metricsToCsv([
      {
        repo: 'org/repo',
        changeName: 'add-x',
        archived: false,
        spend: { costUsd: 1.5, costUsdEstimated: 0.42, costUsdTotal: 1.92 },
      },
    ])
    const [header, data] = csv.split('\n')
    const cells = Object.fromEntries(
      header.split(',').map((key, index) => [key, data.split(',')[index]]),
    )

    expect(header.endsWith(',cost_usd_estimated,cost_usd_total')).toBe(true)
    expect(cells.cost_usd).toBe('1.5')
    expect(cells.cost_usd_estimated).toBe('0.42')
    expect(cells.cost_usd_total).toBe('1.92')
  })

  it('leaves cost_usd_total empty when the journal has no total', () => {
    const csv = metricsToCsv([
      {
        repo: 'org/repo',
        changeName: 'add-x',
        archived: false,
        spend: { costUsd: 1.5, costUsdEstimated: null, costUsdTotal: null },
      },
    ])
    const [header, data] = csv.split('\n')
    const cells = Object.fromEntries(
      header.split(',').map((key, index) => [key, data.split(',')[index]]),
    )

    expect(cells.cost_usd_total).toBe('')
  })
})

describe('shortAgentRole', () => {
  it('keeps short role names', () => {
    expect(shortAgentRole('Spec Reviewer')).toBe('Spec Reviewer')
    expect(shortAgentRole('Implementer')).toBe('Implementer')
    expect(shortAgentRole('Archiver')).toBe('Archiver')
  })

  it('strips Closed-role blurbs and parenthetical subagent names', () => {
    expect(shortAgentRole('Explorer — discovery complete, ready for Architect')).toBe(
      'Explorer',
    )
    expect(
      shortAgentRole(
        'Architect (`spec-architect`) — propose complete, artifacts validated, ready for Spec Reviewer',
      ),
    ).toBe('Architect')
  })

  it('dedupes shortened roles for the analysis cell', () => {
    const roles = [
      'Explorer — discovery complete, ready for Architect',
      'Architect (`spec-architect`) — propose complete, artifacts validated, ready for Spec',
      'Architect',
    ]
    expect(uniqueShortAgentRoles(roles)).toEqual(['Explorer', 'Architect'])
    expect(
      formatAgentsCell({
        runtime: 'local',
        roles,
      }),
    ).toBe('local · Explorer · Architect')
    expect(formatAgentsTitle({ runtime: 'local', roles })).toContain('discovery complete')
  })
})
