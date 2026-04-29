<template>
  <view class="page pad">
    <text class="h">客户详情</text>
    <text class="p">客户用户 ID：{{ id || '—' }}</text>
    <text class="p muted">此页为占位。TODO：对接历史订单列表 GET /order/list（按 userId 过滤需后端扩展）或聚合接口。</text>
    <button class="btn" type="primary" @click="goOrders">去订单页手动筛选</button>
  </view>
</template>

<script>
import { goTab } from '../utils/nav.js'

export default {
  data() {
    return { id: '' }
  },
  onLoad(q) {
    this.id = q.id || ''
  },
  methods: {
    goOrders() {
      goTab('/pages/B0101_admin_order_list')
    }
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
.btn {
  margin-top: 24rpx;
  background: $admin-primary;
  border-radius: 12rpx;
}
</style>
