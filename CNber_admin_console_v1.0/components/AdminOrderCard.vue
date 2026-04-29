<template>
  <view class="wrap" @click="$emit('open')">
    <view class="head">
      <text class="no">#{{ shortId }}</text>
      <AdminStatusBadge :ui-status="uiStatus" />
    </view>
    <view class="row">
      <text class="k">客户</text>
      <text class="v">{{ customerLine }}</text>
    </view>
    <view class="row">
      <text class="k">服务</text>
      <text class="v">{{ serviceLabel }}</text>
    </view>
    <view class="addr">
      <text class="dot a" />{{ pickupLine }}
    </view>
    <view class="addr">
      <text class="dot b" />{{ destinationLine }}
    </view>
    <view class="meta">
      <text>{{ timeLine }}</text>
      <text class="money">{{ moneyLine }}</text>
    </view>
    <view class="foot">
      <text class="driver">{{ driverLine }}</text>
      <view class="btns" @click.stop>
        <button class="btn ghost" size="mini" @click="$emit('detail')">详情</button>
        <button
          v-if="canDispatch"
          class="btn primary"
          size="mini"
          @click="$emit('dispatch')"
        >
          指派司机
        </button>
        <button
          v-if="canCancel"
          class="btn danger"
          size="mini"
          @click="$emit('cancel')"
        >
          取消订单
        </button>
        <button class="btn ghost" size="mini" @click="$emit('follow')">跟进</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import AdminStatusBadge from './AdminStatusBadge.vue'
import { mapOrderToUiStatus, UI_ORDER_STATUS } from '../config/orderStatus.js'
import { getServiceTypeLabel } from '../config/serviceTypes.js'
import { formatDateTime, formatMoney, maskPhone } from '../utils/format.js'

const props = defineProps({
  order: { type: Object, default: () => ({}) }
})

defineEmits(['open', 'detail', 'dispatch', 'follow', 'cancel'])

const uiStatus = computed(() => mapOrderToUiStatus(props.order))

const shortId = computed(() => {
  const id = props.order._id || ''
  return id ? String(id).slice(-6) : '--'
})

const customerLine = computed(() => {
  const u = props.order.userId
  const phone = typeof u === 'object' && u ? u.phone : ''
  return phone ? maskPhone(phone) : '—'
})

const serviceLabel = computed(() =>
  getServiceTypeLabel(props.order.serviceType)
)

const pickupLine = computed(() => props.order.pickup || '—')
const destinationLine = computed(() => props.order.destination || '—')
const timeLine = computed(() => formatDateTime(props.order.createdAt))

const moneyLine = computed(() => {
  const a = props.order.amount
  return a != null ? `¥${formatMoney(a)}` : '金额 —'
})

const driverLine = computed(() => {
  const d = props.order.driverId
  if (!d) return '司机：待分配'
  const phone = typeof d === 'object' && d ? d.phone : ''
  return phone ? `司机：${maskPhone(phone)}` : '司机：已分配'
})

const canDispatch = computed(() => {
  const s = props.order.status
  return s === 'pending'
})

const canCancel = computed(() => props.order.status === 'assigned')
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.wrap {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 28rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid $admin-border;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.no {
  font-size: 28rpx;
  font-weight: 600;
  color: $admin-text;
}
.row {
  display: flex;
  margin-bottom: 8rpx;
  font-size: 26rpx;
}
.k {
  width: 100rpx;
  color: $admin-text-secondary;
}
.v {
  flex: 1;
  color: $admin-text;
}
.addr {
  font-size: 26rpx;
  color: $admin-text;
  margin-top: 8rpx;
  padding-left: 20rpx;
  position: relative;
}
.dot {
  position: absolute;
  left: 0;
  top: 14rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}
.dot.a {
  background: $admin-primary;
}
.dot.b {
  background: $admin-success;
}
.meta {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $admin-text-secondary;
}
.money {
  color: $admin-text;
  font-weight: 500;
}
.foot {
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $admin-border;
}
.driver {
  font-size: 24rpx;
  color: $admin-text-secondary;
  display: block;
  margin-bottom: 12rpx;
}
.btns {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: flex-end;
}
.btn {
  margin: 0;
  font-size: 24rpx;
  border-radius: 12rpx;
}
.btn.primary {
  background: $admin-primary;
  color: #fff;
}
.btn.ghost {
  background: #fff;
  color: $admin-primary;
  border: 1rpx solid $admin-border;
}
.btn.danger {
  background: #fff;
  color: #f04438;
  border: 1rpx solid #f04438;
}
</style>
