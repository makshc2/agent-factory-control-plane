import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import BoardView from './views/BoardView.vue'

describe('App', () => {
  it('renders the board route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'board', component: BoardView },
        { path: '/analysis', redirect: '/' },
        { path: '/analysis/:projectId', name: 'analysis', component: { template: '<div>Аналіз змін</div>' } },
      ],
    })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()],
      },
    })

    expect(wrapper.text()).toContain('Factory board')
  })

  it('redirects /analysis without a project to the board', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'board', component: BoardView },
        { path: '/analysis', redirect: '/' },
        { path: '/analysis/:projectId', name: 'analysis', component: { template: '<div>Аналіз змін</div>' } },
      ],
    })
    await router.push('/analysis')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()],
      },
    })

    expect(router.currentRoute.value.name).toBe('board')
    expect(wrapper.text()).toContain('Factory board')
    expect(wrapper.text()).not.toContain('Аналіз змін')
  })
})
