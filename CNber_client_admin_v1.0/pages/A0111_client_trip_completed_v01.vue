<template>
  <view class="container">
    <!-- 行程完成图标 -->
    <image class="icon" src="/static/complete_icon.png" mode="widthFix" />

    <!-- 文案 -->
    <text class="title"></text>
    <template v-if="isCompletedOrder">
      <text class="desc">感谢您使用</text>
      <text class="desc">中步出行</text>
      <text class="desc">订单已完成</text>
      <text class="desc">我们下次再约！</text>
    </template>
    <template v-else>
      <text class="desc muted-strong">正在同步订单状态…</text>
    </template>

    <view v-if="order" class="order-brief">
      <text class="brief-line">状态：{{ statusLabel }}</text>
      <text class="brief-line">出发：{{ order.pickup || '—' }}</text>
      <text class="brief-line">到达：{{ order.destination || '—' }}</text>
    </view>

    <!-- 按钮组 -->
    <view class="button-group">
      <button class="btn btn-home" @click="goHome">返回首页</button>
      <button
        class="btn btn-rate"
        :disabled="!canGoRating"
        @click="goRating"
      >
        {{ ratingButtonLabel }}
      </button>
      <button class="btn btn-history" @click="goOrderHistory">订单历史</button>
    </view>

    <!-- 捐赠提示 -->
    <view class="donate-box" @click="goDonate">
      <text class="donate-text">
        ❤️ 您每完成一笔订单，我们将捐出   1元给慈善基金。
        <text class="donate-link">点击了解更多 ></text>
      </text>
    </view>
  </view>
</template>


<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { fetchOrderList, fetchOrderRating } from '../utils/orderApi.js'
import { clientOrderStatusLabel, normalizeOrderStatus } from '../utils/orderStatus.js'
import { pickActiveOrder, applyClientOrderRoute } from '../utils/orderFlow.js'

const order = ref(null)
const lastFlowSlot = ref('')
const ratingStatus = ref('unrated')
let pollingTimer = null

const statusLabel = computed(() => clientOrderStatusLabel(order.value?.status))

const isCompletedOrder = computed(
  () => normalizeOrderStatus(order.value?.status) === 'completed'
)

const canGoRating = computed(
  () => !!(order.value && order.value._id && isCompletedOrder.value)
)

const ratingButtonLabel = computed(() => {
  if (ratingStatus.value === 'rated') return '查看评价'
  return '评价司机'
})

const fetchOrders = async () => {
  const token = uni.getStorageSync('token')

  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    const data = await fetchOrderList()

    const orders = Array.isArray(data?.orders) ? data.orders : []
    order.value = pickActiveOrder(orders)
    applyClientOrderRoute(order.value, lastFlowSlot)
    if (order.value?._id && normalizeOrderStatus(order.value.status) === 'completed') {
      try {
        const rd = await fetchOrderRating(order.value._id)
        ratingStatus.value = rd?.ratingStatus === 'rated' || rd?.rating ? 'rated' : 'unrated'
      } catch {
        ratingStatus.value = order.value.ratingStatus === 'rated' ? 'rated' : 'unrated'
      }
    } else {
      ratingStatus.value = 'unrated'
    }
  } catch (error) {
    uni.showToast({ title: '获取订单失败', icon: 'none' })
  }
}

const startPolling = () => {
  if (pollingTimer) clearInterval(pollingTimer)
  fetchOrders()
  pollingTimer = setInterval(() => {
    fetchOrders()
  }, 5000)
}

const goHome = () => {
  uni.reLaunch({
    url: '/pages/A0300_client_main_v01'
  })
}

const goRating = () => {
  if (!canGoRating.value) {
    uni.showToast({ title: '仅已完成订单可评价', icon: 'none' })
    return
  }
  const id = String(order.value._id)
  uni.navigateTo({
    url: `/pages/A0201_client_rating_v01?orderId=${encodeURIComponent(id)}`
  })
}

const goOrderHistory = () => {
  uni.navigateTo({
    url: '/pages/A0202_client_order_history_v01'
  })
}

const goDonate = () => {
  uni.showModal({
    title: '公益捐赠说明',
    content: '我们承诺：每完成一笔行程订单，平台将捐赠 1 元人民币给慈善基金，用于帮助困难家庭、儿童教育及灾区援助等公益项目。感谢您的每一次出行，温暖将伴随每一程。'
  })
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0 20px 20px;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  box-sizing: border-box;
}

.icon {
  width: 140px;
  margin-top: 0;
  margin-bottom: 20px;
}
.desc {
  font-size: 33px; /* 放大副标题 */
  color: #555;
  margin-bottom: 24px;
}

.muted-strong {
  color: #888;
  font-size: 28rpx;
}

.order-brief {
  width: 100%;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

.brief-line {
  display: block;
  font-size: 26rpx;
  color: #444;
  margin-bottom: 10rpx;
  line-height: 1.5;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}

.btn {
  padding: 10px 44px; /* 加大按钮 */
  border-radius: 26px;
  font-size: 15px;
}

.btn-home {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
}

.btn-rate {
  background-color: #f2c94c;
  color: #007aff;
  border: 1px solid #007aff;
}

.btn-rate:disabled {
  opacity: 0.45;
}

.btn-history {
  background-color: #ffffff;
  color: #0072ff;
  border: 1px solid #0072ff;
}

.donate-box {
  background: #fffbe5;
  padding: 5px;
  border-radius: 12px;
  width: 100%;
  max-width: 320px;
  font-size: 20px;
  min-height: 80px;
  box-shadow: 0 2px 10px rgba(255, 198, 0, 0.15);
}

.donate-text {
  font-size: 20px;
  color: #cc6600;
  line-height: 1.7;
}

.donate-link {
  font-weight: bold;
  color: #ff6600;
}

.footer {
  text-align: center;
  font-size: 12px;
  color: #777;
  padding: 10px 0;
  margin-top: 60px;
}
</style>
