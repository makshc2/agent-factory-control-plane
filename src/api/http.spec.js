import { describe, expect, it } from 'vitest'
import { createHttp } from './http.js'

function ok(config, data = {}) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}

describe('createHttp', () => {
  it('caps concurrent requests per host', async () => {
    const http = createHttp({ baseURL: 'https://limit-cap.example' })
    let current = 0
    let max = 0
    http.defaults.adapter = async (config) => {
      current += 1
      max = Math.max(max, current)
      await new Promise((resolve) => {
        setTimeout(resolve, 40)
      })
      current -= 1
      return ok(config)
    }

    await Promise.all(Array.from({ length: 8 }, (_, index) => http.get(`/item-${index}`)))

    expect(max).toBeLessThanOrEqual(4)
    expect(max).toBeGreaterThan(1)
  })

  it('retries once after 429 Retry-After', async () => {
    const http = createHttp({ baseURL: 'https://limit-retry.example' })
    let calls = 0
    http.defaults.adapter = async (config) => {
      calls += 1
      if (calls === 1) {
        const error = new Error('Too Many Requests')
        error.response = {
          status: 429,
          headers: { 'retry-after': '0' },
        }
        error.config = config
        throw error
      }
      return ok(config, { ok: true })
    }

    const { data } = await http.get('/tree')

    expect(calls).toBe(2)
    expect(data).toEqual({ ok: true })
  })

  it('does not retry 429 a second time', async () => {
    const http = createHttp({ baseURL: 'https://limit-noretry.example' })
    let calls = 0
    http.defaults.adapter = async (config) => {
      calls += 1
      const error = new Error('Too Many Requests')
      error.response = {
        status: 429,
        headers: { 'retry-after': '0' },
      }
      error.config = config
      throw error
    }

    await expect(http.get('/tree')).rejects.toMatchObject({
      response: { status: 429 },
    })
    expect(calls).toBe(2)
  })
})
