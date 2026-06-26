<template>
  <view class="badge" :style="{ color: meta.color, background: meta.bg }">
    <text class="t">{{ meta.label }}</text>
  </view>
</template>

<script>
export default {
  props: {
    label: String,
    color: String,
    bg: String
  },
  computed: {
    meta() {
      if (this.label && this.color && this.bg) {
        return { label: this.label, color: this.color, bg: this.bg }
      }
      return { label: this.label || '—', color: '#667085', bg: '#f2f4f7' }
    }
  }
}
</script>

<style scoped lang="scss">
.badge {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}
.t {
  line-height: 1.2;
}
</style>
