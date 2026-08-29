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
  journal: {
    source: 'metrics-file',
    version: 1,
    createdAt: '2026-08-27T10:00:00.000Z',
    updatedAt: '2026-08-27T11:00:00.000Z',
    archivedAt: '2026-08-27T12:00:00.000Z',
    pending: null,
    totals: {
      sessions: 7,
      durationMs: 2449985,
      leadTimeMs: 3151528,
      cloudSessions: 0,
    },
    spendByPlatform: {
      cursor: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        costUsd: null,
        ampCredits: null,
        source: 'none',
      },
      claude: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        costUsd: null,
        ampCredits: null,
        source: 'none',
      },
      amp: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        costUsd: null,
        ampCredits: null,
        source: 'none',
      },
    },
    spendByModel: [],
    phases: {
      spec: {
        sessions: 2,
        durationMs: 467553,
        totalTokens: null,
        costUsd: null,
        agents: ['Architect'],
        models: ['cursor-grok-4.6'],
      },
      review: {
        sessions: 2,
        durationMs: 763251,
        totalTokens: null,
        costUsd: null,
        agents: ['Spec Reviewer'],
        models: ['cursor-grok-4.6'],
      },
      apply: {
        sessions: 3,
        durationMs: 1219181,
        totalTokens: null,
        costUsd: null,
        agents: ['Implementer'],
        models: ['cursor-grok-4.6'],
      },
    },
    sessions: [
      {
        role: 'Architect',
        phase: 'spec',
        model: 'cursor-grok-4.6',
        platform: 'cursor',
        runtime: 'local',
        startedAt: '2026-08-27T10:56:57.000Z',
        endedAt: '2026-08-27T11:04:45.000Z',
      },
      {
        role: 'Implementer',
        phase: 'apply',
        model: 'cursor-grok-4.6',
        platform: 'cursor',
        runtime: 'local',
        startedAt: '2026-08-27T11:10:00.000Z',
        endedAt: '2026-08-27T11:30:19.000Z',
      },
    ],
  },
  kitTimes: {
    source: 'kit-sessions',
    workMs: 2449985,
    leadMs: 3151528,
    phases: {
      spec: 467553,
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
    expect(wrapper.text()).toContain('Журнал · джерело')
    expect(wrapper.text()).toContain('файл metrics.json')
    expect(wrapper.text()).toContain('Усього · сесії')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('Kit · робочий час')
    expect(wrapper.text()).toContain('Kit · lead time')
    expect(wrapper.text()).toContain('Amp credits')
    expect(wrapper.text()).toContain('Роль')
    expect(wrapper.text()).toContain('Фаза')
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
    expect(wrapper.text()).not.toContain('1–5')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('keeps journal labels and dashes when source is unknown', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: {
        row: {
          ...row,
          journal: {
            source: 'unknown',
            version: null,
            createdAt: null,
            updatedAt: null,
            archivedAt: null,
            pending: null,
            totals: {
              sessions: null,
              durationMs: null,
              leadTimeMs: null,
              cloudSessions: null,
            },
            spendByPlatform: {
              cursor: {
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                costUsd: null,
                ampCredits: null,
                source: 'none',
              },
              claude: {
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                costUsd: null,
                ampCredits: null,
                source: 'none',
              },
              amp: {
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                costUsd: null,
                ampCredits: null,
                source: 'none',
              },
            },
            spendByModel: [],
            phases: {},
            sessions: [],
          },
          kitTimes: {
            source: 'unknown',
            workMs: null,
            leadMs: null,
            phases: {
              spec: null,
            },
          },
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Журнал · джерело')
    expect(text).toContain('Усього · сесії')
    expect(text).toContain('Усього · хмарні сесії')
    expect(text).toContain('Kit · робочий час')
    expect(text).toContain('Kit · lead time')
    expect(text).toContain('—')
    expect(text).not.toContain('$0.00')
    expect(text).not.toContain('файл metrics.json')
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
