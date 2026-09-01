<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div
    v-if="visible"
    class="analysis-loading-overlay"
    role="status"
    aria-live="polite"
  >
    <div class="analysis-loading-spinner" />
    <p>
      Завантаження аналізу…
    </p>
  </div>
</template>
