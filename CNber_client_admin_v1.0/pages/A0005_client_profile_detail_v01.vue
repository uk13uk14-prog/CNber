<template>
  <view class="container">
    <view class="page-title"></view>

    <view class="profile-card">
      <image :src="profile.avatarUrl" class="avatar" />

      <view class="field"><text class="label">姓名：</text>{{ profile.name }}</view>
      <view class="field"><text class="label">手机号：</text>{{ profile.phone }}</view>
      <view class="field"><text class="label">性别：</text>{{ profile.gender }}</view>
      <view class="field"><text class="label">出生日期：</text>{{ profile.birth }}</view>
      <view class="field"><text class="label">实名认证：</text>{{ profile.verified ? '已认证' : '未认证' }}</view>
      <view class="field"><text class="label">邮箱：</text>{{ profile.email }}</view>
      <view class="field"><text class="label">英国常驻地址：</text>{{ profile.address }}</view>
      <view class="field"><text class="label">英国学校：</text>{{ profile.school || '未填写' }}</view>
      <view class="field"><text class="label">专业：</text>{{ profile.major || '未填写' }}</view>

      <!-- 编辑资料跳转按钮 -->
      <button class="btn edit-btn" @click="goToEditPage">🧾编辑资料</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const profile = ref({
  avatarUrl: '/static/avatar.png',
  name: '小赛',
  phone: '07123456789',
  gender: '男',
  birth: '1990-01-01',
  verified: true,
  email: 'zhangsan@example.com',
  address: '10 Downing Street, London',
  school: 'University of Oxford',
  major: 'Computer Science'
})

const goToEditPage = () => {
  uni.navigateTo({ url: '/pages/A0006_client_profile_complete_v01' })
}
</script>

<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 32rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  text-align: center;
  color: #000;
  margin-bottom: 32rpx;
}

.profile-card {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 100rpx;
  height: 10rpx;
  border-radius: 50%;
  display: block;
  margin: 0 auto 24rpx auto;
}

.label {
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
  display: inline;
}

.field {
  font-size: 36rpx;
  margin-bottom: 38rpx;
  color: #333;
}

.btn {
  margin-top: 28rpx;
  padding: 28rpx;
  border-radius: 12rpx;
  font-size: 40rpx;
  width: 100%;
  border: none;
  text-align: center;
}

.edit-btn {
  background-color: #007aff;
  color: white;
}
</style>
