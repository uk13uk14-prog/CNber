<template>
  <view class="order-detail-page">
    <view v-if="loading" class="muted">加载中…</view>
    <view v-else-if="err" class="err">{{ err }}</view>
    <template v-else-if="order._id">
      <view class="section">
        <view class="label">订单状态</view>
        <view class="value status-line">
          <text class="badge">{{ formatStatus(order.status) }}</text>
          <text v-if="isAssignedToMe" class="hint">已指派（待你确认）</text>
        </view>
      </view>

      <view class="section">
        <view class="label">乘客手机</view>
        <view class="value">{{ passengerPhone }}</view>
      </view>

      <view class="section">
        <view class="label">出发地点</view>
        <view class="value">{{ order.pickup }}</view>
      </view>

      <view class="section">
        <view class="label">目的地点</view>
        <view class="value">{{ order.destination }}</view>
      </view>

      <view class="section">
        <view class="label">下单时间</view>
        <view class="value">{{ formatTime(order.createdAt) }}</view>
      </view>

      <view class="section" v-if="order.amount != null">
        <view class="label">订单金额</view>
        <view class="value price">{{ formatAmount(order.amount) }}</view>
      </view>

      <view class="section">
        <view class="label">支付状态</view>
        <view class="value">{{ formatPaymentStatus(order.paymentStatus) }}</view>
      </view>

      <view class="button-group">
        <button class="btn-outline" @click="contact">联系乘客</button>
        <button
          v-if="order.status === 'pending'"
          class="btn-primary"
          :disabled="acting"
          @click="doAccept"
        >
          抢单
        </button>
        <button
          v-else-if="isAssignedToMe"
          class="btn-primary"
          :disabled="acting"
          @click="doAccept"
        >
          确认接单
        </button>
        <button
          v-if="isAssignedToMe"
          class="btn-outline"
          :disabled="acting"
          @click="doReject"
        >
          拒单
        </button>
        <button
          v-else-if="normalizedOrderStatus === 'accepted'"
          class="btn-primary"
          :disabled="acting || order.paymentStatus !== 'paid'"
          @click="doStart"
        >
          开始行程
        </button>
        <button
          v-else-if="normalizedOrderStatus === 'started'"
          class="btn-primary"
          :disabled="acting"
          @click="doComplete"
        >
          完成订单
        </button>
        <button
          v-if="normalizedOrderStatus === 'accepted' || normalizedOrderStatus === 'started'"
          class="btn-outline"
          :disabled="acting"
          @click="doCancel"
        >
          取消订单
        </button>
      </view>
    </template>
  </view>
</template>

<script>
import { request } from '../utils/request.js'
import { formatDriverOrderStatus } from '../utils/orderStatus.js'

export default {
  name: 'D0102_driver_order_detail',
  data() {
    return {
      orderId: '',
      order: {},
      loading: false,
      err: '',
      acting: false,
      myUserId: ''
    }
  },
  computed: {
    passengerPhone() {
      const u = this.order.userId
      if (u && typeof u === 'object' && u.phone) return u.phone
      return '—'
    },
    normalizedOrderStatus() {
      return this.normalizeStatus(this.order.status)
    },
    isAssignedToMe() {
      if (this.normalizedOrderStatus !== 'assigned' || !this.myUserId) return false
      const d = this.order.driverId
      if (!d) return false
      const id = typeof d === 'object' && d._id != null ? String(d._id) : String(d)
      return id === this.myUserId
    }
  },
  onLoad(query) {
    this.orderId = query.id ? String(query.id) : ''
    this.readMyId()
  },
  onShow() {
    this.readMyId()
    if (this.orderId) this.loadOrder()
  },
  methods: {
    readMyId() {
      try {
        const u = uni.getStorageSync('user')
        if (u && u._id) this.myUserId = String(u._id)
      } catch (e) {
        this.myUserId = ''
      }
    },
    formatStatus(s) {
      return formatDriverOrderStatus(s)
    },
    normalizeStatus(status) {
      const s = String(status || '').trim()
      if (s === 'ongoing' || s === 'in_progress') return 'started'
      return s
    },
    formatTime(iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
    },
    formatAmount(amount) {
      if (amount == null || amount === '') return '—'
      const n = Number(amount)
      return Number.isFinite(n) ? `£${n.toFixed(2)}` : String(amount)
    },
    formatPaymentStatus(status) {
      const map = {
        unpaid: '未支付',
        pending: '待支付',
        paid: '已支付',
        refunded: '已退款'
      }
      return map[status || 'unpaid'] || status
    },
    async loadOrder() {
      this.loading = true
      this.err = ''
      try {
        const data = await request({
          url: `/order/detail/${this.orderId}`,
          method: 'GET'
        })
        this.order = data.order || {}
      } catch (e) {
        this.err = (e && e.message) || '加载失败'
        this.order = {}
      } finally {
        this.loading = false
      }
    },
    contact() {
      const p = this.passengerPhone
      if (p && p !== '—') {
        uni.showModal({
          title: '联系乘客',
          content: `请拨打：${p}`,
          showCancel: false
        })
      } else {
        uni.showToast({ title: '暂无号码', icon: 'none' })
      }
    },
    async doAccept() {
      await this.runAction('/order/accept', '接单成功')
    },
    async doStart() {
      if (this.order.paymentStatus !== 'paid') {
        uni.showToast({ title: '用户未支付，不能开始行程', icon: 'none' })
        return
      }
      await this.runAction('/order/start', '行程已开始')
    },
    async doComplete() {
      await this.runAction('/order/complete', '订单已完成')
    },
    async doReject() {
      uni.showModal({
        title: '确认拒单',
        content: '拒单后订单将回到可接单池',
        success: async (res) => {
          if (res.confirm) {
            await this.runAction('/order/reject', '已拒单', true)
          }
        }
      })
    },
    async doCancel() {
      uni.showModal({
        title: '确认取消',
        content: '取消后订单将进入已取消状态',
        success: async (res) => {
          if (res.confirm) {
            await this.runAction('/order/cancel', '订单已取消', true)
          }
        }
      })
    },
    backToList() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1 })
      } else {
        uni.redirectTo({ url: '/pages/D0101_driver_order_list' })
      }
    },
    async runAction(path, okText, backAfterSuccess = false) {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      this.acting = true
      try {
        await request({
          url: path,
          method: 'POST',
          data: { orderId: this.orderId }
        })
        uni.showToast({ title: okText, icon: 'success' })
        if (backAfterSuccess) {
          this.backToList()
        } else {
          await this.loadOrder()
        }
      } catch (e) {
        /* request 已 toast */
      } finally {
        this.acting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.order-detail-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .muted {
    color: $color-text-light;
    font-size: 28rpx;
  }

  .err {
    color: #c62828;
    font-size: 28rpx;
  }

  .section {
    margin-bottom: 24rpx;
    .label {
      font-size: 28rpx;
      color: $color-text-light;
    }
    .value {
      font-size: 32rpx;
      color: $color-text-main;
      margin-top: 6rpx;
    }
    .price {
      color: $color-primary;
      font-weight: bold;
    }
  }

  .status-line {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8rpx;
  }

  .badge {
    background: #e3f2fd;
    color: #1565c0;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    font-size: 26rpx;
  }

  .hint {
    font-size: 24rpx;
    color: #e65100;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    margin-top: 40rpx;
    gap: 20rpx;

    .btn-outline {
      border: 2rpx solid $color-primary;
      color: $color-primary;
      background-color: white;
      border-radius: 12rpx;
      padding: 20rpx 0;
      font-size: 30rpx;
    }

    .btn-primary {
      background-color: $color-primary;
      color: white;
      border-radius: 12rpx;
      padding: 20rpx 0;
      font-size: 30rpx;
    }
  }
}
</style>
