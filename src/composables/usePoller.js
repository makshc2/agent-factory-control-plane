import { ref } from 'vue'

export function usePoller(
  callback,
  intervalMs = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 60000,
) {
  const isRunning = ref(false)
  let timerId = null
  let inFlight = false

  async function invoke() {
    if (inFlight) {
      return
    }
    inFlight = true
    try {
      await callback()
    } finally {
      inFlight = false
    }
  }

  function start() {
    if (timerId != null) {
      return
    }
    isRunning.value = true
    timerId = setInterval(() => {
      void invoke()
    }, intervalMs)
  }

  function stop() {
    if (timerId != null) {
      clearInterval(timerId)
      timerId = null
    }
    isRunning.value = false
  }

  function refresh() {
    return invoke()
  }

  return { start, stop, refresh, isRunning }
}
