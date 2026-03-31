<template>
  <view class="order-list-page">
    <view class="title">订单列表</view>

    <view v-for="order in orders" :key="order._id" class="order-card" @click="goDetail(order._id)">
      <view class="location">
        <text class="label">出发：</text>
        <text>{{ order.pickup }}</text>
      </view>
      <view class="location">
        <text class="label">目的：</text>
        <text>{{ order.destination }}</text>
      </view>
      <view class="status-row">
        <text class="label">状态：</text>
        <text class="status">{{ formatStatus(order.status) }}</text>
      </view>
      <view class="actions">
        <button
          v-if="order.status === 'pending'"
          class="action-btn accept-btn"
          @click.stop="acceptOrder(order._id)"
        >
          接单
        </button>
        <button
          v-else-if="order.status === 'accepted'"
          class="action-btn start-btn"
          @click.stop="startOrder(order._id)"
        >
          开始行程
        </button>
        <button
          v-else-if="order.status === 'ongoing'"
          class="action-btn complete-btn"
          @click.stop="completeOrder(order._id)"
        >
          完成订单
        </button>
      </view>
    </view>

    <view v-if="orders.length === 0" class="empty">暂无可接订单</view>
  </view>
</template>

<script>
import { BASE_URL } from '../config/api.js'

export default {
  name: 'D0101_driver_order_list',
  data() {
    return {
      orders: []
    }
  },
  onShow() {
    this.fetchOrders()
  },
  methods: {
    async fetchOrders() {
      const token = uni.getStorageSync('token')

      if (!token) {
        uni.showToast({ title: '请先登录司机账号', icon: 'none' })
        return
      }

      try {
        const [error, res] = await uni.request({
          url: `${BASE_URL}/order/list`,
          method: 'GET',
          header: {
            Authorization: `Bearer ${token}`
          }
        })

        if (error) {
          throw error
        }

        this.orders = Array.isArray(res.data?.orders) ? res.data.orders : []
      } catch (error) {
        uni.showToast({ title: '获取订单失败', icon: 'none' })
      }
    },
    formatStatus(status) {
      const statusMap = {
        pending: '待接单',
        accepted: '已接单',
        ongoing: '进行中',
        completed: '已完成'
      }
      return statusMap[status] || status || '未知状态'
    },
    async acceptOrder(orderId) {
      this.updateOrderStatus('/order/accept', orderId, '接单成功', '接单失败')
    },
    async startOrder(orderId) {
      this.updateOrderStatus('/order/start', orderId, '行程已开始', '开始行程失败')
    },
    async completeOrder(orderId) {
      this.updateOrderStatus('/order/complete', orderId, '订单已完成', '完成订单失败')
    },
    async updateOrderStatus(path, orderId, successText, failText) {
      const token = uni.getStorageSync('token')

      if (!token) {
        uni.showToast({ title: '请先登录司机账号', icon: 'none' })
        return
      }

      try {
        const [error, res] = await uni.request({
          url: `${BASE_URL}${path}`,
          method: 'POST',
          header: {
            Authorization: `Bearer ${token}`
          },
          data: {
            orderId
          }
        })

        if (error) {
          throw error
        }

        if (res.statusCode === 200) {
          uni.showToast({ title: successText, icon: 'success' })
          this.fetchOrders()
          return
        }

        uni.showToast({ title: res.data?.message || failText, icon: 'none' })
      } catch (error) {
        uni.showToast({ title: failText, icon: 'none' })
      }
    },
    goDetail(id) {
      uni.navigateTo({
        url: `/pages/D0102_driver_order_detail?id=${id}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.order-list-page {
  background: -webkit-linear-gradient(to right, #FFEB3B, #FF9800);
  background: linear-gradient(to right, #FFEB3B, #FF9800);
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #FF5722;  // 主色
    margin-bottom: 30rpx;
  }

  .order-card {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
    border: 1rpx solid #e0e0e0;  // 分割线颜色

    .location {
      font-size: 28rpx;
      margin-bottom: 12rpx;
      color: #212121;  // 主文本颜色

      .label {
        font-weight: bold;
        color: #FF5722;  // 主色
      }
    }

    .status-row {
      margin-top: 10rpx;
      font-size: 26rpx;
      color: #757575;  // 辅助文本颜色

      .status {
        font-weight: bold;
        color: #FF5722;  // 主色
      }
    }

    .actions {
      margin-top: 24rpx;
      display: flex;
      justify-content: flex-end;
      gap: 16rpx;
    }

    .action-btn {
      color: #fff;
      border: none;
      border-radius: 40rpx;
      font-size: 26rpx;
      padding: 0 32rpx;
      line-height: 72rpx;
    }

    .accept-btn {
      background-color: #FF5722;
    }

    .start-btn {
      background-color: #007aff;
    }

    .complete-btn {
      background-color: #34c759;
    }
  }

  .empty {
    text-align: center;
    color: #757575;  // 辅助文本颜色
    margin-top: 100rpx;
    font-size: 30rpx;
  }
}
</style>