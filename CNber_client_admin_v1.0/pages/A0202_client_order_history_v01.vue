<template>
  <view class="order-history-page">
    <view class="title"></view>

    <scroll-view class="order-list" scroll-y="true">
      <view class="order-item" v-for="(order, index) in orders" :key="index">
        <view class="row">
          <text class="label">订单编号：</text>
          <text class="value">{{ order.orderNumber }}</text>
        </view>
        <view class="row">
          <text class="label">下单时间：</text>
          <text class="value">{{ order.orderTime }}</text>
        </view>
        <view class="row">
          <text class="label">服务类型：</text>
          <text class="value">{{ order.serviceType }}</text>
        </view>
        <view class="row">
          <text class="label">金额：</text>
          <text class="value">£{{ order.amount }}</text>
        </view>
        <button class="receipt-button" @click="downloadReceipt(order)">🧾下载收据</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const orders = ref([
  {
    orderNumber: 'CNB202405060001',
    orderTime: '2025-05-06 10:30',
    serviceType: '接机',
    amount: '88.00'
  },
  {
    orderNumber: 'CNB202405050002',
    orderTime: '2025-05-05 14:00',
    serviceType: '送机',
    amount: '120.00'
  },
  {
    orderNumber: 'CNB202405040003',
    orderTime: '2025-05-04 09:15',
    serviceType: '包车',
    amount: '200.00'
  }
])

function downloadReceipt(order) {
  uni.showToast({
    title: `收据下载中：${order.orderNumber}`,
    icon: 'none'
  })
  // 模拟下载逻辑
}
</script>

<style scoped>
.order-history-page {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 15px;
}

.title {
  font-size: 30px;
  font-weight: bold;
  margin: 10px 0 15px;
  text-align: center;
  color: #333;
}

.order-list {
  flex-grow: 1;
}

.order-item {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 20px;
}

.label {
  font-weight: 500;
  color: #333;
}

.value {
  color: #666;
}

.receipt-button {
  margin-top: 12px;
  background-color: #409eff;
  color: white;
  font-size: 20px;
  padding: 8px;
  border: none;
  border-radius: 4px;
  width: 100%;
}
</style>