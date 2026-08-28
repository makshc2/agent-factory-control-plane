import { describe, it, expect } from 'vitest'
import {
  parseTasksProgress,
  parseHandoff,
  parseReviewVerdict,
  parseTaskList,
  parseProposalExcerpt,
  parseDecisionsExcerpt,
  parseReviewExcerpt,
  parseHandoffDetails,
} from './openspecParsers.js'

describe('parseTasksProgress', () => {
  it('counts 3 checked of 7 checkboxes', () => {
    const text = [
      '- [x] first',
      '- [ ] second',
      '- [x] third',
      '- [ ] fourth',
      '- [ ] fifth',
      '- [x] sixth',
      '- [ ] seventh',
    ].join('\n')

    expect(parseTasksProgress(text)).toEqual({ done: 3, total: 7 })
  })

  it('returns zeros for empty text', () => {
    expect(parseTasksProgress('')).toEqual({ done: 0, total: 0 })
  })

  it('returns zeros for null', () => {
    expect(parseTasksProgress(null)).toEqual({ done: 0, total: 0 })
  })
})

describe('parseHandoff', () => {
  it('parses next command, next role, and blocked', () => {
    const text = [
      'Next command: /opsx:apply add-login',
      'Next role: Implementer',
      'Blocked: чекаємо токен',
    ].join('\n')

    expect(parseHandoff(text)).toEqual({
      nextCommand: '/opsx:apply add-login',
      nextRole: 'Implementer',
      blocked: 'чекаємо токен',
    })
  })

  it('returns null fields when handoff has no matching lines', () => {
    const text = ['Closed role: Explorer', 'Change: add-factory-board', 'Done: research'].join(
      '\n',
    )

    expect(parseHandoff(text)).toEqual({
      nextCommand: null,
      nextRole: null,
      blocked: null,
    })
  })

  it('treats blocked value none as null', () => {
    const text = [
      'Next command: /opsx:apply add-login',
      'Next role: Implementer',
      'Blocked: none',
    ].join('\n')

    expect(parseHandoff(text)).toEqual({
      nextCommand: '/opsx:apply add-login',
      nextRole: 'Implementer',
      blocked: null,
    })
  })
})

describe('parseReviewVerdict', () => {
  it('returns APPROVE for approve text', () => {
    expect(parseReviewVerdict('Verdict: APPROVE')).toBe('APPROVE')
  })

  it('returns REQUEST CHANGES for request changes text', () => {
    expect(parseReviewVerdict('Verdict: REQUEST CHANGES')).toBe('REQUEST CHANGES')
  })

  it('returns REJECT for reject text', () => {
    expect(parseReviewVerdict('Verdict: REJECT')).toBe('REJECT')
  })

  it('prefers REJECT when both APPROVE and REJECT are present', () => {
    expect(parseReviewVerdict('APPROVE this, then REJECT it')).toBe('REJECT')
  })

  it('returns null for null input', () => {
    expect(parseReviewVerdict(null)).toBeNull()
  })
})

describe('parseTaskList', () => {
  it('parses checked and unchecked items', () => {
    const text = ['- [x] first', '- [ ] second'].join('\n')

    expect(parseTaskList(text)).toEqual([
      { text: 'first', done: true },
      { text: 'second', done: false },
    ])
  })

  it('returns empty array for empty text', () => {
    expect(parseTaskList('')).toEqual([])
  })

  it('returns empty array for null', () => {
    expect(parseTaskList(null)).toEqual([])
  })
})

describe('parseProposalExcerpt', () => {
  it('parses title and truncates why to 500 characters', () => {
    const whyBody = 'w'.repeat(501)
    const text = ['# Title', '## Why', whyBody].join('\n')

    const result = parseProposalExcerpt(text)

    expect(result.title).toBe('Title')
    expect(result.why).toHaveLength(500)
  })

  it('returns null why when Why heading is missing', () => {
    expect(parseProposalExcerpt('# Title').why).toBeNull()
  })
})

describe('parseDecisionsExcerpt', () => {
  it('truncates to 500 characters', () => {
    const body = 'd'.repeat(501)
    const text = ['# Decisions', body].join('\n')

    expect(parseDecisionsExcerpt(text)).toHaveLength(500)
  })
})

describe('parseReviewExcerpt', () => {
  it('returns null for null input', () => {
    expect(parseReviewExcerpt(null)).toBeNull()
  })
})

describe('parseHandoffDetails', () => {
  it('parses done and treats blocked none as null', () => {
    const text = ['Done: research', 'Blocked: none'].join('\n')

    const result = parseHandoffDetails(text)

    expect(result.done).toBe('research')
    expect(result.blocked).toBeNull()
  })
})
