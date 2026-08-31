import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ToastStack from './ToastStack.vue'
import { useToastsStore } from '@/stores/toasts'

describe('ToastStack', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    vi.useFakeTimers()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('renders a toast and dismisses it after timeout', async () => {
    wrapper = mount(ToastStack, {
      global: { plugins: [pinia] },
    })
    const toasts = useToastsStore()
    toasts.success('Борд оновлено')
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('Борд оновлено')
    expect(wrapper.find('.toast--success').exists()).toBe(true)
    expect(wrapper.find('.toast-stack').exists()).toBe(true)

    toasts.warning('Борд оновлено з помилкою в 1 проєкті')
    toasts.error('Немає відповіді від сервера')
    await nextTick()

    expect(wrapper.find('.toast--warning').exists()).toBe(true)
    expect(wrapper.find('.toast--error').exists()).toBe(true)

    vi.advanceTimersByTime(4000)
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Борд оновлено')
    expect(toasts.items).toHaveLength(0)
  })
})
