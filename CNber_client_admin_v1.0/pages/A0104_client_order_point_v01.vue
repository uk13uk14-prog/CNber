<template>
  <view class="container">
    <view class="header">
      <view class="back-btn" @tap="goBack">返回</view>
      <view class="title">创建订单</view>
      <view class="placeholder"></view>
    </view>

    <view class="form-card">
      <view class="field">
        <text class="label">起点</text>
        <input
          v-model="pickupAddress.postcode"
          type="text"
          placeholder="Postcode (e.g. SW1A 1AA)"
          class="address-input"
          @input="onPickupPostcodeInput"
        />
        <view class="location-hint" v-if="pickupLookupHint">
          📍 已识别：{{ pickupLookupHint }}
        </view>
        <view class="lookup-error" v-if="pickupLookupError">
          {{ pickupLookupError }}
        </view>
        <input
          v-model="pickupAddress.address"
          type="text"
          placeholder="Street / Area"
          class="address-input"
        />
        <input
          v-model="pickupAddress.detail"
          type="text"
          placeholder="Flat / Door / Note"
          class="address-input"
        />
      </view>

      <view class="field">
        <text class="label">终点</text>
        <input
          v-model="dropoffAddress.postcode"
          type="text"
          placeholder="Postcode (e.g. E14 5AB)"
          class="address-input"
          @input="onDropoffPostcodeInput"
        />
        <view class="location-hint" v-if="dropoffLookupHint">
          📍 已识别：{{ dropoffLookupHint }}
        </view>
        <view class="lookup-error" v-if="dropoffLookupError">
          {{ dropoffLookupError }}
        </view>
        <input
          v-model="dropoffAddress.address"
          type="text"
          placeholder="Street / Area"
          class="address-input"
        />
        <input
          v-model="dropoffAddress.detail"
          type="text"
          placeholder="Flat / Door / Note"
          class="address-input"
        />
      </view>

      <view class="field">
        <text class="label">预约日期</text>
        <picker mode="date" :start="minScheduleDate" @change="(e) => (scheduleDate = e.detail.value)">
          <view class="address-input picker-like">{{ scheduleDate || '请选择日期' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">预约时间</text>
        <picker mode="time" @change="(e) => (scheduleTime = e.detail.value)">
          <view class="address-input picker-like">{{ scheduleTime || '请选择时间' }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">车型</text>
        <picker mode="selector" :range="vehicleList" @change="onVehicleChange">
          <view class="address-input picker-like">{{ selectedVehicleLabel || '请选择车型' }}</view>
        </picker>
      </view>

      <button class="submit-btn" :loading="submitting" @click="submitOrder">
        下单
      </button>
    </view>
  </view>
</template>

<script setup>
import { onUnmounted, reactive, ref, onMounted } from 'vue'
import { lookupAddressByPostcode } from '../utils/addressApi.js'
import { createRideOrder } from '../utils/orderApi.js'
import { validateScheduledAt24h, buildScheduledAtIso } from '../utils/clientBookingFlow.js'
import { loadVehicleOptions, vehicleClassFromLabel } from '../utils/vehicleOptions.js'

const vehicleList = ref([])
const selectedVehicleLabel = ref('')

const scheduleDate = ref('')
const scheduleTime = ref('')
const minScheduleDate = ref('')
const today = new Date()
today.setDate(today.getDate() + 1)
minScheduleDate.value = today.toISOString().split('T')[0]

const pickupAddress = reactive({
  postcode: '',
  address: '',
  detail: '',
  longitude: null,
  latitude: null
})
const dropoffAddress = reactive({
  postcode: '',
  address: '',
  detail: '',
  longitude: null,
  latitude: null
})
const submitting = ref(false)
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

function normalizeLookupData(res) {
  return res?.data || res || {}
}

function buildAreaText(data) {
  return `${data?.city || ''}${data?.region ? ' / ' + data.region : ''}`
}

function normalizePostcodeInput(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function resetLookupState(target, hintRef, errorRef) {
  hintRef.value = ''
  errorRef.value = ''
  target.longitude = null
  target.latitude = null
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

function schedulePostcodeLookup(target, loadingRef, hintRef, errorRef, timerName) {
  resetLookupState(target, hintRef, errorRef)
  clearPostcodeTimer(timerName)

  if (normalizePostcodeInput(target.postcode).length < MIN_POSTCODE_LENGTH) return

  const timer = setTimeout(() => {
    lookupPostcode(target, loadingRef, hintRef, errorRef, { showToast: false })
  }, POSTCODE_DEBOUNCE_MS)

  if (timerName === 'pickup') {
    pickupPostcodeTimer = timer
  } else {
    dropoffPostcodeTimer = timer
  }
}

async function lookupPostcode(target, loadingRef, hintRef, errorRef, options = {}) {
  const postcode = normalizePostcodeInput(target.postcode)
  if (!postcode) {
    uni.showToast({ title: '请输入邮编', icon: 'none' })
    return
  }

  loadingRef.value = true
  hintRef.value = ''
  errorRef.value = ''
  try {
    const res = await lookupAddressByPostcode(postcode, {
      showErrorToast: options.showToast !== false
    })
    const data = normalizeLookupData(res)
    const recognizedArea = buildAreaText(data)

    target.postcode = data?.postcode || target.postcode
    target.address = recognizedArea
    target.longitude = data?.longitude ?? null
    target.latitude = data?.latitude ?? null
    hintRef.value = recognizedArea
  } catch (e) {
    errorRef.value = '邮编不存在，请检查后重新输入'
    if (options.showToast !== false) {
      uni.showToast({ title: '邮编不存在，请检查后重新输入', icon: 'none' })
    }
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

function onVehicleChange(e) {
  selectedVehicleLabel.value = vehicleList[e.detail.value] || ''
}

const submitOrder = async () => {
  const token = uni.getStorageSync('token')

  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  if (!pickupAddress.postcode || !pickupAddress.address) {
    uni.showToast({ title: '请输入完整地址（邮编 + 地址）', icon: 'none' })
    return
  }

  if (!dropoffAddress.postcode || !dropoffAddress.address) {
    uni.showToast({ title: '请输入完整地址（邮编 + 地址）', icon: 'none' })
    return
  }

  if (!scheduleDate.value || !scheduleTime.value) {
    uni.showToast({ title: '请选择预约日期和时间', icon: 'none' })
    return
  }

  if (!selectedVehicleLabel.value) {
    uni.showToast({ title: '请选择车型', icon: 'none' })
    return
  }

  const scheduleCheck = validateScheduledAt24h(
    buildScheduledAtIso(scheduleDate.value, scheduleTime.value)
  )
  if (!scheduleCheck.ok) {
    uni.showToast({ title: scheduleCheck.message, icon: 'none' })
    return
  }

  submitting.value = true

  try {
    const data = await createRideOrder(
      pickupAddress.address,
      dropoffAddress.address,
      'point',
      {
        pickupPostcode: pickupAddress.postcode.trim(),
        dropoffPostcode: dropoffAddress.postcode.trim(),
        pickupDetail: `${pickupAddress.detail.trim()} | ${scheduleDate.value} ${scheduleTime.value}`.trim(),
        dropoffDetail: dropoffAddress.detail.trim(),
        scheduledAt: scheduleCheck.scheduledAt.toISOString(),
        vehicleClass: vehicleClassFromLabel(selectedVehicleLabel.value),
        vehicleLabel: selectedVehicleLabel.value
      }
    )
    const oid = data?.order?._id

    uni.showToast({ title: '下单成功', icon: 'success' })
    setTimeout(() => {
      if (oid) {
        uni.navigateTo({
          url: `/pages/A0106_client_payment_v01?orderId=${encodeURIComponent(oid)}`
        })
      } else {
        uni.navigateTo({
          url: '/pages/A0107_client_wait_driver_v01'
        })
      }
    }, 800)
  } catch (error) {
    /* 封装内已提示 */
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}

onMounted(async () => {
  vehicleList.value = await loadVehicleOptions()
})

onUnmounted(() => {
  clearPostcodeTimer('pickup')
  clearPostcodeTimer('dropoff')
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 32rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.back-btn,
.placeholder {
  width: 120rpx;
  font-size: 28rpx;
  color: #333;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 40rpx;
  font-weight: bold;
  color: #111;
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.field {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 600;
}

.address-input {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  box-sizing: border-box;
  background: #f7f8fa;
  border: 2rpx solid #e5e7eb;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #111;
}
.address-input + .address-input {
  margin-top: 16rpx;
}
.location-hint {
  font-size: 24rpx;
  color: #666;
  margin-top: 10rpx;
}
.lookup-error {
  font-size: 24rpx;
  color: #d93025;
  margin-top: 10rpx;
}

.submit-btn {
  margin-top: 20rpx;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: #fff;
  border: none;
  border-radius: 999rpx;
  font-size: 32rpx;
  padding: 24rpx 0;
}
</style>