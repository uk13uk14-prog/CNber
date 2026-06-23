<template>
  <div class="placeholder">
    <div class="card">
      <h2>{{ title }}</h2>
      <p class="desc">{{ description }}</p>
      <button type="button" class="btn" disabled>下一阶段开发</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true }
})
</script>

<style scoped>
.placeholder {
  max-width: 640px;
}
.card {
  padding: 24px;
}
h2 {
  margin: 0 0 12px;
  font-size: 22px;
}
.desc {
  margin: 0 0 20px;
  color: #6b7280;
  line-height: 1.6;
}
.btn[disabled] {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
