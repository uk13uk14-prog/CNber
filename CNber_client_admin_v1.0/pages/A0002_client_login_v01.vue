<template>
  <view class="container">
    <view class="brand">
      <text class="brand-logo">CNber</text>
      <text class="brand-name">中步出行</text>
      <text class="brand-desc">英国华人用车服务</text>
    </view>

    <view class="card">
      <view class="card-title">手机号登录</view>
      <view class="input-group">
        <picker @change="selectCountry" :range="countryList" range-key="zh">
          <view class="input-picker">{{ selectedCountry }}</view>
        </picker>
        <input class="input" v-model="phone" placeholder="请输入手机号" />
      </view>

      <view class="input-group">
        <input class="input" v-model="password" placeholder="请输入密码" password />
      </view>

      <view class="remember-box">
        <checkbox-group @change="onRememberChange">
          <label>
            <checkbox value="account" :checked="rememberAccount" /> 记住账号
          </label>
          <label>
            <checkbox value="password" :checked="rememberPassword" /> 记住密码
          </label>
        </checkbox-group>
      </view>

      <!-- 协议勾选 -->
      <view class="agreement">
        <checkbox :checked="isChecked" @click="toggleCheck" />
        <text class="agreement-text">我已阅读并同意</text>
      </view>
      <view class="agreement">
        <navigator url="/pages/A0306_client_privacy_policy_v01" class="link">《法律协议》</navigator>
        <text class="divider">|</text>
        <navigator url="/pages/A0307_client_terms_of_service_v01" class="link">《服务协议》</navigator>
      </view>

      <button class="login-btn" :loading="isLoading" :disabled="!isChecked" @click="login">
        登录
      </button>
      
      <!-- 底部链接 -->
      <view class="footer-links">
        <text class="footer-text">还没有账号？</text>
        <navigator url="/pages/A0003_client_register_v01" class="link">注册账号</navigator>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '../utils/request.js'

const phone = ref('')
const password = ref('')
const isChecked = ref(false)
const isLoading = ref(false)
const REMEMBER_LOGIN_KEY = 'clientRememberLogin'
const rememberAccount = ref(true)
const rememberPassword = ref(false)

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

const onRememberChange = (e) => {
  const values = e.detail.value || []
  rememberPassword.value = values.includes('password')
  rememberAccount.value = values.includes('account') || rememberPassword.value
}

const loadRememberedLogin = () => {
  try {
    const saved = uni.getStorageSync(REMEMBER_LOGIN_KEY)
    if (!saved) return

    rememberAccount.value = saved.rememberAccount !== false
    rememberPassword.value = saved.rememberPassword === true
    if (rememberAccount.value && saved.phone) {
      phone.value = saved.phone
    }
    if (rememberPassword.value && saved.password) {
      password.value = saved.password
    }
  } catch (e) {
    /* ignore */
  }
}

const saveRememberedLogin = () => {
  const payload = {
    rememberAccount: rememberAccount.value,
    rememberPassword: rememberPassword.value,
    phone: rememberAccount.value ? phone.value : '',
    password: rememberPassword.value ? password.value : ''
  }
  uni.setStorageSync(REMEMBER_LOGIN_KEY, payload)
}

const login = async () => {
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
  
  isLoading.value = true
  try {
    const data = await request({
      url: '/auth/login',
      method: 'POST',
      skipAuth: true,
      data: {
        phone: phone.value,
        password: password.value
      }
    })

    if (data?.user) {
      if (data.user.role === 'driver') {
        uni.showToast({
          title: '当前为乘客端，请使用司机端 App 登录',
          icon: 'none',
          duration: 3000
        })
        return
      }
      saveRememberedLogin()
      uni.setStorageSync('token', data.token || '')
      uni.setStorageSync('user', data.user)
      uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
      return
    }

    uni.showToast({ title: '登录失败', icon: 'none' })
  } catch (error) {
    /* 封装内已提示 */
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`
  loadRememberedLogin()
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
}

.remember-box {
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #666;
}

.remember-box checkbox-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remember-box label {
  display: flex;
  align-items: center;
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