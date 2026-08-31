import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from './formatRelativeTime.js'

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 7, 28, 12, 0, 0)

  it('returns щойно for 30 seconds ago', () => {
    expect(formatRelativeTime(now - 30 * 1000, now)).toBe('щойно')
  })

  it('returns minutes for 5 minutes ago', () => {
    expect(formatRelativeTime(now - 5 * 60 * 1000, now)).toBe('5 хв тому')
  })

  it('returns hours for 3 hours ago', () => {
    expect(formatRelativeTime(now - 3 * 60 * 60 * 1000, now)).toBe('3 год тому')
  })

  it('returns days for 2 days ago', () => {
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000, now)).toBe('2 дн. тому')
  })

  it('returns em dash for null', () => {
    expect(formatRelativeTime(null, now)).toBe('—')
  })

  it('parses Amp microsecond stamps for relative time', () => {
    expect(formatRelativeTime('2026-08-28T11:55:00.123456.000Z', now)).toBe('5 хв тому')
  })
})
