<template>
  <view class="page">
    <view class="hero">
      <text class="brand">CNber</text>
      <text class="sub">运营助手 · 移动后台</text>
    </view>
    <view class="card">
      <text class="hint">请使用后台员工账号登录（admin / operator / dispatcher / support 等）</text>
      <view class="field">
        <text class="lab">手机号 / 邮箱</text>
        <input v-model="phone" class="inp" placeholder="请输入登录标识" />
      </view>
      <view class="field">
        <text class="lab">密码</text>
        <input v-model="password" class="inp" password placeholder="请输入密码" />
      </view>
      <button class="login-btn" :loading="loading" @click="onLogin">登录</button>
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
      uni.switchTab({ url: '/pages/M0002_admin_dashboard' })
    }
  },
  methods: {
    async onLogin() {
      if (!this.phone.trim() || !this.password) {
        this.error = '请输入账号和密码'
        return
      }
      this.error = ''
      this.loading = true
      try {
        await login(this.phone.trim(), this.password)
        uni.switchTab({ url: '/pages/M0002_admin_dashboard' })
      } catch (e) {
        this.error = e.message || '登录失败'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page {
  min-height: 100vh;
  padding: 80rpx $admin-page-pad;
  box-sizing: border-box;
}
.hero {
  margin-bottom: 60rpx;
}
.brand {
  font-size: 56rpx;
  font-weight: 700;
  color: $admin-primary;
  display: block;
}
.sub {
  font-size: 28rpx;
  color: $admin-text-secondary;
  margin-top: 12rpx;
  display: block;
}
.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 40rpx;
  border: 1rpx solid $admin-border;
}
.hint {
  font-size: 24rpx;
  color: $admin-text-secondary;
  line-height: 1.5;
  margin-bottom: 32rpx;
  display: block;
}
.field {
  margin-bottom: 28rpx;
}
.lab {
  font-size: 24rpx;
  color: $admin-text-secondary;
  display: block;
  margin-bottom: 8rpx;
}
.inp {
  border: 1rpx solid $admin-border;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
}
.login-btn {
  margin-top: 20rpx;
  background: $admin-primary;
  color: #fff;
  border-radius: 16rpx;
}
.error {
  color: $admin-danger;
  margin-top: 16rpx;
  display: block;
  font-size: 24rpx;
}
</style>
