<template> 
  <view class="container">
    <!-- 顶部返回 + 标题 -->
    <view class="header">
      <view class="back-btn" @tap="goBack"></view>
      <view class="title"></view>
    </view>
    
    <view class="form-card">
      <!-- 出发地址 -->
      <view class="address-block">
        <view class="label">起点</view>
        <input v-model="pickupAddress.postcode" type="text" placeholder="Postcode (e.g. SW1A 1AA)" class="pickup-address" @input="onPickupPostcodeInput" />
        <view class="location-hint" v-if="pickupLookupHint">📍 已识别：{{ pickupLookupHint }}</view>
        <view class="lookup-error" v-if="pickupLookupError">{{ pickupLookupError }}</view>
        <input v-model="pickupAddress.address" type="text" placeholder="Street / Area" class="pickup-address" />
        <input v-model="pickupAddress.detail" type="text" placeholder="Flat / Door / Note" class="pickup-address" />
      </view>

      <!-- 目的地址 -->
      <view class="address-block">
        <view class="label">终点</view>
        <input v-model="dropoffAddress.postcode" type="text" placeholder="Postcode (e.g. E14 5AB)" class="dropoff-address" @input="onDropoffPostcodeInput" />
        <view class="location-hint" v-if="dropoffLookupHint">📍 已识别：{{ dropoffLookupHint }}</view>
        <view class="lookup-error" v-if="dropoffLookupError">{{ dropoffLookupError }}</view>
        <input v-model="dropoffAddress.address" type="text" placeholder="Street / Area" class="dropoff-address" />
        <input v-model="dropoffAddress.detail" type="text" placeholder="Flat / Door / Note" class="dropoff-address" />
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
      <view class="price">待后台报价</view>
      <button class="submit-btn" @click="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted, onMounted } from 'vue'
import { createRideOrder } from '../utils/orderApi.js'
import { validateScheduledAt24h, buildScheduledAtIso } from '../utils/clientBookingFlow.js'
import { lookupAddressByPostcode } from '../utils/addressApi.js'
import { loadVehicleOptions, vehicleClassFromLabel } from '../utils/vehicleOptions.js'

const vehicleList = ref([])

onMounted(async () => {
  vehicleList.value = await loadVehicleOptions()
})
const pickupAddress = ref({
  postcode: '',
  address: '',
  detail: '',
  longitude: null,
  latitude: null
})
const dropoffAddress = ref({
  postcode: '',
  address: '',
  detail: '',
  longitude: null,
  latitude: null
})
const pickupLookupLoading = ref(false)
const dropoffLookupLoading = ref(false)
const pickupLookupHint = ref('')
const dropoffLookupHint = ref('')
const pickupLookupError = ref('')
const dropoffLookupError = ref('')
let pickupPostcodeTimer = null
let dropoffPostcodeTimer = null

const POSTCODE_DEBOUNCE_MS = 800
const MIN_POSTCODE_LENGTH = 5

// 设置最小日期为明天
const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(today.getDate() + 1)
const minDate = tomorrow.toISOString().split('T')[0]

const form = ref({
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

function normalizeLookupData(res) {
  return res?.data || res || {}
}

function buildAreaText(data) {
  return `${data?.city || ''}${data?.region ? ' / ' + data.region : ''}`
}

function normalizePostcodeInput(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function clearPostcodeTimer(timerName) {
  if (timerName === 'pickup' && pickupPostcodeTimer) {
    clearTimeout(pickupPostcodeTimer)
    pickupPostcodeTimer = null
  }
  if (timerName === 'dropoff' && dropoffPostcodeTimer) {
    clearTimeout(dropoffPostcodeTimer)
    dropoffPostcodeTimer = null
  }
}

function resetLookupState(targetRef, hintRef, errorRef) {
  hintRef.value = ''
  errorRef.value = ''
  targetRef.value.longitude = null
  targetRef.value.latitude = null
}

function schedulePostcodeLookup(targetRef, loadingRef, hintRef, errorRef, timerName) {
  resetLookupState(targetRef, hintRef, errorRef)
  clearPostcodeTimer(timerName)

  if (normalizePostcodeInput(targetRef.value.postcode).length < MIN_POSTCODE_LENGTH) return

  const timer = setTimeout(() => {
    lookupPostcode(targetRef, loadingRef, hintRef, errorRef)
  }, POSTCODE_DEBOUNCE_MS)

  if (timerName === 'pickup') {
    pickupPostcodeTimer = timer
  } else {
    dropoffPostcodeTimer = timer
  }
}

async function lookupPostcode(targetRef, loadingRef, hintRef, errorRef) {
  const postcode = normalizePostcodeInput(targetRef.value.postcode)
  if (!postcode) return

  loadingRef.value = true
  hintRef.value = ''
  errorRef.value = ''
  try {
    const res = await lookupAddressByPostcode(postcode, { showErrorToast: false })
    const data = normalizeLookupData(res)
    const recognizedArea = buildAreaText(data)

    targetRef.value.postcode = data?.postcode || targetRef.value.postcode
    targetRef.value.address = recognizedArea
    targetRef.value.longitude = data?.longitude ?? null
    targetRef.value.latitude = data?.latitude ?? null
    hintRef.value = recognizedArea
  } catch (e) {
    errorRef.value = '邮编不存在，请检查后重新输入'
  } finally {
    loadingRef.value = false
  }
}

function onPickupPostcodeInput() {
  schedulePostcodeLookup(
    pickupAddress,
    pickupLookupLoading,
    pickupLookupHint,
    pickupLookupError,
    'pickup'
  )
}

function onDropoffPostcodeInput() {
  schedulePostcodeLookup(
    dropoffAddress,
    dropoffLookupLoading,
    dropoffLookupHint,
    dropoffLookupError,
    'dropoff'
  )
}

async function submitOrder() {
  if (!uni.getStorageSync('token')) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (!form.value.pickupDate) return uni.showToast({ title: '请选择出发日期', icon: 'none' })
  if (!form.value.pickupTime) return uni.showToast({ title: '请选择出发时间', icon: 'none' })
  if (!pickupAddress.value.postcode || !pickupAddress.value.address) {
    return uni.showToast({ title: '请输入完整地址（邮编 + 地址）', icon: 'none' })
  }
  if (!dropoffAddress.value.postcode || !dropoffAddress.value.address) {
    return uni.showToast({ title: '请输入完整地址（邮编 + 地址）', icon: 'none' })
  }
  if (!form.value.vehicle) return uni.showToast({ title: '请选择车型', icon: 'none' })
  if (!form.value.phone) return uni.showToast({ title: '请输入电话', icon: 'none' })

  const scheduleCheck = validateScheduledAt24h(
    buildScheduledAtIso(form.value.pickupDate, form.value.pickupTime)
  )
  if (!scheduleCheck.ok) {
    return uni.showToast({ title: scheduleCheck.message, icon: 'none' })
  }

  const pickup = pickupAddress.value.address.trim()
  const destination = dropoffAddress.value.address.trim()

  try {
    const data = await createRideOrder(pickup, destination, 'charter', {
      pickupPostcode: pickupAddress.value.postcode.trim(),
      dropoffPostcode: dropoffAddress.value.postcode.trim(),
      pickupDetail: `${pickupAddress.value.detail.trim()} | ${form.value.pickupDate} ${form.value.pickupTime} | ${form.value.vehicle} | 电话${form.value.phone}`.trim(),
      dropoffDetail: dropoffAddress.value.detail.trim(),
      scheduledAt: scheduleCheck.scheduledAt.toISOString(),
      vehicleClass: vehicleClassFromLabel(form.value.vehicle),
      vehicleLabel: form.value.vehicle
    })
    const oid = data?.order?._id
    uni.showToast({ title: '下单成功', icon: 'success' })
    setTimeout(() => {
      if (oid) {
        uni.navigateTo({
          url: `/pages/A0106_client_payment_v01?orderId=${encodeURIComponent(oid)}`
        })
      } else {
        uni.navigateTo({ url: '/pages/A0107_client_wait_driver_v01' })
      }
    }, 600)
  } catch (e) {
    /* request 内已 toast */
  }
}

function goBack() {
  uni.navigateBack()
}

onUnmounted(() => {
  clearPostcodeTimer('pickup')
  clearPostcodeTimer('dropoff')
})
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
.address-block {
  margin-bottom: 20rpx;
}
.address-block .label {
  font-weight: bold;
  margin-bottom: 10rpx;
}
.address-block input + input {
  margin-top: 10rpx;
}
.location-hint {
  font-size: 24rpx;
  color: #666;
  margin: 10rpx 0;
}
.lookup-error {
  font-size: 24rpx;
  color: #d93025;
  margin: 10rpx 0;
}
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