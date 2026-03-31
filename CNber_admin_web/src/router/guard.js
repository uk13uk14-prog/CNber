<template>
  <view class="container">
    <view class="page-title">欢迎使用 中步</view>
    <view class="card">
      <view class="input-group">
        <picker @change="selectCountry" :range="countryList" range-key="zh">
          <view class="input-picker">{{ selectedCountry }}</view>
        </picker>
        <input class="input" v-model="phone" placeholder="请输入手机号" />
      </view>

      <view class="input-group">
        <input class="input" v-model="password" placeholder="请输入密码" password />
      </view>

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
    </view>

    <view class="third-login">
      <text class="third-title">第三方快捷登录</text>
      <view class="third-icons">
        <image src="/static/icons/wechat.png" class="icon" @click="loginWithWechat" />
        <image src="/static/icons/alipay.png" class="icon" @click="loginWithAlipay" />
        <image src="/static/icons/apple.png" class="icon" @click="loginWithApple" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import uni from '@dcloudio/uni-app'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const phone = ref('')
const password = ref('')
const isChecked = ref(false)
const isLoading = ref(false)

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

const login = async () => {
  if (!phone.value || !password.value) {
    uni.showToast({ title: '请输入手机号和密码', icon: 'none' })
    return
  }
  isLoading.value = true
  try {
    const res = await uni.request({
      url: `${API_BASE_URL}/auth/login`,
      method: 'POST',
      data: {
        phone: phone.value,
        password: password.value
      }
    })
    if (res.data && res.data.user) {
      uni.setStorageSync('user', res.data.user)
      uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
    } else {
      uni.showToast({ title: res.data.message || '登录失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: '请求失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

const loginWithWechat = () => {
  uni.showToast({ title: '微信登录开发中', icon: 'none' })
}
const loginWithAlipay = () => {
  uni.showToast({ title: '支付宝登录开发中', icon: 'none' })
}
const loginWithApple = () => {
  uni.showToast({ title: 'Apple登录开发中', icon: 'none' })
}

onMounted(() => {
  selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`
})
</script>

<style scoped>
/* 样式不变，已保留原有结构 */
</style>
