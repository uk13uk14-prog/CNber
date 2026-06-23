<template>
  <view class="page">
    <view class="form">
      <view class="form-item">
        <text class="label">工单类型</text>
        <picker :range="typeLabels" :value="typeIndex" @change="onTypeChange">
          <view class="picker">{{ typeLabels[typeIndex] || '请选择' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">关联订单（可选）</text>
        <picker
          v-if="orders.length"
          :range="orderOptionLabels"
          :value="orderIndex"
          @change="onOrderChange"
        >
          <view class="picker">{{ orderOptionLabels[orderIndex] || '不关联订单' }}</view>
        </picker>
        <view v-else class="picker muted">暂无可选订单</view>
      </view>

      <view class="form-item">
        <text class="label">标题</text>
        <input v-model="title" class="input" placeholder="请简要描述问题" maxlength="80" />
      </view>

      <view class="form-item">
        <text class="label">问题描述</text>
        <textarea
          v-model="description"
          class="textarea"
          placeholder="请详细说明情况"
          maxlength="2000"
          auto-height
        />
      </view>

      <view class="form-item">
        <text class="label">优先级</text>
        <picker :range="priorityLabels" :value="priorityIndex" @change="onPriorityChange">
          <view class="picker">{{ priorityLabels[priorityIndex] || '普通' }}</view>
        </picker>
      </view>
    </view>

    <button class="submit-btn" :disabled="submitting" @click="submit">
      {{ submitting ? '提交中…' : '提交工单' }}
    </button>
  </view>
</template>

<script>
import { getDriverOrders } from '../utils/driverApi.js'
import {
  createSupportTicket,
  DRIVER_TICKET_TYPES,
  SUPPORT_TICKET_PRIORITIES,
  supportTicketTypeLabel
} from '../utils/driverSupportApi.js'

export default {
  name: 'D0402_driver_submit_ticket',
  data() {
    return {
      typeIndex: 0,
      priorityIndex: 1,
      title: '',
      description: '',
      submitting: false,
      orders: [],
      orderIndex: 0,
      linkedOrderId: '',
      linkedOrderNo: ''
    }
  },
  computed: {
    typeLabels() {
      return DRIVER_TICKET_TYPES.map((x) => x.label)
    },
    priorityLabels() {
      return SUPPORT_TICKET_PRIORITIES.map((x) => x.label)
    },
    orderPickList() {
      return [{ _id: '', orderNo: '' }, ...this.orders]
    },
    orderOptionLabels() {
      return this.orderPickList.map((o, i) => {
        if (i === 0) return '不关联订单'
        const no = o.orderNo || o._id
        const route = [o.pickup, o.destination].filter(Boolean).join(' → ')
        return route ? `${no} · ${route}` : String(no)
      })
    }
  },
  onLoad() {
    this.loadOrders()
  },
  methods: {
    onTypeChange(e) {
      this.typeIndex = Number(e.detail.value) || 0
    },
    onPriorityChange(e) {
      this.priorityIndex = Number(e.detail.value) || 0
    },
    onOrderChange(e) {
      this.orderIndex = Number(e.detail.value) || 0
      const row = this.orderPickList[this.orderIndex]
      this.linkedOrderId = row?._id ? String(row._id) : ''
      this.linkedOrderNo = row?.orderNo ? String(row.orderNo) : ''
    },
    async loadOrders() {
      try {
        const data = await getDriverOrders()
        const list = Array.isArray(data?.orders) ? data.orders : []
        this.orders = list
      } catch {
        this.orders = []
      }
    },
    async submit() {
      const type = DRIVER_TICKET_TYPES[this.typeIndex]?.value || 'other'
      const priority = SUPPORT_TICKET_PRIORITIES[this.priorityIndex]?.value || 'normal'
      const titleText = String(this.title || '').trim() || supportTicketTypeLabel(type)
      const desc = String(this.description || '').trim()

      if (!desc) {
        uni.showToast({ title: '请填写问题描述', icon: 'none' })
        return
      }

      const payload = { type, title: titleText, description: desc, priority }
      if (this.linkedOrderId) payload.orderId = this.linkedOrderId
      if (this.linkedOrderNo) payload.orderNo = this.linkedOrderNo

      this.submitting = true
      try {
        await createSupportTicket(payload)
        uni.showToast({ title: '已提交', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/D0403_driver_my_tickets' })
        }, 1200)
      } catch {
        /* request 已 toast */
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.page {
  min-height: 100vh;
  padding: 30rpx;
  background-color: $color-background;
  box-sizing: border-box;
}

.form {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.form-item {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
  color: $color-text-main;
}

.picker,
.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  background: #f5f8fc;
  border-radius: 12rpx;
  padding: 22rpx 24rpx;
  font-size: 28rpx;
}

.textarea {
  min-height: 180rpx;
}

.picker.muted {
  color: #64748b;
}

.submit-btn {
  margin-top: 36rpx;
  background-color: $color-primary;
  color: #fff;
  border-radius: 16rpx;
}
</style>
