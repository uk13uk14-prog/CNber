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
        <input v-model="pickupAddress.postcode" type="text" placeholder="Postcode (e.g. SW1A 1AA)" class="dropoff-address" @input="onPickupPostcodeInput" />
        <view class="location-hint" v-if="pickupLookupHint">📍 已识别：{{ pickupLookupHint }}</view>
        <view class="lookup-error" v-if="pickupLookupError">{{ pickupLookupError }}</view>
        <input v-model="pickupAddress.address" type="text" placeholder="Street / Area" class="dropoff-address" />
        <input v-model="pickupAddress.detail" type="text" placeholder="Flat / Door / Note" class="dropoff-address" />
      </view>

      <!-- 送机日期 + 送机时间 -->
      <view class="row-2">
        <picker mode="date" :start="minDate" @change="(e) => form.pickupDate = e.detail.value">
          <view class="picker pickup-date">{{ form.pickupDate || '送机日期' }}</view>
        </picker>
        <picker mode="time" @change="(e) => form.pickupTime = e.detail.value">
          <view class="picker pickup-time">{{ form.pickupTime || '送机时间' }}</view>
        </picker>
      </view>

      <!-- 送达机场 + 航站楼 + 航班号 -->
      <view class="row-3">
        <picker :range="airportDisplayList" @change="onAirportChange">
          <view class="picker airport-picker">{{ selectedAirport || '送达机场' }}</view>
        </picker>
        <picker :range="terminalOptions" @change="onTerminalChange">
          <view class="picker terminal-picker">{{ selectedTerminal || '航站楼' }}</view>
        </picker>
        <input v-model="form.flightNumber" type="text" placeholder="航班号" class="flight-number" />
      </view>

      <!-- 车型选择 -->
      <view class="row-full">
        <picker :range="vehicleList" @change="(e) => form.vehicle = vehicleList[e.detail.value]">
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

      <!-- 提示改为送机版 -->
      <view class="tip">
        🚗 提示：建议至少提前5小时出发，以防高峰期交通拥堵影响航班。
      </view>

      <!-- 婴儿座椅（已修复） -->
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

    <view class="footer">
      <view class="price">待后台报价</view>
      <button class="submit-btn" @click="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { createRideOrder } from '../utils/orderApi.js'
import { lookupAddressByPostcode } from '../utils/addressApi.js'

const airportList = [
  { zh: '希思罗机场', terminals: ['T2', 'T3', 'T4', 'T5'] },
  { zh: '盖特威克机场', terminals: ['南S', '北N'] },
  { zh: '伦敦城市机场', terminals: [] },
  { zh: '卢顿机场', terminals: [] },
  { zh: '桑德兰机场', terminals: [] },
  { zh: '伦敦周边其它机场', terminals: [] },
  { zh: '曼城机场', terminals: ['T1', 'T2', 'T3'] },
  { zh: '爱丁堡机场', terminals: [] },
  { zh: '贝尔法斯特机场', terminals: [] },
  { zh: '贝尔法斯特国际机场', terminals: [] },
  { zh: '爱尔兰机场', terminals: [] }
]
const airportCodeMap = {
  希思罗机场: 'LHR',
  盖特威克机场: 'LGW',
  伦敦城市机场: 'LCY',
  卢顿机场: 'LTN',
  曼城机场: 'MAN',
  爱丁堡机场: 'EDI',
  贝尔法斯特机场: 'BHD',
  贝尔法斯特国际机场: 'BFS'
}
const airportDisplayList = computed(() => airportList.map(item => item.zh))
const vehicleList = ['5座', '7座', '8座', '9座']

const selectedAirport = ref('')
const terminalOptions = ref([])
const selectedTerminal = ref('')
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
  detail: ''
})
const pickupLookupLoading = ref(false)
const pickupLookupHint = ref('')
const pickupLookupError = ref('')
let pickupPostcodeTimer = null

const POSTCODE_DEBOUNCE_MS = 800
const MIN_POSTCODE_LENGTH = 5

const minDate = ref('')
const today = new Date()
today.setDate(today.getDate() + 1)
minDate.value = today.toISOString().split('T')[0]

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

function handleBabySeatChange(e) {
  form.value.babySeat = e.detail.value
}

function onAirportChange(e) {
  const index = e.detail.value
  selectedAirport.value = airportDisplayList.value[index]
  terminalOptions.value = airportList[index].terminals
  selectedTerminal.value = ''
}

function onTerminalChange(e) {
  selectedTerminal.value = terminalOptions.value[e.detail.value]
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

function clearPickupPostcodeTimer() {
  if (pickupPostcodeTimer) {
    clearTimeout(pickupPostcodeTimer)
    pickupPostcodeTimer = null
  }
}

function resetPickupLookupState() {
  pickupLookupHint.value = ''
  pickupLookupError.value = ''
  pickupAddress.value.longitude = null
  pickupAddress.value.latitude = null
}

function onPickupPostcodeInput(e) {
  pickupAddress.value.postcode = e?.detail?.value || e?.target?.value || pickupAddress.value.postcode
  resetPickupLookupState()
  clearPickupPostcodeTimer()

  if (normalizePostcodeInput(pickupAddress.value.postcode).length < MIN_POSTCODE_LENGTH) return

  pickupPostcodeTimer = setTimeout(() => {
    lookupPickupPostcode()
  }, POSTCODE_DEBOUNCE_MS)
}

async function lookupPickupPostcode() {
  const postcode = normalizePostcodeInput(pickupAddress.value.postcode)
  if (!postcode) return

  pickupLookupLoading.value = true
  pickupLookupHint.value = ''
  pickupLookupError.value = ''
  try {
    const res = await lookupAddressByPostcode(postcode, { showErrorToast: false })
    const data = normalizeLookupData(res)
    const recognizedArea = buildAreaText(data)

    pickupAddress.value.postcode = data?.postcode || pickupAddress.value.postcode
    pickupAddress.value.address = recognizedArea
    pickupAddress.value.longitude = data?.longitude ?? null
    pickupAddress.value.latitude = data?.latitude ?? null
    pickupLookupHint.value = recognizedArea
  } catch (e) {
    pickupLookupError.value = '邮编不存在，请检查后重新输入'
  } finally {
    pickupLookupLoading.value = false
  }
}

async function submitOrder() {
  if (!uni.getStorageSync('token')) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (!pickupAddress.value.postcode || !pickupAddress.value.address) {
    return uni.showToast({ title: '请输入完整地址（邮编 + 地址）', icon: 'none' })
  }
  if (!form.value.pickupDate) return uni.showToast({ title: '请选择送机日期', icon: 'none' })
  if (!form.value.pickupTime) return uni.showToast({ title: '请选择送机时间', icon: 'none' })
  if (!selectedAirport.value) return uni.showToast({ title: '请选择送达机场', icon: 'none' })

  const matched = airportList.find(item => item.zh === selectedAirport.value)
  if (matched?.terminals?.length > 0 && !selectedTerminal.value) {
    return uni.showToast({ title: '请选择航站楼', icon: 'none' })
  }

  if (!form.value.flightNumber) return uni.showToast({ title: '请输入航班号', icon: 'none' })
  if (!form.value.vehicle) return uni.showToast({ title: '请选择车型', icon: 'none' })
  if (!form.value.phone) return uni.showToast({ title: '请输入电话', icon: 'none' })

  const term = selectedTerminal.value ? ` ${selectedTerminal.value}` : ''
  const airportCode = airportCodeMap[selectedAirport.value] || selectedAirport.value
  dropoffAddress.value = {
    postcode: airportCode,
    address: selectedAirport.value,
    detail: `${term} 航班${form.value.flightNumber}`.trim()
  }
  const pickup = pickupAddress.value.address.trim()
  const destination = dropoffAddress.value.address

  try {
    await createRideOrder(pickup, destination, 'dropoff', {
      airport: airportCode,
      dropoffAirport: airportCode,
      pickupPostcode: pickupAddress.value.postcode.trim(),
      dropoffPostcode: dropoffAddress.value.postcode,
      pickupDetail: pickupAddress.value.detail.trim(),
      dropoffDetail: dropoffAddress.value.detail
    })
    uni.showToast({ title: '下单成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/A0107_client_wait_driver_v01' })
    }, 600)
  } catch (e) {
    /* request 内已 toast */
  }
}

function goBack() {
  uni.navigateBack()
}

onUnmounted(() => {
  clearPickupPostcodeTimer()
})
</script>

<style scoped>
.container {
  background: #fff5ba;
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
  font-size: 18rpx;
  top: 50rpx;
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

.airport-picker { width: 100%; }
.terminal-picker { width: 90%; }
.flight-number { width: 100%; }
.pickup-date { width: 100%; }
.pickup-time { width: 87%; }
.dropoff-address { width: 100%; }
.vehicle-picker { width: 100%; }
.adult-input { width: 100%; }
.under2-input { width: 100%; }
.age2to6-input { width: 100%; }
.phone-input { width: 100%; }
.wechat-input { width: 100%; }
.remarks-textarea { width: 100%; }

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
  margin-right: -100rpx;
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