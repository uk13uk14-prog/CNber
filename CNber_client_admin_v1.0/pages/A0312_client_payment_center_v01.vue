<template>
  <view class="payment-center">
    <view class="header"></view>

    <!-- 状态筛选 -->
    <view class="tab-group">
      <view
        v-for="(item, idx) in statusTabs"
        :key="idx"
        :class="['tab-item', currentTab === item ? 'active' : '']"
        @click="currentTab = item"
      >
        {{ item }}
      </view>
    </view>

    <!-- 最近支付记录 -->
    <view class="section">
      <text class="section-title">支付记录</text>
      <view v-if="filteredPayments.length > 0">
        <view
          v-for="(item, index) in filteredPayments"
          :key="index"
          class="record-item"
        >
          <text>{{ item.date }} - ¥{{ item.amount }}</text>
          <text class="status" :class="statusClass(item.status)">
            {{ item.status }}
          </text>
        </view>
      </view>
      <view v-else class="no-data">暂无此类订单</view>
    </view>

    <!-- 支付方式管理 -->
    <view class="section">
      <text class="section-title">支付方式</text>

      <view class="payment-item" v-for="(method, index) in methods" :key="index">
        <image :src="method.icon" class="icon" />
        <view class="text">{{ method.name }}</view>
        <switch :checked="method.active" @change="toggleMethod(index)" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

// 所有支付记录
const payments = ref([
  { date: '2025-05-05', amount: 58.0, status: '已支付' },
  { date: '2025-05-07', amount: 42.0, status: '待支付' },
  { date: '2025-05-01', amount: 100.0, status: '已超时' },
  { date: '2025-04-29', amount: 88.0, status: '已支付' }
])

// 筛选标签
const statusTabs = ['全部', '已支付', '待支付', '已超时']
const currentTab = ref('全部')

// 过滤后的记录
const filteredPayments = computed(() => {
  if (currentTab.value === '全部') return payments.value
  return payments.value.filter(p => p.status === currentTab.value)
})

// 状态样式
const statusClass = status => {
  if (status === '已支付') return 'status-paid'
  if (status === '待支付') return 'status-pending'
  if (status === '已超时') return 'status-expired'
  return ''
}

// 支付方式
const methods = ref([
  { name: '微信支付', icon: '/static/icons/wechat.png', active: true },
  { name: '支付宝支付', icon: '/static/icons/alipay.png', active: false }
])

const toggleMethod = (index) => {
  methods.value[index].active = !methods.value[index].active
  uni.showToast({ title: methods.value[index].active ? '启用成功' : '已关闭', icon: 'success' })
}
</script>

<style scoped>
.payment-center {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 30rpx;
}
.header {
  text-align: center;
  font-size: 46rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.tab-group {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30rpx;
  gap: 10rpx;
  flex-wrap: wrap;
}
.tab-item {
  width: 160rpx;
  height: 80rpx;
  background: #e6f7ff;
  border-radius: 60rpx;
  font-size: 26rpx;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}
.tab-item.active {
  background: #007aff;
  color: white;
  font-weight: bold;
}

.section {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.05);
}
.section-title {
  font-size: 38rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  display: block;
}

.record-item {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 2rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.status {
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
}
.status-paid {
  background-color: #e0f9eb;
  color: #38c172;
}
.status-pending {
  background-color: #fff4d9;
  color: #f39c12;
}
.status-expired {
  background-color: #ffeaea;
  color: #e74c3c;
}
.no-data {
  text-align: center;
  color: #999;
  font-size: 24rpx;
  padding: 30rpx 0;
}

.payment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #eee;
}
.icon {
  width: 48rpx;
  height: 48rpx;
}
.text {
  font-size: 30rpx;
  color: #111;
  margin-left: 20rpx;
}
</style>
