<template>
  <view class="page pad">
    <text class="h">司机详情</text>
    <text class="p">司机 ID：{{ id || '—' }}</text>
    <text class="p muted">此页为占位，后续可对接司机行程、收入、审核记录等模块。</text>
  </view>
</template>

<script>
export default {
  data() {
    return { id: '' }
  },
  onLoad(q) {
    this.id = q.id || ''
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.pad {
  padding: $admin-page-pad;
}
.h {
  font-size: 36rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 16rpx;
}
.p {
  font-size: 28rpx;
  color: $admin-text;
  display: block;
  margin-bottom: 12rpx;
}
.muted {
  color: $admin-text-secondary;
  font-size: 26rpx;
  line-height: 1.5;
}
</style>
