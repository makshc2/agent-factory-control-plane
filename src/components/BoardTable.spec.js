import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BoardTable from './BoardTable.vue'

function makeRow(overrides = {}) {
  return {
    projectId: 'proj-1',
    projectLabel: 'acme/shop',
    changeName: 'add-login',
    nextCommand: '/opsx:apply add-login',
    nextRole: 'Implementer',
    blocked: null,
    tasksDone: 3,
    tasksTotal: 7,
    verdict: 'APPROVE',
    updatedAt: null,
    ...overrides,
  }
}

function mountTable(rows, projectStates) {
  return mount(BoardTable, {
    props: {
      rows,
      projectStates: projectStates ?? {
        loading: {},
        errors: {},
        lastUpdated: {},
      },
    },
  })
}

describe('BoardTable', () => {
  it('shows phase, task progress, and APPROVE badge', () => {
    const wrapper = mountTable([makeRow()])

    expect(wrapper.find('th.board-table__col-command').text()).toContain('Фаза')
    expect(wrapper.text()).toContain('Implementer')
    expect(wrapper.find('.board-table__command-secondary').text()).toBe('/opsx:apply add-login')
    expect(wrapper.find('.board-table__command').attributes('title')).toBe('/opsx:apply add-login')
    expect(wrapper.text()).toContain('3/7')

    const bar = wrapper.find('progress')
    expect(bar.exists()).toBe(true)
    expect(bar.attributes('max')).toBe('7')
    expect(bar.attributes('value')).toBe('3')

    const badge = wrapper.find('.badge-verdict-approve')
    expect(badge.exists()).toBe(true)
    expect(badge.classes()).toContain('badge')
    expect(badge.text()).toBe('APPROVE')
  })

  it('emits details with project id when Деталі is clicked', async () => {
    const wrapper = mountTable([makeRow()])
    const detailsBtn = wrapper.findAll('button').find((button) => button.text() === 'Деталі')

    await detailsBtn.trigger('click')

    expect(wrapper.emitted('details')).toEqual([['proj-1']])
  })

  it('emits details when the repo label is clicked', async () => {
    const wrapper = mountTable([makeRow()])

    await wrapper.find('.board-table__repo').trigger('click')

    expect(wrapper.emitted('details')).toEqual([['proj-1']])
  })

  it('sets tabindex="-1" on the repo span', () => {
    const wrapper = mountTable([makeRow()])

    expect(wrapper.find('span.board-table__repo').attributes('tabindex')).toBe('-1')
  })
})
