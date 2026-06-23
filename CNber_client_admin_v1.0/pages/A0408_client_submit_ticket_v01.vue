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
        <view v-else class="picker muted">{{ linkedOrderHint }}</view>
      </view>

      <view class="form-item">
        <text class="label">标题</text>
        <input v-model="title" class="input" placeholder="请简要描述您的问题" maxlength="80" />
      </view>

      <view class="form-item">
        <text class="label">问题描述</text>
        <textarea
          v-model="description"
          class="textarea"
          placeholder="请详细说明情况，便于客服处理"
          maxlength="2000"
          auto-height
        />
      </view>

      <view class="form-item">
        <text class="label">紧急程度</text>
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

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchOrderList } from '../utils/orderApi.js'
import {
  createSupportTicket,
  SUPPORT_TICKET_TYPES,
  SUPPORT_TICKET_PRIORITIES,
  supportTicketTypeLabel
} from '../utils/supportApi.js'

const typeIndex = ref(0)
const priorityIndex = ref(1)
const title = ref('')
const description = ref('')
const submitting = ref(false)
const returnTo = ref('')

const linkedOrderId = ref('')
const linkedOrderNo = ref('')
const orders = ref([])
const orderIndex = ref(0)

const typeLabels = SUPPORT_TICKET_TYPES.map((x) => x.label)
const priorityLabels = SUPPORT_TICKET_PRIORITIES.map((x) => x.label)

const orderPickList = computed(() => [{ _id: '', orderNo: '' }, ...orders.value])

const orderOptionLabels = computed(() =>
  orderPickList.value.map((o, i) => {
    if (i === 0) return '不关联订单'
    const no = o.orderNo || o._id
    const route = [o.pickup, o.destination].filter(Boolean).join(' → ')
    return route ? `${no} · ${route}` : String(no)
  })
)

const linkedOrderHint = computed(() => {
  if (linkedOrderId.value) {
    return linkedOrderNo.value
      ? `已关联订单 ${linkedOrderNo.value}`
      : `已关联订单 ${linkedOrderId.value}`
  }
  return '暂无可选订单，可不关联'
})

function setTypeByValue(value) {
  const idx = SUPPORT_TICKET_TYPES.findIndex((x) => x.value === value)
  if (idx >= 0) typeIndex.value = idx
}

function onTypeChange(e) {
  typeIndex.value = Number(e.detail.value) || 0
}

function onPriorityChange(e) {
  priorityIndex.value = Number(e.detail.value) || 0
}

function onOrderChange(e) {
  orderIndex.value = Number(e.detail.value) || 0
  const row = orderPickList.value[orderIndex.value]
  linkedOrderId.value = row?._id ? String(row._id) : ''
  linkedOrderNo.value = row?.orderNo ? String(row.orderNo) : ''
}

function defaultTitleForType(type) {
  return supportTicketTypeLabel(type)
}

async function loadOrders() {
  const token = uni.getStorageSync('token')
  if (!token) return
  try {
    const data = await fetchOrderList()
    const list = Array.isArray(data?.orders) ? data.orders : []
    orders.value = list
    if (linkedOrderId.value) {
      const idx = list.findIndex((o) => String(o._id) === String(linkedOrderId.value))
      orderIndex.value = idx >= 0 ? idx + 1 : 0
    } else {
      orderIndex.value = 0
    }
  } catch {
    orders.value = []
  }
}

async function submit() {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/A0002_client_login_v01' })
    }, 600)
    return
  }

  const type = SUPPORT_TICKET_TYPES[typeIndex.value]?.value || 'other'
  const priority = SUPPORT_TICKET_PRIORITIES[priorityIndex.value]?.value || 'normal'
  const titleText = String(title.value || '').trim() || defaultTitleForType(type)
  const desc = String(description.value || '').trim()

  if (!desc) {
    uni.showToast({ title: '请填写问题描述', icon: 'none' })
    return
  }

  const payload = { type, title: titleText, description: desc, priority }
  if (linkedOrderId.value) payload.orderId = linkedOrderId.value
  if (linkedOrderNo.value) payload.orderNo = linkedOrderNo.value

  submitting.value = true
  try {
    await createSupportTicket(payload)
    uni.showToast({ title: '已提交，客服会尽快处理', icon: 'success', duration: 2500 })
    setTimeout(() => {
      if (returnTo.value === 'order' && linkedOrderId.value) {
        uni.navigateBack({ delta: 1 })
      } else if (returnTo.value === 'help') {
        uni.redirectTo({ url: '/pages/A0403_client_help_center_v01' })
      } else {
        uni.navigateBack({ delta: 1 })
      }
    }, 1600)
  } catch {
    /* request 已 toast */
  } finally {
    submitting.value = false
  }
}

onLoad((query) => {
  try {
    const type = String(query?.type || '').trim()
    if (type) setTypeByValue(type)
    if (query?.orderId) linkedOrderId.value = decodeURIComponent(String(query.orderId))
    if (query?.orderNo) linkedOrderNo.value = decodeURIComponent(String(query.orderNo))
    if (query?.returnTo) returnTo.value = String(query.returnTo)
    if (!title.value && type) title.value = defaultTitleForType(type)

    const token = uni.getStorageSync('token')
    if (!token) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/A0002_client_login_v01' })
      }, 600)
      return
    }
    loadOrders()
  } catch (e) {
    uni.showToast({ title: '页面加载失败', icon: 'none' })
    console.error('[A0408 onLoad]', e)
  }
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 32rpx 48rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  box-sizing: border-box;
}

.form {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.form-item {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 12rpx;
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
  color: #333;
}

.textarea {
  min-height: 180rpx;
}

.picker.muted {
  color: #666;
}

.submit-btn {
  margin-top: 36rpx;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
  padding: 8rpx 0;
}

.submit-btn[disabled] {
  opacity: 0.65;
}
</style>
