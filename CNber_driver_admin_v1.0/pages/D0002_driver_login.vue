<template>
  <view class="login-page">
    <view class="login-content">
      <view class="driver-badge">CNber Driver</view>
      <text class="page-title">司机登录</text>
      <text class="page-sub">请使用注册手机号与密码登录，开启今日接单服务</text>

      <view class="form">
        <view class="field">
          <input
            v-model="phone"
            class="input"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-class="input-ph"
          />
        </view>
        <view class="field">
          <input
            v-model="password"
            class="input"
            password
            placeholder="请输入密码"
            placeholder-class="input-ph"
          />
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

        <button class="btn-primary" @click="login">登录</button>

        <view class="row-actions">
          <text class="link-muted" @click="goForgot">忘记密码</text>
          <text class="link-primary" @click="goRegister">去注册</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'

const REMEMBER_LOGIN_KEY = 'driverRememberLogin'

export default {
  name: 'D0002_driver_login',
  data() {
    return {
      phone: '',
      password: '',
      rememberAccount: true,
      rememberPassword: false
    }
  },
  mounted() {
    this.loadRememberedLogin()
  },
  methods: {
    onRememberChange(e) {
      const values = e.detail.value || []
      this.rememberPassword = values.includes('password')
      this.rememberAccount = values.includes('account') || this.rememberPassword
    },
    loadRememberedLogin() {
      try {
        const saved = uni.getStorageSync(REMEMBER_LOGIN_KEY)
        if (!saved) return

        this.rememberAccount = saved.rememberAccount !== false
        this.rememberPassword = saved.rememberPassword === true
        if (this.rememberAccount && saved.phone) {
          this.phone = saved.phone
        }
        if (this.rememberPassword && saved.password) {
          this.password = saved.password
        }
      } catch (e) {
        /* ignore */
      }
    },
    saveRememberedLogin() {
      uni.setStorageSync(REMEMBER_LOGIN_KEY, {
        rememberAccount: this.rememberAccount,
        rememberPassword: this.rememberPassword,
        phone: this.rememberAccount ? this.phone : '',
        password: this.rememberPassword ? this.password : ''
      })
    },
    goRegister() {
      uni.navigateTo({ url: '/pages/D0003_driver_register' })
    },
    goForgot() {
      uni.navigateTo({ url: '/pages/D0502_driver_help_center' })
    },
    async login() {
      if (!this.phone) {
        uni.showToast({ title: '请输入手机号', icon: 'none' })
        return
      }
      if (!this.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return
      }
      try {
        const data = await request({
          url: '/auth/login',
          method: 'POST',
          skipAuth: true,
          data: {
            phone: this.phone,
            password: this.password
          }
        })
        if (data?.token) {
          const u = data.user || {}
          if (u.role !== 'driver') {
            uni.showToast({
              title: '当前账号不是司机，请用司机端注册或更换账号',
              icon: 'none',
              duration: 3500
            })
            return
          }
          this.saveRememberedLogin()
          uni.setStorageSync('token', data.token)
          uni.setStorageSync('user', u)
          uni.reLaunch({ url: '/pages/D0300_driver_main' })
        }
      } catch (e) {
        /* 封装内已提示 */
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background-color: #16324f;
  box-sizing: border-box;
  padding: 0 48rpx 64rpx;
}

.login-content {
  padding-top: 96rpx;
}

.driver-badge {
  width: fit-content;
  margin: 0 auto 28rpx;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #fff7ed;
  color: #f97316;
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  border: 1rpx solid #fed7aa;
}

.page-title {
  display: block;
  font-size: 48rpx;
  font-weight: 800;
  color: #ffffff;
  text-align: center;
  margin-bottom: 16rpx;
}

.page-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.72);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 48rpx;
}

.form {
  display: flex;
  flex-direction: column;
  padding: 40rpx 32rpx;
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 18rpx 50rpx rgba(15, 23, 42, 0.08);
}

.field {
  margin-bottom: 28rpx;
}

.input {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  font-size: 30rpx;
  color: #0f172a;
  background-color: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
}

.input-ph {
  color: #bbbbbb;
  font-size: 28rpx;
}

.remember-box {
  margin: 4rpx 0 24rpx;
  font-size: 26rpx;
  color: #64748b;
}

.remember-box checkbox-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.remember-box label {
  display: flex;
  align-items: center;
}

.btn-primary {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  margin-top: 16rpx;
  padding: 0;
  box-sizing: border-box;
  font-size: 32rpx;
  font-weight: 600;
  color: #111827;
  background: linear-gradient(90deg, #facc15, #f97316);
  border: none;
  border-radius: 16rpx;
  box-shadow: 0 12rpx 28rpx rgba(249, 115, 22, 0.22);
}

.btn-primary::after {
  border: none;
}

.row-actions {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 32rpx;
  padding: 0 8rpx;
}

.link-muted {
  font-size: 26rpx;
  color: #64748b;
}

.link-primary {
  font-size: 28rpx;
  color: #f97316;
  font-weight: 700;
}
</style>
