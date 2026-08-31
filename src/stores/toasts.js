import { ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'

export const useToastsStore = defineStore('toasts', () => {
  const items = ref([])

  function dismiss(id) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function push(type, message) {
    const text = String(message ?? '').trim()
    if (!text) {
      return null
    }
    const id = crypto.randomUUID()
    items.value = [...items.value, { id, type, message: text }]
    return id
  }

  function success(message) {
    return push('success', message)
  }

  function error(message) {
    return push('error', message)
  }

  function warning(message) {
    return push('warning', message)
  }

  function info(message) {
    return push('info', message)
  }

  return { items, push, success, error, warning, info, dismiss }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useToastsStore, import.meta.hot))
}
