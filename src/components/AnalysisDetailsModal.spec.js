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

function tableRows(card) {
  return card.findAll('.analysis-details-table tbody tr')
}

function firstRowLabel(card) {
  return tableRows(card)[0]?.find('th').text() ?? ''
}

function labeledValue(card, label) {
  for (const rowEl of tableRows(card)) {
    if (rowEl.find('th').text() === label) {
      return rowEl.find('td').text()
    }
  }
  return ''
}

function journalCards(wrapper, label) {
  return wrapper.findAll('.analysis-journal-card').filter((card) => firstRowLabel(card) === label)
}

describe('AnalysisDetailsModal', () => {
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
  })

  it('renders Ukrainian metric cards with Kyiv dates and short durations', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: { row },
    })

    expect(wrapper.text()).toContain('Журнал · джерело')
    expect(wrapper.text()).toContain('файл metrics.json')
    expect(wrapper.text()).toContain('Усього · сесії')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('Kit · робочий час')
    expect(wrapper.text()).toContain('Kit · lead time')
    expect(wrapper.text()).toContain('Amp credits')
    expect(wrapper.text()).toContain('Ролі')
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
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('.analysis-details').exists()).toBe(true)
    expect(wrapper.find('.analysis-metric-card').exists()).toBe(true)
    expect(wrapper.findAll('.analysis-session-card')).toHaveLength(2)
    expect(journalCards(wrapper, 'Платформа')).toHaveLength(3)
    expect(wrapper.text()).toContain('Як рахується час')
    expect(wrapper.text()).toContain('час сесій kit (metrics.json), не інтервал комітів')
    expect(wrapper.text()).not.toContain('інтервал комітів файлів, не wall-clock сесії')
    expect(wrapper.text()).toContain('cursor-grok-4.6')
  })

  it('groups details into titled sections with subtitles', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: { row },
    })

    const titles = wrapper.findAll('.analysis-details-section h2').map((el) => el.text())
    expect(titles).toEqual([
      'Загальна інформація',
      'Час і витрати',
      'Агенти та процес',
      'Фази OpenSpec (інтервали)',
      'Витрати за платформами',
      'Моделі',
      'Фази OpenSpec (сесії)',
      'Сесії агентів',
      'Джерела витрат',
    ])
    const sections = wrapper.findAll('.analysis-details-section')
    expect(sections).toHaveLength(9)
    for (const section of sections) {
      expect(section.find('.analysis-details-subtitle').text()).not.toBe('')
    }
    expect(sections[0].text()).toContain('Журнал · джерело')
    expect(sections[0].text()).not.toContain('Kit · робочий час')
    expect(sections[1].text()).toContain('Kit · робочий час')
    expect(sections[1].text()).toContain('Як рахується час')
    expect(sections[1].text()).not.toContain('Ролі')
    expect(sections[2].text()).toContain('Субагенти')
    expect(sections[2].text()).toContain('Ролі')
    expect(sections[2].text()).toContain('Критерії прийняття')
    const spanTitles = sections[3]
      .findAll('.analysis-metric-card__title')
      .map((el) => el.text())
    expect(spanTitles).toEqual(['Спека', 'Рев’ю', 'Apply', 'Усього'])
    expect(sections[3].text()).toContain('Комітів')
    expect(sections[3].text()).toContain('коміти файлів')
    expect(sections[3].find('.analysis-details-subtitle').text()).toBe(
      'Інтервали за комітами файлів спеки, не сесії агентів.',
    )
    expect(sections[3].text()).toContain('2 хв 24 с')
    expect(sections[4].text()).toContain('Платформа')
    expect(sections[5].text()).toContain('Модель')
    expect(sections[6].text()).toContain('Фаза')
    expect(sections[6].text()).not.toContain('Комітів')
    expect(sections[7].findAll('.analysis-session-card')).toHaveLength(2)
    expect(wrapper.findAll('.analysis-metric-card .analysis-details-table')).toHaveLength(7)
    expect(wrapper.findAll('.analysis-journal-card .analysis-details-table')).toHaveLength(7)
    expect(wrapper.findAll('.analysis-session-card .analysis-details-table')).toHaveLength(2)
    expect(labeledValue(sections[0].find('.analysis-metric-card'), 'Зміна')).toBe(
      'vms-office-camera-settings',
    )
    expect(sections[8].text()).toContain('немає')
    expect(wrapper.findAll('.analysis-metric-card--wide')).toHaveLength(3)
  })

  it('shows session and phase models when spendByModel is empty and spend is null', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: { row },
    })

    const modelCards = journalCards(wrapper, 'Модель')
    expect(modelCards.length).toBeGreaterThan(0)
    expect(modelCards.some((card) => labeledValue(card, 'Модель') === 'cursor-grok-4.6')).toBe(true)
    expect(modelCards.every((card) => !card.text().includes('немає'))).toBe(true)
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
    expect(text).not.toContain('Журнал · статус')
    expect(text).not.toContain('Журнал · роль pending')
    expect(text).not.toContain('Журнал · pending з')
    expect(text).not.toContain('Журнал · pending платформа')
    expect(text).not.toContain('Журнал · pending thread')
    expect(text).not.toContain('Журнал · pending клієнт')
    expect(text).not.toContain('$0.00')
    expect(text).not.toContain('файл metrics.json')
    expect(text).toContain('інтервал комітів файлів, не wall-clock сесії')
    expect(text).not.toContain('час сесій kit (metrics.json), не інтервал комітів')
    const sections = wrapper.findAll('.analysis-details-section')
    expect(sections).toHaveLength(9)
    expect(sections[5].text()).toContain('немає')
    expect(sections[6].text()).toContain('немає')
    expect(sections[7].text()).toContain('немає')
    expect(sections[8].text()).toContain('немає')
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
    expect(text).toContain('Журнал · статус')
    expect(text).toContain('Журнал · роль pending')
    expect(text).toContain('Журнал · pending з')
    expect(text).toContain('Журнал · pending платформа')
    expect(text).toContain('Журнал · pending thread')
    expect(text).toContain('Журнал · pending клієнт')
    expect(text).toContain('amp-threads-list')
    expect(text).toContain('T-01a0541e-a7f5-779f-9305-4b9a467c90f8')
    expect(text).toContain('адаптер')
    expect(text).toContain('amp-cli')
    expect(text).toContain('glm-5.2')
    expect(text).toContain('cursor-grok-4.5-low')
    expect(text).toContain('Джерело витрат')
    expect(text).toContain('Source id')
    expect(text).toContain('Via')
    expect(wrapper.find('.analysis-metric-card').exists()).toBe(true)
    expect(wrapper.find('.analysis-session-card').exists()).toBe(true)
    const sessionCard = wrapper.find('.analysis-session-card')
    expect(labeledValue(sessionCard, 'Thread')).toBe('T-01a0541e-a7f5-779f-9305-4b9a467c90f8')
    expect(labeledValue(sessionCard, 'Джерело витрат')).toBe('адаптер')
    const sourceCards = journalCards(wrapper, 'Роль')
    expect(sourceCards.length).toBeGreaterThan(0)
    expect(labeledValue(sourceCards[0], 'Via')).toBe('amp-cli')
  })

  it('does not render an empty thread row when session has no threadId or tasks', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: {
        row: {
          ...row,
          journal: {
            ...row.journal,
            sessions: [
              {
                role: 'Implementer',
                phase: 'apply',
                model: 'cursor-grok-4.6',
                platform: 'cursor',
                runtime: 'local',
                threadId: null,
                tasks: null,
                spendSource: 'unreported',
                ampCredits: null,
                models: [],
                sources: [],
                startedAt: '2026-08-27T11:10:00.000Z',
                endedAt: '2026-08-27T11:30:19.000Z',
              },
            ],
          },
        },
      },
    })

    const card = wrapper.find('.analysis-session-card')
    expect(card.exists()).toBe(true)
    const labels = tableRows(card).map((rowEl) => rowEl.find('th').text())
    expect(labels).toHaveLength(12)
    expect(labels).not.toContain('Thread')
    expect(labels).not.toContain('Задачі')
    expect(labeledValue(card, 'Роль')).toBe('Implementer')
    expect(labeledValue(card, 'Фаза')).toBe('apply')
  })

  it('shows kit phase bounds, lead time and costUsdTotal from a v2 journal', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: {
        row: {
          ...row,
          spend: {
            source: 'metrics-file',
            inputTokens: 5861491,
            outputTokens: 56057,
            totalTokens: 5917548,
            costUsd: 14.48,
            costUsdEstimated: 6.5979,
            costUsdTotal: 21.0779,
          },
          spans: {
            spec: {
              startedAt: '2026-09-07T15:17:07.490Z',
              endedAt: '2026-09-07T15:31:40.934Z',
              durationMs: 873444,
              commitCount: null,
              source: 'kit-sessions',
            },
            review: {
              startedAt: '2026-09-07T15:26:14.472Z',
              endedAt: '2026-09-07T15:39:40.339Z',
              durationMs: 805867,
              commitCount: null,
              source: 'kit-sessions',
            },
            apply: {
              startedAt: '2026-09-07T15:41:28.560Z',
              endedAt: '2026-09-07T16:01:28.873Z',
              durationMs: 1200313,
              commitCount: null,
              source: 'kit-sessions',
            },
            change: {
              startedAt: '2026-09-07T15:03:59.069Z',
              endedAt: '2026-09-07T16:22:10.865Z',
              durationMs: 4691796,
              commitCount: null,
              source: 'kit-sessions',
            },
          },
          journal: {
            ...row.journal,
            version: 2,
            spendByPlatform: {
              ...row.journal.spendByPlatform,
              amp: {
                inputTokens: 5861491,
                outputTokens: 56057,
                totalTokens: 5917548,
                costUsd: 14.48,
                costUsdEstimated: null,
                costUsdTotal: 14.48,
                ampCredits: null,
                source: 'amp-usage',
              },
              cursor: {
                inputTokens: 1213772,
                outputTokens: 12456,
                totalTokens: 1226228,
                costUsd: null,
                costUsdEstimated: 4.6377,
                costUsdTotal: 4.6377,
                ampCredits: null,
                source: 'cursor-hook',
              },
            },
            phases: {
              spec: {
                sessions: 2,
                durationMs: 539356,
                startedAt: '2026-09-07T15:17:07.490Z',
                endedAt: '2026-09-07T15:31:40.934Z',
                leadTimeMs: 873444,
                totalTokens: 2055318,
                costUsd: 6.47,
                costUsdEstimated: null,
                costUsdTotal: 6.47,
                agents: ['Architect'],
                models: ['gpt-6-astra'],
              },
            },
          },
        },
      },
    })

    const sections = wrapper.findAll('.analysis-details-section')
    const spendCard = sections[1].find('.analysis-metric-card')
    expect(labeledValue(spendCard, 'Вартість')).toBe('$21.08')
    expect(labeledValue(spendCard, 'Вартість · рахунок')).toBe('$14.48')
    expect(labeledValue(spendCard, 'Вартість · оцінка kit')).toBe('≈ $6.60')
    expect(sections[3].find('.analysis-details-subtitle').text()).toBe(
      'Початок і кінець фаз за сесіями kit із metrics.json.',
    )
    expect(sections[3].text()).not.toContain('Комітів')
    const specCard = sections[3].findAll('.analysis-metric-card')[0]
    expect(labeledValue(specCard, 'Початок')).toBe('07.09.2026, 18:17')
    expect(labeledValue(specCard, 'Кінець')).toBe('07.09.2026, 18:31')
    expect(labeledValue(specCard, 'Тривалість')).toBe('14 хв 33 с')
    expect(labeledValue(specCard, 'Джерело')).toBe('сесії kit (metrics.json)')
    const changeCard = sections[3].findAll('.analysis-metric-card')[3]
    expect(labeledValue(changeCard, 'Початок')).toBe('07.09.2026, 18:03')
    const ampCard = journalCards(wrapper, 'Платформа').find(
      (card) => labeledValue(card, 'Платформа') === 'amp',
    )
    expect(labeledValue(ampCard, 'Вартість')).toBe('$14.48')
    const cursorCard = journalCards(wrapper, 'Платформа').find(
      (card) => labeledValue(card, 'Платформа') === 'cursor',
    )
    expect(labeledValue(cursorCard, 'Вартість')).toBe('≈ $4.64')
    const phaseCard = journalCards(wrapper, 'Фаза')[0]
    expect(labeledValue(phaseCard, 'Початок')).toBe('07.09.2026, 18:17')
    expect(labeledValue(phaseCard, 'Кінець')).toBe('07.09.2026, 18:31')
    expect(labeledValue(phaseCard, 'Lead time')).toBe('14 хв 33 с')
    expect(labeledValue(phaseCard, 'Тривалість')).toBe('8 хв 59 с')
    expect(labeledValue(phaseCard, 'Вартість')).toBe('$6.47')
  })

  it('shows git-span rows with commit subtitle and коміти файлів source', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: {
        row: {
          ...row,
          spans: {
            spec: { ...row.spans.spec, source: 'git-commits' },
            review: { ...row.spans.review, source: 'git-commits' },
            apply: { ...row.spans.apply, source: 'git-commits' },
            change: { ...row.spans.change, source: 'git-commits' },
          },
        },
      },
    })

    const sections = wrapper.findAll('.analysis-details-section')
    expect(sections[3].find('.analysis-details-subtitle').text()).toBe(
      'Інтервали за комітами файлів спеки, не сесії агентів.',
    )
    const specCard = sections[3].findAll('.analysis-metric-card')[0]
    expect(labeledValue(specCard, 'Джерело')).toBe('коміти файлів')
    expect(labeledValue(specCard, 'Комітів')).toBe('2')
  })

  it('shows kit overlay estimate when billed cost is missing', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: {
        row: {
          ...row,
          spend: {
            costUsd: null,
            costUsdEstimated: 0.42,
            source: 'metrics-file',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('≈ $0.42')
  })

  it('shows kit platform estimate without mixing Amp credits', async () => {
    wrapper = mount(AnalysisDetailsModal, {
      attachTo: document.body,
      props: {
        row: {
          ...row,
          journal: {
            ...row.journal,
            spendByPlatform: {
              ...row.journal.spendByPlatform,
              cursor: {
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                costUsd: null,
                costUsdEstimated: 0.18,
                ampCredits: null,
                source: 'cursor-hook',
              },
            },
          },
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('≈ $0.18')
    expect(text).toContain('Amp credits')
    const cursorCard = journalCards(wrapper, 'Платформа').find(
      (card) => labeledValue(card, 'Платформа') === 'cursor',
    )
    expect(cursorCard).toBeTruthy()
    expect(labeledValue(cursorCard, 'Вартість')).toBe('≈ $0.18')
    expect(labeledValue(cursorCard, 'Amp credits')).toBe('—')
  })
})
