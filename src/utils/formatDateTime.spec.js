import { describe, expect, it } from 'vitest'
import { formatDuration, formatKyivDate, formatKyivDateTime, parseFlexibleIso } from './formatDateTime.js'

describe('formatKyivDateTime', () => {
  it('formats an ISO instant in Kyiv time', () => {
    expect(formatKyivDateTime('2026-08-27T10:56:57.000Z')).toBe('27.08.2026, 13:56')
  })

  it('keeps an explicit +03:00 offset as Kyiv wall time', () => {
    expect(formatKyivDateTime('2026-08-27T13:56:57.000+03:00')).toBe('27.08.2026, 13:56')
  })

  it('returns null for missing or invalid values', () => {
    expect(formatKyivDateTime(null)).toBeNull()
    expect(formatKyivDateTime('')).toBeNull()
    expect(formatKyivDateTime('not-a-date')).toBeNull()
  })

  it('formats Amp microsecond+.000Z stamps in Kyiv time', () => {
    expect(formatKyivDateTime('2026-08-31T07:08:17.563464.000Z')).toBe('31.08.2026, 10:08')
  })

  it('formats leftover Kyiv-offset ISO as the same wall time', () => {
    expect(formatKyivDateTime('2026-08-31T10:08:17.563+03:00')).toBe('31.08.2026, 10:08')
  })
})

describe('formatKyivDate', () => {
  it('formats a calendar date without inventing a clock time', () => {
    expect(formatKyivDate('2026-08-27')).toBe('27.08.2026')
  })
})

describe('parseFlexibleIso', () => {
  it('parses Amp microsecond+.000Z stamps', () => {
    expect(parseFlexibleIso('2026-08-31T07:08:17.563464.000Z')).toBe(
      Date.parse('2026-08-31T07:08:17.563Z'),
    )
  })

  it('parses Amp microseconds before Z without the extra .000', () => {
    expect(parseFlexibleIso('2026-08-31T07:08:17.563464Z')).toBe(
      Date.parse('2026-08-31T07:08:17.563Z'),
    )
  })

  it('parses a space-separated UTC stamp as an instant', () => {
    expect(parseFlexibleIso('2026-08-31 07:08:17.563Z')).toBe(
      Date.parse('2026-08-31T07:08:17.563Z'),
    )
  })

  it('parses a leftover Kyiv offset as the same instant as UTC', () => {
    expect(parseFlexibleIso('2026-08-31T10:08:17.563+03:00')).toBe(
      Date.parse('2026-08-31T07:08:17.563Z'),
    )
  })
})

describe('formatDuration', () => {
  it('returns null for missing duration', () => {
    expect(formatDuration(null)).toBeNull()
  })

  it('shows an honest zero as seconds', () => {
    expect(formatDuration(0)).toBe('0 с')
  })

  it('shows minutes and seconds for a short commit span', () => {
    expect(formatDuration(144000)).toBe('2 хв 24 с')
  })

  it('shows hours for a two-hour span', () => {
    expect(formatDuration(7200000)).toBe('2 год')
  })
})
