<template>
  <view class="container">
    <view class="brand">
      <text class="brand-logo">CNber</text>
      <text class="brand-name">中步出行</text>
      <text class="brand-desc">创建账号，开始预约用车</text>
    </view>

    <view class="card">
      <view class="card-title">注册账号</view>
      <view class="input-group">
        <picker @change="selectCountry" :range="countryList" range-key="zh">
          <view class="input-picker">{{ selectedCountry }}</view>
        </picker>
        <input class="input" v-model="phone" type="number" placeholder="请输入手机号" />
      </view>

      <view class="input-group">
        <input class="input" v-model="password" placeholder="输入密码" password />
      </view>

      <view class="input-group">
        <input class="input" v-model="confirmPassword" placeholder="再次输入密码" password />
      </view>

      <view class="password-tip">密码须为6-20位字母或数字</view>

      <view class="agreement">
        <checkbox :checked="isChecked" @click="toggleCheck" />
        <text class="agreement-text">我已阅读并同意</text>
      </view>
      <view class="agreement">
        <navigator url="/pages/A0306_client_privacy_policy_v01" class="link">《法律协议》</navigator>
        <text class="divider">|</text>
        <navigator url="/pages/A0307_client_terms_of_service_v01" class="link">《服务协议》</navigator>
      </view>

      <button class="login-btn" :loading="submitting" :disabled="!isChecked" @click="register">注册</button>

      <view class="footer-links">
        <text class="footer-text">已有账号？</text>
        <navigator url="/pages/A0002_client_login_v01" class="link">立即登录</navigator>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '../utils/request.js'

const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const isChecked = ref(false)
const submitting = ref(false)

const countryList = ref([
  { code: '+86', zh: '中国' },
  { code: '+44', zh: '英国' },
  { code: '+852', zh: '香港' },
  { code: '+853', zh: '澳门' },
  { code: '+886', zh: '台湾' },
  { code: '+65', zh: '新加坡' },
  { code: '+60', zh: '马来西亚' },
  { code: '+66', zh: '泰国' }
])
const selectedCountry = ref('')

const selectCountry = (e) => {
  const item = countryList.value[e.detail.value]
  selectedCountry.value = `${item.code} ${item.zh}`
}

const toggleCheck = () => {
  isChecked.value = !isChecked.value
}

const register = async () => {
  if (!isChecked.value) {
    uni.showToast({ title: '请先同意协议', icon: 'none' })
    return
  }

  if (!phone.value) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }

  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  if (!confirmPassword.value) {
    uni.showToast({ title: '请再次输入密码', icon: 'none' })
    return
  }

  if (password.value !== confirmPassword.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  if (!/^[A-Za-z0-9]{6,20}$/.test(password.value)) {
    uni.showToast({ title: '密码格式错误（6-20位字母或数字）', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    await request({
      url: '/auth/register',
      method: 'POST',
      skipAuth: true,
      data: {
        phone: phone.value,
        password: password.value
      }
    })

    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/A0002_client_login_v01' })
    }, 1200)
  } catch (error) {
    /* 封装内已提示 */
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 80rpx 32rpx 48rpx;
  background: #f5f7fb;
  box-sizing: border-box;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 56rpx;
}

.brand-logo {
  font-size: 60rpx;
  font-weight: bold;
  color: #111827;
  letter-spacing: 2rpx;
}

.brand-name {
  margin-top: 12rpx;
  font-size: 34rpx;
  color: #1f2937;
}

.brand-desc {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #6b7280;
}

.card {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 44rpx 36rpx;
  box-shadow: 0 16rpx 40rpx rgba(15, 23, 42, 0.06);
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.card-title {
  margin-bottom: 32rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #111827;
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  width: 100%;
  min-height: 96rpx;
  background: #f8fafc;
  border: 1rpx solid #e5e7eb;
  border-radius: 16rpx;
  box-sizing: border-box;
  overflow: hidden;
}

.input-picker {
  width: 188rpx;
  padding-left: 24rpx;
  font-size: 28rpx;
  color: #374151;
}

.input {
  flex: 1;
  height: 96rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #111827;
  background: transparent;
}

.password-tip {
  color: #999;
  font-size: 24rpx;
  margin-top: -10rpx;
  margin-bottom: 20rpx;
  text-align: center;
}

.login-btn {
  background: linear-gradient(to right, #1677ff, #0f62fe);
  color: #fff !important;
  height: 96rpx;
  border-radius: 48rpx;
  font-size: 34rpx;
  text-align: center;
  margin: 36rpx 0 0;
  width: 100%;
  border: none;
  line-height: 96rpx;
  box-shadow: none;
}

.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 26rpx;
  margin-top: 24rpx;
  color: #666;
}

.agreement-text {
  margin: 0 8rpx;
}

.link {
  color: #1677ff;
}

.divider {
  margin: 0 10rpx;
  color: #aaa;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  font-size: 28rpx;
}

.footer-text {
  color: #6b7280;
}
</style>