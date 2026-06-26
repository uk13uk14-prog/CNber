<template>
  <view class="card" @click="$emit('click')">
    <text class="label">{{ label }}</text>
    <text class="val">{{ displayValue }}</text>
    <text v-if="hint" class="hint">{{ hint }}</text>
  </view>
</template>

<script>
export default {
  props: {
    label: String,
    value: { type: [Number, String], default: 0 },
    hint: String
  },
  emits: ['click'],
  computed: {
    displayValue() {
      return this.value === undefined || this.value === null ? '-' : String(this.value)
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 28rpx;
  border: 1rpx solid $admin-border;
  min-height: 140rpx;
  box-sizing: border-box;
}
.label {
  font-size: 24rpx;
  color: $admin-text-secondary;
  display: block;
  margin-bottom: 12rpx;
}
.val {
  font-size: 40rpx;
  font-weight: 600;
  color: $admin-text;
  display: block;
}
.hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $admin-text-secondary;
}
</style>
