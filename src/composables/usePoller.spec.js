import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePoller } from './usePoller.js'

describe('usePoller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invokes callback after start when the interval elapses', () => {
    const callback = vi.fn().mockResolvedValue(undefined)
    const { start, stop, isRunning } = usePoller(callback, 1000)

    start()
    expect(isRunning.value).toBe(true)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does not start a second call while the first is unresolved', () => {
    let resolveFirst
    const callback = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    const { start, stop } = usePoller(callback, 1000)

    start()
    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    resolveFirst()
    stop()
  })

  it('does not invoke callback on ticks after stop', () => {
    const callback = vi.fn().mockResolvedValue(undefined)
    const { start, stop, isRunning } = usePoller(callback, 1000)

    start()
    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    stop()
    expect(isRunning.value).toBe(false)

    vi.advanceTimersByTime(5000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('refresh invokes callback immediately without waiting for the interval', () => {
    const callback = vi.fn().mockResolvedValue(undefined)
    const { start, stop, refresh } = usePoller(callback, 1000)

    start()
    expect(callback).not.toHaveBeenCalled()

    refresh()
    expect(callback).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(999)
    expect(callback).toHaveBeenCalledTimes(1)

    stop()
  })
})
