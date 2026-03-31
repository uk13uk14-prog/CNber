<template>
  <view class="container">
    <view class="header">
      <text class="title">更改密码</text>
    </view>

    <!-- 手机号输入 -->
    <picker mode="selector" :range="countryList.map(c => `${c.code} ${c.zh}`)" @change="selectCountry">
      <view class="input">{{ selectedCountry }}</view>
    </picker>
    <input
      class="input"
      type="number"
      v-model="phone"
      placeholder="请输入手机号"
    />

    <!-- 验证码输入 -->
    <view class="code-row">
      <input
        class="input code-input"
        type="number"
        v-model="code"
        placeholder="请输入验证码"
      />
      <button class="code-btn" :disabled="countdown > 0" @click="sendCode">
        {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
      </button>
    </view>

    <!-- 新密码 -->
    <input
      class="input"
      type="password"
      v-model="newPassword"
      placeholder="请输入新密码"
    />

    <!-- 确认新密码 -->
    <input
      class="input"
      type="password"
      v-model="confirmPassword"
      placeholder="请再次输入新密码"
    />

    <!-- 提交按钮 -->
    <button class="submit-btn" @click="submit">重置密码</button>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const phone = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const countdown = ref(0)

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

const setDefaultCountry = () => {
  selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`
}

const selectCountry = (e) => {
  const item = countryList.value[e.detail.value]
  selectedCountry.value = `${item.code} ${item.zh}`
}

const sendCode = () => {
  if (!phone.value) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (countdown.value > 0) return
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

const submit = () => {
  if (!phone.value || !code.value || !newPassword.value || !confirmPassword.value) {
    uni.showToast({ title: '请输入完整信息', icon: 'none' })
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
    return
  }
  uni.showToast({ title: '密码已重置', icon: 'success' })
}
onMounted(() => {
  setDefaultCountry()
})
</script>

<style>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 32rpx;
}
.header {
  display: flex;
  justify-content: center;
  margin: 50rpx 0;
}
.title {
  font-size: 40rpx;
  font-weight: bold;
}
.input {
  width: 94%;
  padding: 20rpx;
  border: 1px solid #ccc;
  border-radius: 10rpx;
  margin-bottom: 30rpx;
  font-size: 28rpx;
  background: white;
}
.code-row {
  display: flex;
  align-items: center;
}
.code-input {
  flex: 1;
  margin-right: 20rpx;
}
.code-btn {
  width: 200rpx;
  font-size: 24rpx;
  padding: 9rpx;
  margin-top: -28rpx;
  border-radius: 10rpx;
  background: #1890ff;
  color: white;
}
.submit-btn {
  width: 100%;
  padding: 20rpx;
  border-radius: 50rpx;
  background: #409eff;
  color: white;
  font-size: 30rpx;
  margin-top: 30rpx;
}.reset-btn {
  width: 50%; /* 👈 改窄，原来可能是100% */
  padding: 20rpx;
  border-radius: 50rpx;
  background: #409eff;
  color: white;
  font-size: 30rpx;
  margin-top: 30rpx;
}

</style>
