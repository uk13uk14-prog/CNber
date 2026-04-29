<template>
  <view class="page">
    <view class="hero">
      <text class="brand">CNber</text>
      <text class="sub">运营调度控制台</text>
    </view>
    <view class="card">
      <text class="hint">请使用具备 admin 角色的账号（与 C 端共用 User 表登录接口）</text>
      <view class="field">
        <text class="lab">手机号</text>
        <input v-model="phone" type="text" placeholder="手机号" class="inp" />
      </view>
      <view class="field">
        <text class="lab">密码</text>
        <input v-model="password" type="password" placeholder="密码" class="inp" />
      </view>
      <button class="login" type="primary" :loading="loading" @click="onLogin">
        登录
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { loginByPhone } from '../services/auth.js'
import { setSession } from '../store/session.js'

const phone = ref('')
const password = ref('')
const loading = ref(false)

async function onLogin() {
  if (!phone.value || !password.value) {
    uni.showToast({ title: '请输入手机号和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const data = await loginByPhone(phone.value, password.value)
    const user = data && data.user
    const token = data && data.token
    if (!user || user.role !== 'admin') {
      uni.showToast({
        title: '该账号不是管理员，请使用 role=admin 的用户',
        icon: 'none'
      })
      return
    }
    setSession(token, user)
    uni.switchTab({ url: '/pages/B0300_admin_dashboard' })
  } catch (e) {
    /* toast 已在 request */
  } finally {
    loading.value = false
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
.login {
  margin-top: 20rpx;
  background: $admin-primary;
  border-radius: 16rpx;
}
</style>
