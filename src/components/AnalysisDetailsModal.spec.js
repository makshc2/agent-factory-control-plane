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
        threadId: null,
        spendSource: 'unreported',
        ampCredits: null,
        models: [],
        sources: [],
        startedAt: '2026-08-27T10:56:57.000Z',
        endedAt: '2026-08-27T11:04:45.000Z',
      },
      {
        role: 'Implementer',
        phase: 'apply',
        model: 'cursor-grok-4.6',
        platform: 'cursor',
        runtime: 'local',
        threadId: null,
        spendSource: 'unreported',
        ampCredits: null,
        models: [],
        sources: [],
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
    expect(wrapper.find('.analysis-details-modal').exists()).toBe(true)
    expect(wrapper.findAll('.analysis-journal-scroll')).toHaveLength(5)
    expect(wrapper.text()).toContain('Як рахується час')
    expect(wrapper.text()).toContain('час сесій kit (metrics.json), не інтервал комітів')
    expect(wrapper.text()).not.toContain('інтервал комітів файлів, не wall-clock сесії')
    expect(wrapper.text()).toContain('cursor-grok-4.6')
  })

  it('shows session and phase models when spendByModel is empty and spend is null', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: { row },
    })

    const tables = wrapper.findAll('.analysis-journal-table')
    const modelsTable = tables[1]
    expect(modelsTable.text()).toContain('Модель')
    expect(modelsTable.text()).toContain('cursor-grok-4.6')
    expect(modelsTable.text()).not.toContain('немає')
    expect(wrapper.text()).toContain('Architect')
    expect(wrapper.text()).toContain('Implementer')
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
    expect(text).toContain('інтервал комітів файлів, не wall-clock сесії')
    expect(text).not.toContain('час сесій kit (metrics.json), не інтервал комітів')
  })

  it('shows kit 0.8.0 pending client, session spend source, thread, and sources', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: {
        row: {
          ...row,
          agents: {
            ...row.agents,
            platforms: ['amp'],
            models: ['glm-5.2', 'cursor-grok-4.5-low'],
          },
          journal: {
            ...row.journal,
            pending: {
              startedAt: '2026-08-31T05:21:00.000Z',
              role: 'Spec Reviewer',
              platform: 'amp',
              threadId: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8',
              clientSource: 'amp-threads-list',
            },
            sessions: [
              {
                role: 'Implementer',
                phase: 'apply',
                model: 'glm-5.2',
                models: ['glm-5.2', 'cursor-grok-4.5-low'],
                platform: 'amp',
                runtime: 'local',
                threadId: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8',
                spendSource: 'adapter',
                ampCredits: 12,
                totalTokens: 195000,
                sources: [
                  {
                    id: 'T-01a0541e-a7f5-779f-9305-4b9a467c90f8:1',
                    via: 'amp-cli',
                    platform: 'amp',
                    model: 'glm-5.2',
                    totalTokens: 184000,
                    ampCredits: 10,
                    at: '2026-08-31T05:10:00.000Z',
                  },
                ],
              },
            ],
          },
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Журнал · pending платформа')
    expect(text).toContain('Журнал · pending thread')
    expect(text).toContain('Журнал · pending клієнт')
    expect(text).toContain('amp-threads-list')
    expect(text).toContain('T-01a0541e-a7f5-779f-9305-4b9a467c90f8')
    expect(text).toContain('адаптер')
    expect(text).toContain('amp-cli')
    expect(text).toContain('glm-5.2')
    expect(text).toContain('cursor-grok-4.5-low')
    expect(text).toContain('Джерело spend')
    expect(text).toContain('Source id')
    expect(text).toContain('Via')
    expect(wrapper.findAll('.analysis-journal-scroll')).toHaveLength(5)
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
