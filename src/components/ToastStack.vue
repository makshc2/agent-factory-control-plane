<script setup>
import { onUnmounted, watch } from 'vue'
import { useToastsStore } from '@/stores/toasts'

const TOAST_MS = 4000

const toasts = useToastsStore()
const timers = new Map()

watch(
  () => toasts.items.map((item) => item.id),
  (ids) => {
    for (const id of ids) {
      if (timers.has(id)) {
        continue
      }
      timers.set(
        id,
        window.setTimeout(() => {
          timers.delete(id)
          toasts.dismiss(id)
        }, TOAST_MS),
      )
    }
    for (const [id, timer] of timers) {
      if (ids.includes(id)) {
        continue
      }
      window.clearTimeout(timer)
      timers.delete(id)
    }
  },
)

onUnmounted(() => {
  for (const timer of timers.values()) {
    window.clearTimeout(timer)
  }
  timers.clear()
})
</script>

<template>
  <div
    class="toast-stack"
    role="status"
    aria-live="polite"
    aria-relevant="additions"
  >
    <p
      v-for="item in toasts.items"
      :key="item.id"
      class="toast"
      :class="`toast--${item.type}`"
    >
      <span>{{ item.message }}</span>
      <button
        type="button"
        class="toast__close"
        :aria-label="`Закрити: ${item.message}`"
        @click="toasts.dismiss(item.id)"
      >
        ×
      </button>
    </p>
  </div>
</template>
