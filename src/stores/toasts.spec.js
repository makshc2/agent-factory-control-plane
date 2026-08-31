import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToastsStore } from './toasts.js'

describe('useToastsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('pushes success, error and info toasts', () => {
    const store = useToastsStore()

    store.success('Борд оновлено')
    store.error('Немає відповіді від сервера')
    store.info('Відкрито аналіз змін')

    expect(store.items.map((item) => item.type)).toEqual(['success', 'error', 'info'])
    expect(store.items.map((item) => item.message)).toEqual([
      'Борд оновлено',
      'Немає відповіді від сервера',
      'Відкрито аналіз змін',
    ])
  })

  it('ignores empty messages and dismisses by id', () => {
    const store = useToastsStore()

    expect(store.success('   ')).toBeNull()
    const id = store.success('CSV експортовано')
    store.dismiss(id)

    expect(store.items).toEqual([])
  })
})
