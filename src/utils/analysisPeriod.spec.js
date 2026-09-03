import { describe, expect, it } from 'vitest'
import {
  defaultAnalysisWindow,
  isValidAnalysisWindow,
  periodKey,
  shouldLoadChange,
} from './analysisPeriod.js'

const now = new Date('2026-09-02T12:00:00+03:00')
const window = { from: '2026-08-27', to: '2026-09-02' }

describe('analysisPeriod', () => {
  it('builds a 7-day Kyiv window from a pinned now', () => {
    expect(defaultAnalysisWindow(now)).toEqual(window)
  })

  it('includes archive dates on both ends of the window', () => {
    expect(
      shouldLoadChange({
        archived: true,
        archivedAt: '2026-08-27',
        mode: 'range',
        ...window,
      }),
    ).toBe(true)
    expect(
      shouldLoadChange({
        archived: true,
        archivedAt: '2026-09-02',
        mode: 'range',
        ...window,
      }),
    ).toBe(true)
    expect(
      shouldLoadChange({
        archived: true,
        archivedAt: '2026-01-01',
        mode: 'range',
        ...window,
      }),
    ).toBe(false)
  })

  it('loads active changes and archives without archivedAt in the window', () => {
    expect(
      shouldLoadChange({
        archived: false,
        archivedAt: null,
        mode: 'range',
        ...window,
      }),
    ).toBe(true)
    expect(
      shouldLoadChange({
        archived: true,
        archivedAt: null,
        mode: 'range',
        ...window,
      }),
    ).toBe(true)
  })

  it('loads every archive in all-time mode', () => {
    expect(
      shouldLoadChange({
        archived: true,
        archivedAt: '2026-01-01',
        mode: 'all',
        ...window,
      }),
    ).toBe(true)
  })

  it('rejects inverted and empty windows', () => {
    expect(isValidAnalysisWindow('2026-09-02', '2026-08-27')).toBe(false)
    expect(isValidAnalysisWindow('', '2026-09-02')).toBe(false)
  })

  it('uses all as the period key in all-time mode', () => {
    expect(periodKey({ mode: 'all' })).toBe('all')
  })
})
