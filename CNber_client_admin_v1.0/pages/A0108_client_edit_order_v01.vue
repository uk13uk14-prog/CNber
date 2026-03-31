<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="back" @click="goBack">← 返回</text>
      <text class="title">修改订单</text>
    </view>

    <!-- 表单区域 -->
    <view class="form">
      <!-- 出发地（地址+邮编） -->
      <view class="form-item">
        <text class="label">出发地</text>
        <textarea 
          v-model="orderInfo.from" 
          placeholder="请输入出发地地址和邮编" 
          class="combined-field"
          auto-height
        />
      </view>

      <!-- 目的地（地址+邮编） -->
      <view class="form-item">
        <text class="label">目的地</text>
        <textarea 
          v-model="orderInfo.to" 
          placeholder="请输入目的地地址和邮编" 
          class="combined-field"
          auto-height
        />
      </view>

      <!-- 出发日期与时间 -->
      <view class="form-item">
        <text class="label">出发日期与时间</text>
        <view class="datetime-picker">
          <picker 
            mode="date" 
            :value="date" 
            :start="startDate" 
            :end="endDate"
            @change="bindDateChange"
          >
            <view class="picker">{{ date || '选择日期' }}</view>
          </picker>
          <picker mode="time" :value="time" @change="bindTimeChange">
            <view class="picker">{{ time || '选择时间' }}</view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 按钮 -->
    <view class="btn-group">
      <button class="btn-primary" @click="saveOrder">保存修改</button>
      <button class="btn-white" @click="goBack">取消</button>
    </view>

    <!-- 底部版权 -->
    <view class="footer">@2025 赛博出行 版权所有</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const orderInfo = ref({
  from: '',  // 出发地地址+邮编
  to: '',    // 目的地地址+邮编
  time: ''
})

const date = ref('')
const time = ref('')

// 计算24小时后的日期作为最小可选日期
const startDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDate(tomorrow)
})

// 计算一年后的日期作为最大可选日期
const endDate = computed(() => {
  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 1)
  return formatDate(nextYear)
})

// 日期格式化
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function bindDateChange(e) {
  date.value = e.detail.value
  updateDateTime()
}

function bindTimeChange(e) {
  time.value = e.detail.value
  updateDateTime()
}

function updateDateTime() {
  if (date.value && time.value) {
    orderInfo.value.time = `${date.value} ${time.value}`
  }
}

function saveOrder() {
  if (!orderInfo.value.from || !orderInfo.value.to || !orderInfo.value.time) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none'
    })
    return
  }

  uni.showToast({
    title: '修改成功',
    icon: 'success'
  })

  setTimeout(() => {
    uni.reLaunch({
      url: '/pages/A0107_client_wait_driver_v01'
    })
  }, 1500)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  padding: 20px;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  display: flex;
    justify-content: space-between; /* 关键属性 */
  flex-direction: column;
}
.nav-bar {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}
.nav-bar .back {
  font-size: 16px;
  color: #333;
}
.nav-bar .title {
  flex: 1;
  text-align: center;
  font-size: 46px;
  font-weight: bold;
}
.form {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  height: fit-content; /* 关键修改 */
  overflow: visible; /* 确保内容不截断 */
    height: fit-content; /* 自动适应内容 */
}
.form-item {
  margin-bottom: 8px;
}
.label {
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.combined-field {
  width:97%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #f9f9f9;
  min-height: 80px;
}
.datetime-picker {
  display: flex;
  gap: 10px;
}
.picker {
  flex: 1;
  padding: 26px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #f9f9f9;
  text-align: center;
}

.btn-group {
  margin: 30px 0;
  display: flex;
  justify-content: space-around;
   margin-top: 10px;
}
.btn-primary {
  width: 45%;
  background-color: #007aff;
  color: #fff;
  border-radius: 20px;
  padding: 12px 0;
  font-size: 26px;
}
.btn-white {
  width: 45%;
  background-color: #fff;
  color: #333;
  border-radius: 20px;
  border: 1px solid #ddd;
  padding: 12px 0;
  font-size: 26px;
}
.footer {
  text-align: center;
  font-size: 12px;
  color: #777;
  padding: 10px 0;
  margin-top: auto;
}
</style>