<template>
  <view class="container">
    <view class="page-title">注册账号</view>
    <view class="card">
      <view class="input-group">
        <picker @change="selectCountry" :range="countryList" range-key="zh">
          <view class="input-picker">{{ selectedCountry }}</view>
        </picker>
        <input class="input" v-model="phone" type="number" placeholder="请输入手机号" />
      </view>

      <view class="input-group">
        <input class="input" v-model="captchaInput" placeholder="输入图形验证码" />
        <view class="captcha-wrapper" @click="refreshCaptcha">
          <image :src="captchaSrc" class="captcha-img" />
          <text class="captcha-text">换一张</text>
        </view>
      </view>

      <view class="input-group">
        <input class="input" v-model="smsCode" placeholder="输入验证码" />
        <button class="verify-btn" @click="getCode">获取验证码</button>
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

      <button class="login-btn" :loading="submitting" @click="register">注册</button>

      <view class="agreement">
        <navigator url="/pages/A0002_client_login_v01" class="link">已有账号？立即登录</navigator>
      </view>
    </view>

    <view class="third-login">
      <view class="third-icons">
        <image src="/static/icons/wechat.png" class="icon" @click="loginWithWeChat" />
        <image src="/static/icons/alipay.png" class="icon" @click="loginWithAlipay" />
        <image src="/static/icons/apple.png" class="icon" @click="loginWithApple" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { BASE_URL } from '../config/api.js'

const phone = ref('')
const captchaInput = ref('')
const smsCode = ref('')
const password = ref('')
const confirmPassword = ref('')
const captchaSrc = ref('/static/icons/captcha1.png')
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

const refreshCaptcha = () => {
  const index = Math.floor(Math.random() * 3) + 1
  captchaSrc.value = `/static/icons/captcha${index}.png`
}

const getCode = () => {
  if (!phone.value) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  uni.showToast({ title: '验证码已发送', icon: 'success' })
}

const toggleCheck = () => {
  isChecked.value = !isChecked.value
}

const register = async () => {
  if (!phone.value || !captchaInput.value || !smsCode.value || !password.value || !confirmPassword.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
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
    const [error, res] = await uni.request({
      url: `${BASE_URL}/auth/register`,
      method: 'POST',
      data: {
        phone: phone.value,
        password: password.value
      }
    })

    if (error) {
      throw error
    }

    if (res.statusCode === 201 || res.statusCode === 200) {
      uni.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/A0002_client_login_v01' })
      }, 1200)
      return
    }

    uni.showToast({ title: res.data?.message || '注册失败', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: '注册失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

const loginWithWeChat = () => {
  uni.showToast({ title: '微信快捷登录', icon: 'none' })
}

const loginWithAlipay = () => {
  uni.showToast({ title: '支付宝快捷登录', icon: 'none' })
}

const loginWithApple = () => {
  uni.showToast({ title: 'Apple 快捷登录', icon: 'none' })
}

onMounted(() => {
  selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 40rpx 20rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  text-align: center;
  color: #000;
  margin-bottom: 32rpx;
}

.card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
  width: 100%;
}

.input-picker {
  width: 200rpx;
  font-size: 28rpx;
}

.input {
  flex: 1;
  background: #f6f6f6;
  border-radius: 12rpx;
  padding: 30rpx;
  font-size: 32rpx;
}

.captcha-wrapper {
  display: flex;
  align-items: center;
  margin-left: 20rpx;
}

.captcha-img {
  width: 120rpx;
  height: 50rpx;
  border-radius: 6rpx;
  object-fit: contain;
}

.captcha-text {
  font-size: 32rpx;
  margin-left: 10rpx;
  color: #007aff;
}

.verify-btn {
  background: #007aff;
  width: 200rpx;
  color: white;
  padding: 0 20rpx;
  border-radius: 12rpx;
  margin-left: 20rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28rpx;
  line-height: 1.5;
  white-space: nowrap;
}

.password-tip {
  color: #999;
  font-size: 24rpx;
  margin-top: -10rpx;
  margin-bottom: 20rpx;
  text-align: center;
}

.login-btn {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: #fff !important;
  padding: 24rpx;
  border-radius: 50rpx;
  font-size: 46rpx;
  text-align: center;
  margin: 20rpx 0;
  width: 100%;
  border: none;
  box-shadow: none;
}

.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 40rpx;
  margin-top: 30rpx;
  color: #666;
}

.agreement-text {
  margin: 0 8rpx;
}

.link {
  color: #409eff;
}

.divider {
  margin: 0 10rpx;
  color: #aaa;
}

.third-login {
  text-align: center;
  margin-top: 60rpx;
}

.third-icons {
  display: flex;
  justify-content: center;
  gap: 100rpx;
}

.icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 60rpx;
}
</style>