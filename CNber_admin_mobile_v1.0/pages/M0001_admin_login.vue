<template>
  <view class="page">
    <view class="brand">CNber 运营助手</view>
    <view class="card">
      <input v-model="phone" class="input" placeholder="手机号 / 邮箱" />
      <input v-model="password" class="input" password placeholder="密码" />
      <button class="btn" :loading="loading" @click="onLogin">登录</button>
      <text v-if="error" class="error">{{ error }}</text>
    </view>
  </view>
</template>

<script>
import { getToken, login } from '@/stores/auth'

export default {
  data() {
    return { phone: '', password: '', loading: false, error: '' }
  },
  onShow() {
    if (getToken()) {
      uni.reLaunch({ url: '/pages/M0002_admin_dashboard' })
    }
  },
  methods: {
    async onLogin() {
      this.error = ''
      this.loading = true
      try {
        await login(this.phone.trim(), this.password)
        uni.reLaunch({ url: '/pages/M0002_admin_dashboard' })
      } catch (e) {
        this.error = e.message || '登录失败'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.page { padding: 80rpx 40rpx; }
.brand { font-size: 44rpx; font-weight: 600; margin-bottom: 48rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.input { border: 1px solid #e5e7eb; border-radius: 12rpx; padding: 20rpx; margin-bottom: 24rpx; }
.btn { background: #1a5cff; color: #fff; }
.error { color: #e11; margin-top: 16rpx; display: block; }
</style>
