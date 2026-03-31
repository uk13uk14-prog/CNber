<template>
  <view class="payment-page">
    <view class="title">支付订单</view>

    <view class="order-info">
      <view class="order-detail">
        <view class="label">订单编号：</view>
        <view class="value">{{ orderInfo.orderNumber }}</view>
      </view>
      <view class="order-detail">
        <view class="label">金额：</view>
        <view class="value">£{{ orderInfo.amount }}</view>
      </view>
      <view class="order-detail">
        <view class="label">服务类型：</view>
        <view class="value">{{ orderInfo.serviceType }}</view>
      </view>
      <view class="order-detail">
        <view class="label">支付状态：</view>
        <view class="value">{{ orderInfo.status }}</view>
      </view>
      <view class="countdown">请在 {{ countdown }} 内完成支付</view>
    </view>

    <view class="button-group">
      <button class="pay-button" @click="payNow">立即支付</button>

    </view>

    <!-- 感谢提示 -->
    <view class="thank-you">
      <text>感谢您对中步出行的支持，</text><br />
      <text>您的每一笔订单完成之后，</text><br />
      <text>会有一块钱捐给慈善基金，</text><br />
      <text>祝您生活愉快💗</text>
    </view>

    <!-- 支付结果弹窗 -->
    <view class="popup-wrapper" v-if="showPopup">
      <view class="popup">
        <view class="popup-title">{{ popupTitle }}</view>
        <view class="popup-message">{{ popupMessage }}</view>
        <view class="popup-actions">
          <button @click="closePopup">关闭</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// 订单信息
const orderInfo = ref({
  orderNumber: '202405060001',
  amount: '120.00',
  serviceType: '',
  status: '待支付'
})

// 倒计时
const countdown = ref('15:00')
let timer = null

function startCountdown() {
  let totalSeconds = 15 * 60
  timer = setInterval(() => {
    totalSeconds--
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    countdown.value = `${minutes}:${seconds}`
    if (totalSeconds <= 0) {
      clearInterval(timer)
      countdown.value = '已超时'
    }
  }, 1000)
}

// 支付
function payNow() {
  uni.showToast({
    title: '支付成功',
    icon: 'success',
    duration: 1500 // 提示1.5秒
  })

  // 1.5秒后自动跳转
  setTimeout(() => {
    uni.redirectTo({
      url: '/pages/A0107_client_wait_driver_v01'
    })
  }, 1500)
}

// 返回首页
function goHome() {
  uni.reLaunch({
    url: '/pages/A0300_client_main_v01'
  })
}

// 接收参数
onLoad((query) => {
  orderInfo.value.serviceType = query.serviceType || '点对点'
})

// 页面挂载时启动倒计时
onMounted(() => {
  startCountdown()
})
</script>




<style scoped>
.payment-page {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 20px;
}

.title {
  font-size: 46px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
  color: #333;
}

.order-info {
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.order-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 18px;
  color: #555;
}

.label {
  font-weight: bold;
}

.value {
  color: #666;
}

.countdown {
  text-align: center;
  font-size: 18px;
  color: #409eff;
  margin-top: 10px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.pay-button {
  background-color: #FF4500;
  color: white;
  font-size: 26px;
  padding: 14px 0;
  border: none;
  border-radius: 50px;
  width: 100%;
}

.thank-you {
  text-align: center;
  font-size: 24px;
  color:#555;
  margin-top: 60px;
  padding: 0 10px;
  line-height: 1.6;
}

.popup-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup {
  background: #fff;
  padding: 25px;
  border-radius: 16px;
  width: 80%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.popup-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
}

.popup-message {
  font-size: 16px;
  margin-bottom: 20px;
}

.popup-actions button {
  background-color: #409eff;
  color: white;
  border: none;
  padding: 10px 0;
  width: 40%;
  border-radius: 50px;
  font-size: 16px;
}
.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>