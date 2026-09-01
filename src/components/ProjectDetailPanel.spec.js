import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProjectDetailPanel from './ProjectDetailPanel.vue'

const project = {
  id: 'p1',
  provider: 'github',
  repo: 'acme/shop',
  branch: 'main',
}

const emptyDetails = {
  branchHead: null,
  changes: {
    'add-login': {
      taskList: [],
      handoff: {
        nextCommand: null,
        nextRole: null,
        blocked: null,
        done: null,
      },
      reviewExcerpt: null,
      proposal: {
        title: null,
        why: null,
      },
      decisionsExcerpt: null,
      designExcerpt: null,
    },
  },
}

describe('ProjectDetailPanel', () => {
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  function mountPanel(props = {}) {
    wrapper = mount(ProjectDetailPanel, {
      attachTo: document.body,
      props: {
        project,
        ...props,
      },
    })
    return wrapper
  }

  function findButton(label) {
    return wrapper.findAll('button').find((button) => button.text() === label)
  }

  it('emits close when overlay is clicked', async () => {
    mountPanel()

    await wrapper.find('.board-detail-overlay').trigger('click')

    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('emits close when Закрити is clicked', async () => {
    mountPanel()

    await findButton('Закрити').trigger('click')

    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('emits close on Escape keydown', async () => {
    mountPanel()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it('sets dialog role and aria-modal on aside', () => {
    mountPanel()

    const aside = wrapper.find('aside')
    expect(aside.attributes('role')).toBe('dialog')
    expect(aside.attributes('aria-modal')).toBe('true')
  })

  it('focuses the Закрити button after mount', () => {
    mountPanel()

    expect(document.activeElement).toBe(findButton('Закрити').element)
  })

  it('shows loading text when detailsLoading is true', () => {
    mountPanel({ detailsLoading: true })

    expect(wrapper.text()).toContain('Завантаження деталей…')
  })

  it('shows empty commit and file placeholders without an error banner', () => {
    mountPanel({ details: emptyDetails })

    expect(wrapper.text()).toContain('Немає даних про коміт')
    expect(wrapper.text()).toContain('немає файлу')
    expect(wrapper.find('.board-detail-error').exists()).toBe(false)
  })

  it('emits refresh-details when Оновити деталі is clicked', async () => {
    mountPanel()

    await findButton('Оновити деталі').trigger('click')

    expect(wrapper.emitted('refresh-details')).toEqual([[]])
  })

  it('renders change card, APPROVE badge, task checkbox, and Handoff', () => {
    mountPanel({
      headerChanges: [
        {
          changeName: 'add-login',
          nextRole: 'Implementer',
          tasksDone: 1,
          tasksTotal: 2,
          verdict: 'APPROVE',
        },
      ],
      details: {
        ...emptyDetails,
        changes: {
          'add-login': {
            ...emptyDetails.changes['add-login'],
            taskList: [
              { text: 'Add login form', done: true },
              { text: 'Wire OAuth', done: false },
            ],
          },
        },
      },
    })

    expect(wrapper.find('.board-detail-card').exists()).toBe(true)
    expect(wrapper.find('.badge-verdict-approve').exists()).toBe(true)
    expect(wrapper.find('.badge-verdict-approve').text()).toBe('APPROVE')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    expect(wrapper.findAll('h4').map((heading) => heading.text())).toContain('Handoff')
  })
})
