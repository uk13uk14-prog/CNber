<template> 
  <view class="container">
    <!-- 顶部返回 + 标题 -->
    <view class="header">
      <view class="back-btn" @tap="goBack"></view>
      <view class="title"></view>
    </view>
    
    <view class="form-card">
      <!-- 出发地址 -->
      <view class="row-full">
        <input v-model="form.pickupAddress" type="text" placeholder="请输入出发地址" class="pickup-address" />
      </view>

      <!-- 目的地址 -->
      <view class="row-full">
        <input v-model="form.dropoffAddress" type="text" placeholder="请输入目的地地址" class="dropoff-address" />
      </view>

      <!-- 出发日期 + 出发时间 -->
      <view class="row-2">
        <picker mode="date" :value="form.pickupDate" :start="minDate" @change="(e) => form.pickupDate = e.detail.value">
          <view class="picker pickup-date">{{ form.pickupDate || '出发日期' }}</view>
        </picker>
        <picker mode="time" :value="form.pickupTime" @change="(e) => form.pickupTime = e.detail.value">
          <view class="picker pickup-time">{{ form.pickupTime || '出发时间' }}</view>
        </picker>
      </view>

      <!-- 车型选择 -->
      <view class="row-full">
        <picker mode="selector" :range="vehicleList" @change="(e) => form.vehicle = vehicleList[e.detail.value]">
          <view class="picker vehicle-picker">{{ form.vehicle || '请选择车型' }}</view>
        </picker>
      </view>

      <!-- 人数 -->
      <view class="row-3">
        <input v-model.number="form.adults" type="number" placeholder="成人" class="adult-input" />
        <input v-model.number="form.childrenUnder2" type="number" placeholder="2岁以下选填" class="under2-input" />
        <input v-model.number="form.children2To6" type="number" placeholder="2-6岁选填" class="age2to6-input" />
      </view>

      <!-- 电话 + 微信 -->
      <view class="row-2">
        <input v-model="form.phone" type="number" pattern="\d*" placeholder="电话" class="phone-input" @input="filterNumber('phone')" />
        <input v-model="form.wechat" type="text" placeholder="微信/WhatsApp" class="wechat-input" />
      </view>

      <!-- 备注 -->
      <view class="row-full">
        <textarea v-model="form.remarks" rows="2" placeholder="备注" class="remarks-textarea" />
      </view>

      <view class="tip">
        🚗 提示：建议您合理预留出发时间，避免因交通状况耽误行程。
      </view>

      <!-- 婴儿座椅 -->
      <view class="baby-seat">
        <view class="label">婴儿座椅</view>
        <radio-group @change="handleBabySeatChange">
          <label><radio value="none" :checked="form.babySeat === 'none'" /> 无</label>
          <label><radio value="0-2" :checked="form.babySeat === '0-2'" /> 0-2岁</label>
          <label><radio value="2-6" :checked="form.babySeat === '2-6'" /> 2-6岁</label>
        </radio-group>
        <view class="tip">英国法律规定，儿童必须要有儿童座椅，请自备，避免产生费用。</view>
      </view>
    </view>

    <!-- 底部固定 -->
    <view class="footer">
      <view class="price">预计价格：£{{ estimatedPrice }}</view>
      <button class="submit-btn" @click="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const vehicleList = ['5座', '7座', '8座', '9座']
const estimatedPrice = ref('0')

// 设置最小日期为明天
const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(today.getDate() + 1)
const minDate = tomorrow.toISOString().split('T')[0]

const form = ref({
  pickupAddress: '',
  dropoffAddress: '',
  pickupDate: '',
  pickupTime: '',
  flightNumber: '',
  vehicle: '',
  adults: '',
  childrenUnder2: '',
  children2To6: '',
  phone: '',
  wechat: '',
  remarks: '',
  babySeat: 'none'
})

// 新增婴儿座椅选择处理方法
function handleBabySeatChange(e) {
  form.value.babySeat = e.detail.value
}

function filterNumber(field) {
  form.value[field] = form.value[field].replace(/\D/g, '')
}

function submitOrder() {
  if (!form.value.pickupDate) return uni.showToast({ title: '请选择出发日期', icon: 'none' })
  if (!form.value.pickupTime) return uni.showToast({ title: '请选择出发时间', icon: 'none' })
  if (!form.value.pickupAddress) return uni.showToast({ title: '请输入出发地址', icon: 'none' })
  if (!form.value.dropoffAddress) return uni.showToast({ title: '请输入目的地地址', icon: 'none' })
  if (!form.value.vehicle) return uni.showToast({ title: '请选择车型', icon: 'none' })
  if (!form.value.phone) return uni.showToast({ title: '请输入电话', icon: 'none' })

  console.log('提交订单：', form.value)
  uni.showToast({
    title: '订单已提交',
    icon: 'success'
  })

  setTimeout(() => {
    uni.navigateTo({
      url: '/pages/A0106_client_payment_v01'
    })
  }, 800)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.container {
  background: #ffd1dc; /* 樱花粉 */
  min-height: 100vh;
  padding: 20rpx;
  position: relative;
}
.header {
  display: flex;
  align-items: center;
  margin-bottom: -15rpx;
}
.back-btn {
  position: absolute;
  top: 50rpx;
  font-size: 18rpx;
  color: #333;
  padding-right: 20rpx;
}
.title {
  font-size: 46rpx;
  font-weight: bold;
  flex: 1;
  text-align: center;
  margin-bottom: 30rpx;
}

.form-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 20rpx;
}
.row-3, .row-2, .row-full {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  gap: 10rpx;
}
.row-3 > * { flex: 1; }
.row-2 > * { flex: 1; }
.row-full > * { width: 94%; }
.picker, input, textarea {
  width: 100%;
  padding: 20rpx;
  border: 1px solid #ddd;
  border-radius: 10rpx;
  background: #f9f9f9;
}
.pickup-date { width: 100%; }
.pickup-time { width: 87%; }
textarea {
  min-height: 60rpx;
  resize: none;
}
.baby-seat {
  margin-top: 20rpx;
}
.baby-seat .label {
  font-weight: bold;
  margin-bottom: 10rpx;
}
.baby-seat radio-group {
  display: flex;
  gap: 20rpx;
  margin-bottom: 5rpx;
}
.baby-seat .tip,
.tip {
  font-size: 18rpx;
  color: #999;
  margin-top: 10rpx;
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-top: 1px solid #eee;
}
.price {
  font-size: 30rpx;
  font-weight: bold;
}
.submit-btn {
  background: #007aff;
  color: #fff;
  padding: 15rpx 100rpx;
  border-radius: 50rpx;
  font-size: 30rpx;
  border: none;
}
</style>