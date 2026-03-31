<template>
  <view class="container">
    <!-- 行程完成图标 -->
    <image class="icon" src="/static/complete_icon.png" mode="widthFix" />

    <!-- 文案 -->
    <text class="title"></text>
    <text class="desc">感谢您使用</text>
        <text class="desc">中步出行</text>
          <text class="desc">订单已完成</text>
          <text class="desc">我们下次再约！</text>
    <!-- 按钮组 -->
    <view class="button-group">
      <button class="btn btn-home" @click="goHome">返回首页</button>
      <button class="btn btn-rate" @click="goRating">评价司机</button>
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
import { onMounted, onUnmounted, ref } from 'vue'
import { BASE_URL } from '../config/api.js'

const order = ref(null)
const lastNavigatedStatus = ref('')
let pollingTimer = null

const statusRouteMap = {
  pending: '/pages/A0107_client_wait_driver_v01',
  accepted: '/pages/A0109_client_driver_info_v01',
  ongoing: '/pages/A0110_client_in_trip_v01',
  completed: '/pages/A0111_client_trip_completed_v01'
}

const handleStatusNavigation = (status) => {
  if (!status || lastNavigatedStatus.value === status) {
    return
  }

  const targetUrl = statusRouteMap[status]
  if (!targetUrl) {
    return
  }

  const currentRoute = getCurrentPages().slice(-1)[0]?.route
  const currentPath = currentRoute ? `/${currentRoute}` : ''

  if (currentPath === targetUrl) {
    lastNavigatedStatus.value = status
    return
  }

  lastNavigatedStatus.value = status
  uni.redirectTo({ url: targetUrl })
}

const fetchOrders = async () => {
  const token = uni.getStorageSync('token')

  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
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

    const orders = Array.isArray(res.data?.orders) ? res.data.orders : []
    order.value = orders.length > 0 ? orders[0] : null
    handleStatusNavigation(order.value?.status)
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
  uni.navigateTo({
    url: '/pages/A0201_client_rating_v01'
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
  padding: 0px20px 20px 20px; /* 减少顶部间距 */
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

.button-group {
  display: flex;
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
