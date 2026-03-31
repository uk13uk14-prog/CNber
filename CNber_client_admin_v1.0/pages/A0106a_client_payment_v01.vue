<template>
  <view class="payment-page">
    <!-- 顶部欢迎信息 -->
    <view class="header-section">
      <view class="header">
        <text class="title">感谢您对我们的服务的肯定</text>
      </view>
      <view class="header">
        <text class="title">期待您的下次用车服务</text>
      </view>
    </view>
 
    <!-- 支付金额展示 -->
    <view class="amount-section">
      <text class="amount-label">打赏金额</text>
      <text class="amount">£{{ amount }}</text>
    </view>

    <!-- 支付方式选择 -->
    <view class="payment-methods">
      <view 
        class="method"
        :class="{ active: selectedMethod === 'wechat' }"
        @tap="selectMethod('wechat')"
      >
        <image src="/static/icons/wechat.png" class="method-icon" mode="aspectFit" />
        <text class="method-text">微信支付</text>
      </view>
      <view 
        class="method"
        :class="{ active: selectedMethod === 'alipay' }"
        @tap="selectMethod('alipay')"
      >
        <image src="/static/icons/alipay.png" class="method-icon" mode="aspectFit" />
        <text class="method-text">支付宝</text>
      </view>
    </view>

    <!-- 支付按钮 -->
    <button class="pay-button" @tap="handlePayment" :disabled="!selectedMethod">
      立即支付 £{{ amount }}
    </button>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const amount = ref(0)
const selectedMethod = ref('')

// 获取打赏金额
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  amount.value = parseFloat(currentPage.options?.amount) || 0
})

function selectMethod(method) {
  selectedMethod.value = method
}

function handlePayment() {
  if (!selectedMethod.value) {
    uni.showToast({ title: '请选择支付方式', icon: 'none' })
    return
  }

  uni.showLoading({ title: '发起支付中...', mask: true })
  
  // 调用支付API
  uni.requestPayment({
    provider: selectedMethod.value,
    orderInfo: {
      amount: amount.value.toString(),
      description: `司机打赏 £${amount.value}`
    },
    success: () => {
      uni.hideLoading()
      uni.showToast({
        title: '支付成功',
        icon: 'success',
        success: () => {
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
          }, 1500)
        }
      })
    },
    fail: (err) => {
      uni.hideLoading()
      uni.showToast({
        title: `支付失败: ${err.errMsg}`,
        icon: 'none'
      })
    }
  })
}
</script>

<style scoped>
.payment-page {
  padding: 40rpx;
  min-height: 100vh;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  display: flex;
  flex-direction: column;
}

/* 顶部欢迎信息 */
.header-section {
  margin-bottom: 60rpx;
}
.header {
  padding: 20rpx 0;
  text-align: center;
}
.title {
  font-size: 42rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.6;
}

/* 金额展示 */
.amount-section {
  background: white;
  border-radius: 24rpx;
  padding: 40rpx;
  margin: 40rpx 0;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.amount-label {
  display: block;
  font-size: 32rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.amount {
  font-size: 56rpx;
  font-weight: bold;
  color: #ff6b6b;
}

/* 支付方式 */
.payment-methods {
  background: white;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 60rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.method {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  font-size: 34rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid #eee;
  background: #fff;
}

.method.active {
  border-color: #409eff;
  background-color: #f0f7ff;
  transform: scale(1.02);
  transition: all 0.3s;
}

.method-icon {
  width: 60rpx;
  height: 60rpx;
  margin-right: 20rpx;
}

.method-text {
  flex: 1;
  text-align: center;
}

/* 支付按钮 */
.pay-button {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
  border: none;
  border-radius: 50rpx;
  padding: 28rpx;
  font-size: 36rpx;
  font-weight: bold;
  margin-top: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 114, 255, 0.3);
}

.pay-button[disabled] {
  opacity: 0.6;
}
</style>