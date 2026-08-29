import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnalysisDetailsModal from './AnalysisDetailsModal.vue'

const row = {
  repo: 'group/frontend',
  changeName: 'vms-office-camera-settings',
  archived: true,
  archivedAt: '2026-08-27',
  hasAcceptanceCriteria: true,
  decisionsCount: 0,
  spend: {
    source: 'unknown',
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    costUsd: null,
  },
  agents: {
    runtime: null,
    roles: ['Archiver'],
    subagents: [],
  },
  spans: {
    spec: {
      startedAt: '2026-08-27T13:56:57.000+03:00',
      endedAt: '2026-08-27T13:59:21.000+03:00',
      durationMs: 144000,
      commitCount: 2,
    },
    review: {
      startedAt: '2026-08-27T13:56:57.000+03:00',
      endedAt: '2026-08-27T13:59:21.000+03:00',
      durationMs: 144000,
      commitCount: 2,
    },
    apply: {
      startedAt: '2026-08-27T13:56:57.000+03:00',
      endedAt: '2026-08-27T13:59:21.000+03:00',
      durationMs: 144000,
      commitCount: 2,
    },
    change: {
      startedAt: '2026-08-27T13:59:21.000+03:00',
      endedAt: '2026-08-27T13:59:21.000+03:00',
      durationMs: 0,
      commitCount: 1,
    },
  },
}

describe('AnalysisDetailsModal', () => {
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
  })

  it('renders a Ukrainian table with Kyiv dates and short durations', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: { row },
    })

    expect(wrapper.text()).toContain('Деталі метрик')
    expect(wrapper.text()).toContain('Джерело витрат')
    expect(wrapper.text()).toContain('невідомо')
    expect(wrapper.text()).toContain('Критерії прийняття')
    expect(wrapper.text()).toContain('Кількість рішень')
    expect(wrapper.text()).toContain('27.08.2026, 13:56')
    expect(wrapper.text()).toContain('27.08.2026, 13:59')
    expect(wrapper.text()).toContain('2 хв 24 с')
    expect(wrapper.text()).toContain('0 с')
    expect(wrapper.text()).not.toContain('0.0 год')
    expect(wrapper.text()).not.toContain('spend.source')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('emits close on Закрити and Escape', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: { row },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Закрити').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})
