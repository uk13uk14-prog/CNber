<template>
  <view class="container">
    <view class="header">编辑资料</view>

    <view class="form-card">
      <view class="form-group">
        <text class="label">姓名</text>
        <input v-model="form.name" placeholder="请输入姓名" class="input" />
      </view>

      <view class="form-group">
        <text class="label">手机号</text>
        <input v-model="form.phone" placeholder="请输入手机号" class="input" />
      </view>

      <view class="form-group">
        <text class="label">性别</text>
        <picker :range="genderList" @change="e => form.gender = genderList[e.detail.value]">
          <view class="picker-value">{{ form.gender || '请选择性别' }}</view>
        </picker>
      </view>

      <view class="form-group">
        <text class="label">出生日期</text>
        <picker mode="date" @change="e => form.birth = e.detail.value">
          <view class="picker-value">{{ form.birth || '请选择日期' }}</view>
        </picker>
      </view>

      <view class="form-group">
        <text class="label">邮箱</text>
        <input v-model="form.email" placeholder="请输入邮箱" class="input" />
      </view>

      <view class="form-group">
        <text class="label">英国常驻地址</text>
        <input v-model="form.address" placeholder="请输入地址" class="input" />
      </view>

      <view class="form-group">
        <text class="label">英国学校（可选）</text>
        <input v-model="form.school" placeholder="例如：University of Leeds" class="input" />
      </view>

      <view class="form-group">
        <text class="label">专业（可选）</text>
        <input v-model="form.major" placeholder="请输入专业名称" class="input" />
      </view>

      <button class="submit-btn" @click="submit">保存并返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const genderList = ['男', '女']

const form = ref({
  name: '',
  phone: '',
  gender: '',
  birth: '',
  email: '',
  address: '',
  school: '',
  major: ''
})

const submit = () => {
  uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
}
</script>

<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
}

.header {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 32rpx;
  text-align: center;
  color: #000;
}

.form-card {
  background-color: white;
  border-radius: 16rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.form-group {
  margin-bottom: 36rpx;
}

.label {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
  color: #333;
}

.input {
  font-size: 36rpx;
  padding: 20rpx;
  border-bottom: 2rpx solid #ddd;
  color: #000;
}

.picker-value {
  font-size: 36rpx;
  color: #333;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #ddd;
}

.submit-btn {
  margin-top: 48rpx;
  padding: 28rpx;
  font-size: 40rpx;
  border-radius: 12rpx;
  background-color: #007AFF;
  color: white;
  width: 100%;
  border: none;
  text-align: center;
}

.footer {
  text-align: center;
  font-size: 24rpx;
  color: #777;
  padding: 20rpx 0;
  margin-top: auto;
}
</style>
