<template>
  <view class="container">
    <view v-if="loadError" class="err-box">
      <text>{{ loadError }}</text>
    </view>

    <view v-else-if="alreadyRated && existingRating" class="rated-box">
      <text class="rated-title">已评价</text>
      <view class="order-head">
        <text class="oh-line">订单号：{{ orderIdShort }}</text>
        <text class="oh-line">司机评分：{{ existingRating.driverStars }} 星</text>
        <text class="oh-line">服务评分：{{ existingRating.serviceStars }} 星</text>
        <text v-if="existingRating.comment" class="oh-line">评价：{{ existingRating.comment }}</text>
        <view v-if="existingRating.tags?.length" class="tags-readonly">
          <text v-for="tag in existingRating.tags" :key="tag" class="tag-chip">{{ tag }}</text>
        </view>
      </view>
      <button class="submit-btn" @tap="goHistory">返回订单历史</button>
    </view>

    <template v-else-if="orderDetail">
      <view class="order-head">
        <text class="oh-title">评价订单</text>
        <text class="oh-line">订单号：{{ orderIdShort }}</text>
        <text class="oh-line">行程：{{ orderDetail.pickup || '—' }} → {{ orderDetail.destination || '—' }}</text>
      </view>

      <view class="rating-block">
        <text class="block-label">司机评分</text>
        <view class="stars">
          <text
            v-for="n in 5"
            :key="'d' + n"
            class="star"
            :class="{ active: n <= driverStars }"
            @tap="driverStars = n"
          >★</text>
        </view>
      </view>

      <view class="rating-block">
        <text class="block-label">服务评分</text>
        <view class="stars">
          <text
            v-for="n in 5"
            :key="'s' + n"
            class="star"
            :class="{ active: n <= serviceStars }"
            @tap="serviceStars = n"
          >★</text>
        </view>
      </view>

      <view class="tag-section">
        <text class="tag-title">评价标签（可多选）</text>
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

      <view class="textarea-section">
        <text class="label">文字评价（选填）</text>
        <textarea v-model="comment" placeholder="欢迎分享您的乘车体验…" />
      </view>

      <button class="submit-btn" :disabled="submitting" @tap="submitRating">
        {{ submitting ? '提交中…' : '提交评价' }}
      </button>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  fetchOrderDetail,
  fetchOrderRating,
  submitOrderRating,
  RATING_TAG_OPTIONS
} from '../utils/orderApi.js'
import { normalizeOrderStatus } from '../utils/orderStatus.js'

const driverStars = ref(0)
const serviceStars = ref(0)
const tagOptions = RATING_TAG_OPTIONS
const selectedTags = ref([])
const comment = ref('')
const orderId = ref('')
const orderDetail = ref(null)
const existingRating = ref(null)
const alreadyRated = ref(false)
const loadError = ref('')
const submitting = ref(false)

const orderIdShort = computed(() => {
  const id = orderId.value
  if (!id) return '—'
  return id.length > 14 ? `${id.slice(0, 10)}…` : id
})

async function loadOrder() {
  loadError.value = ''
  orderDetail.value = null
  existingRating.value = null
  alreadyRated.value = false

  if (!orderId.value) {
    loadError.value = '缺少参数 orderId，请从「行程完成」或订单历史进入'
    return
  }

  try {
    const [detailData, ratingData] = await Promise.all([
      fetchOrderDetail(orderId.value),
      fetchOrderRating(orderId.value).catch(() => null)
    ])

    const o = detailData?.order
    if (!o) {
      loadError.value = '无法加载订单'
      return
    }

    if (normalizeOrderStatus(o.status) !== 'completed') {
      loadError.value = '仅「已完成」订单可评价'
      return
    }

    if (ratingData?.rating || o.ratingStatus === 'rated') {
      alreadyRated.value = true
      existingRating.value = ratingData?.rating || null
      orderDetail.value = o
      return
    }

    orderDetail.value = o
  } catch {
    loadError.value = '加载订单失败，请检查网络或重新登录'
  }
}

onLoad((query) => {
  orderId.value = (query?.orderId ? String(query.orderId) : '').trim()
  loadOrder()
})

function toggleTag(tag) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) selectedTags.value.splice(index, 1)
  else selectedTags.value.push(tag)
}

function goHistory() {
  uni.redirectTo({ url: '/pages/A0202_client_order_history_v01' })
}

async function submitRating() {
  if (!orderDetail.value || alreadyRated.value) return
  if (driverStars.value < 1 || serviceStars.value < 1) {
    uni.showToast({ title: '请完成司机与服务评分', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await submitOrderRating({
      orderId: orderId.value,
      driverStars: driverStars.value,
      serviceStars: serviceStars.value,
      tags: [...selectedTags.value],
      comment: String(comment.value || '').trim()
    })
    uni.showToast({ title: '评价已提交，感谢您的反馈', icon: 'success' })
    setTimeout(() => goHistory(), 1200)
  } catch (e) {
    const msg = (e && e.message) || '提交失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 40rpx 30rpx;
}

.err-box,
.rated-box {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.err-box {
  color: #a40000;
  font-size: 28rpx;
}

.rated-title {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  color: #047857;
  margin-bottom: 20rpx;
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

.rating-block {
  margin-bottom: 32rpx;
  text-align: center;
}

.block-label {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  color: #333;
}

.stars {
  margin-top: 8rpx;
}

.star {
  font-size: 64rpx;
  color: #ccc;
  margin: 0 6rpx;
}

.star.active {
  color: #ffcc00;
}

.tag-section {
  margin-bottom: 32rpx;
}

.tag-title,
.label {
  display: block;
  font-size: 30rpx;
  margin-bottom: 20rpx;
  font-weight: bold;
}

.tags,
.tags-readonly {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag {
  padding: 12rpx 20rpx;
  background: #eee;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #333;
}

.tag.selected,
.tag-chip {
  background: #007aff;
  color: #fff;
}

.tag-chip {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
}

.textarea-section {
  margin-bottom: 32rpx;
}

textarea {
  width: 100%;
  min-height: 160rpx;
  border-radius: 12rpx;
  background: #f9f9f9;
  padding: 20rpx;
  font-size: 28rpx;
  border: 1rpx solid #ddd;
  box-sizing: border-box;
}

.submit-btn {
  width: 100%;
  padding: 18rpx 0;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  text-align: center;
  border-radius: 20rpx;
  color: white;
  font-size: 28rpx;
  font-weight: bold;
}

.submit-btn:disabled {
  opacity: 0.55;
}
</style>
