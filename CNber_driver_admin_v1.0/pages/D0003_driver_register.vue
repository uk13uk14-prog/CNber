<template>
  <view class="page">
    <view class="title">司机注册</view>
    <view class="form">
      <input v-model="phone" type="number" placeholder="手机号" class="inp" />
      <input v-model="password" password placeholder="密码（6-20位字母或数字）" class="inp" />
      <input v-model="password2" password placeholder="再次输入密码" class="inp" />
      <button class="btn" @click="submit">注册并登录</button>
    </view>
    <navigator url="/pages/D0002_driver_login" open-type="redirect" class="link">已有账号？去登录</navigator>
  </view>
</template>

<script>
import { request } from '../utils/request.js'

export default {
  name: 'D0003_driver_register',
  data() {
    return { phone: '', password: '', password2: '' }
  },
  methods: {
    async submit() {
      if (!this.phone || !this.password) {
        uni.showToast({ title: '请填写手机号和密码', icon: 'none' })
        return
      }
      if (this.password !== this.password2) {
        uni.showToast({ title: '两次密码不一致', icon: 'none' })
        return
      }
      if (!/^[A-Za-z0-9]{6,20}$/.test(this.password)) {
        uni.showToast({ title: '密码须为6-20位字母或数字', icon: 'none' })
        return
      }
      try {
        const data = await request({
          url: '/auth/register',
          method: 'POST',
          skipAuth: true,
          data: {
            phone: this.phone,
            password: this.password,
            role: 'driver'
          }
        })
        if (data?.token) {
          uni.setStorageSync('token', data.token)
          uni.setStorageSync('user', data.user || {})
          uni.showToast({ title: '注册成功', icon: 'success' })
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/D0300_driver_main' })
          }, 500)
        }
      } catch (e) {
        /* request 内已提示 */
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 60rpx 40rpx;
  background: #16324f;
}
.title {
  font-size: 44rpx;
  font-weight: bold;
  margin-bottom: 48rpx;
  text-align: center;
  color: #fff;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  padding: 36rpx 30rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 50rpx rgba(15, 23, 42, 0.16);
}
.inp {
  background: #f8fafc;
  padding: 24rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
}
.btn {
  margin-top: 20rpx;
  background: linear-gradient(90deg, #facc15, #f97316);
  color: #111827;
}
.link {
  display: block;
  margin-top: 40rpx;
  text-align: center;
  color: #fde68a;
  font-size: 28rpx;
}
</style>
