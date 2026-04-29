<template>
  <view class="container">
    <view class="api-tip">
      说明：乘客评价需后端提供接口。当前未开通时不会冒充提交成功；接入后请在
      <text class="mono">utils/orderApi.js</text>
      将 ORDER_RATING_API_ENABLED 设为 true 并实现 POST /order/rating。
    </view>

    <view v-if="loadError" class="err-box">
      <text>{{ loadError }}</text>
    </view>

    <view v-else-if="orderDetail" class="order-head">
      <text class="oh-title">评价订单</text>
      <text class="oh-line">订单号：{{ orderIdShort }}</text>
      <text class="oh-line">行程：{{ orderDetail.pickup || '—' }} → {{ orderDetail.destination || '—' }}</text>
    </view>

    <!-- 星级评分 -->
    <view class="rating">
      <text>综合评分：</text>
      <view class="stars">
        <text
          v-for="n in 5"
          :key="n"
          @tap="onStarTap(n)"
          class="star"
          :class="{ active: n <= rating }"
        >★</text>
      </view>
    </view>

    <!-- 标签选择 -->
    <view class="tag-section">
      <text class="tag-title">评价亮点：</text>
      <view class="tags">
        <text
          v-for="tag in tagOptions"
          :key="tag"
          class="tag"
          :class="{ selected: selectedTags.includes(tag) }"
          @tap="toggleTag(tag)"
        >{{ tag }}</text>
      </view>
    </view>

    <!-- 建议填写 -->
    <view class="textarea-section">
      <text class="label">建议反馈（选填）</text>
      <textarea
        v-model="suggestion"
        :disabled="!!loadError || !orderDetail"
        placeholder="欢迎告诉我们您的建议..."
      />
    </view>

    <!-- 打赏功能（链尾未接支付，仅 UI） -->
    <view class="tip-section">
      <text class="tip-title">打赏司机（选填，支付链未接入）</text>
      <view class="tip-options">
        <view
          v-for="option in tipOptions"
          :key="option.amount"
          class="tip-option"
          :class="{ active: selectedTip === option.amount }"
          @tap="selectTip(option.amount)"
        >
          <text class="tip-emoji">{{ option.emoji }}</text>
          <text class="tip-amount">¥{{ option.amount }}</text>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <button class="submit-btn" :disabled="!!loadError || !orderDetail" @tap="submitRating">
      {{ submitLabel }}
    </button>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  fetchOrderDetail,
  submitOrderRating,
  ORDER_RATING_API_ENABLED
} from '../utils/orderApi.js'
import { normalizeOrderStatus } from '../utils/orderStatus.js'

const rating = ref(0)
const tagOptions = ['准时', '车干净', '服务好', '态度好', '价格合理']
const selectedTags = ref([])
const suggestion = ref('')
const selectedTip = ref(null)
const orderId = ref('')
const orderDetail = ref(null)
const loadError = ref('')

const tipOptions = [
  { amount: 2, emoji: '🥤' },
  { amount: 5, emoji: '🍱' },
  { amount: 10, emoji: '☕' }
]

const orderIdShort = computed(() => {
  const id = orderId.value
  if (!id) return '—'
  return id.length > 14 ? `${id.slice(0, 10)}…` : id
})

const submitLabel = computed(() => {
  if (!ORDER_RATING_API_ENABLED) return '提交评价（待接口接入）'
  return selectedTip.value ? `提交评价（¥${selectedTip.value} 打赏）` : '提交评价'
})

function onStarTap(n) {
  if (loadError.value || !orderDetail.value) return
  rating.value = n
}

async function loadOrder() {
  loadError.value = ''
  orderDetail.value = null
  if (!orderId.value) {
    loadError.value = '缺少参数 orderId，请从「行程完成」页进入评价'
    return
  }
  try {
    const data = await fetchOrderDetail(orderId.value)
    const o = data && data.order
    if (!o) {
      loadError.value = '无法加载订单'
      return
    }
    if (normalizeOrderStatus(o.status) !== 'completed') {
      loadError.value = '仅「已完成」订单可评价；已取消或其它状态请查看订单历史。'
      return
    }
    orderDetail.value = o
  } catch {
    loadError.value = '加载订单失败，请检查网络或重新登录'
  }
}

onLoad((query) => {
  orderId.value = (query && query.orderId ? String(query.orderId) : '').trim()
  loadOrder()
})

function toggleTag(tag) {
  if (loadError.value || !orderDetail.value) return
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

function selectTip(amount) {
  if (loadError.value || !orderDetail.value) return
  selectedTip.value = selectedTip.value === amount ? null : amount
}

async function submitRating() {
  if (!orderDetail.value || loadError.value) return
  if (rating.value === 0) {
    uni.showToast({ title: '请先评分', icon: 'none' })
    return
  }
  if (selectedTip.value != null) {
    uni.showModal({
      title: '打赏未接入',
      content: '打赏与支付尚未接入，无法随评价发起真实扣款。请先取消打赏选项；仅评价将在接口就绪后提交。',
      showCancel: false
    })
    return
  }

  uni.showLoading({ title: '处理中…' })
  try {
    await submitOrderRating({
      orderId: orderId.value,
      stars: rating.value,
      tags: [...selectedTags.value],
      comment: String(suggestion.value || '').trim()
    })
    uni.hideLoading()
    uni.showToast({ title: '评价已提交', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/A0202_client_order_history_v01' })
    }, 1200)
  } catch (e) {
    uni.hideLoading()
    const msg = (e && e.message) || String(e || '')
    if (msg.includes('RATING_API_NOT_IMPLEMENTED') || msg.includes('RATING_API')) {
      uni.showModal({
        title: '评价接口未开通',
        content:
          '后端尚未提供乘客评价写入接口，本次不会保存任何评价数据，也不会提示虚假成功。验收通过后请在 CNber_backend 增加评价 API，并把 orderApi.js 中 ORDER_RATING_API_ENABLED 改为 true。',
        showCancel: false
      })
      return
    }
    uni.showToast({ title: msg || '提交失败', icon: 'none' })
  }
}
</script>

<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 40rpx 30rpx;
}

.api-tip {
  font-size: 24rpx;
  color: #444;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  line-height: 1.55;
}

.mono {
  font-family: monospace;
}

.err-box {
  background: #ffe8e8;
  color: #a40000;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  font-size: 28rpx;
}

.order-head {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 28rpx;
}

.oh-title {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  color: #222;
}

.oh-line {
  display: block;
  font-size: 26rpx;
  color: #555;
  margin-bottom: 8rpx;
  line-height: 1.45;
}

/* 星级评分 */
.rating {
  margin-bottom: 40rpx;
  font-size: 66rpx;
  text-align: center;
  font-weight: bold;
}
.stars {
  margin-top: 20rpx;
}
.star {
  font-size: 68rpx;
  color: #ccc;
  margin: 0 5rpx;
}
.star.active {
  color: #ffcc00;
}

/* 标签选择 */
.tag-section {
  margin-bottom: 40rpx;
}
.tag-title {
  display: block;
  font-size: 38rpx;
  margin-bottom: 30rpx;
  font-weight: bold;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 17rpx;
}

.tag {
  width: 120rpx;
  text-align: center;
  background: #eee;
  border-radius: 20rpx;
  font-size: 25rpx;
  color: #333;
  padding: 10rpx;
  box-sizing: border-box;
  transition: background 0.2s;
}

.tag.selected {
  background: #007aff;
  color: white;
}

/* 建议 */
.textarea-section {
  margin-bottom: 20rpx;
  width: 95%;
}
.label {
  display: block;
  font-size: 32rpx;
  margin-bottom: 10rpx;
  font-weight: bold;
}
textarea {
  width: 98%;
  min-height: 100rpx;
  border-radius: 12rpx;
  background: #f9f9f9;
  padding: 20rpx;
  font-size: 28rpx;
  border: 1rpx solid #ccc;
  resize: none;
}

/* 打赏样式 */
.tip-section {
  margin-bottom: 40rpx;
}
.tip-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
}
.tip-options {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}
.tip-option {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid #eee;
  transition: all 0.3s;
}
.tip-option.active {
  border-color: #ff9500;
  background: #fff8e6;
  transform: scale(1.05);
}
.tip-emoji {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}
.tip-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff9500;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  margin: 20rpx auto;
  padding: 18rpx 0;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  text-align: center;
  border-radius: 20rpx;
  color: white;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn:disabled {
  opacity: 0.5;
}
</style>
