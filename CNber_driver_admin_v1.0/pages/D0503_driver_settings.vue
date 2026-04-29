<template>
  <view class="settings-page">
    <view class="title">设置中心</view>

    <view class="form-card">
      <view class="section-title">账号安全</view>
      <input v-model="account.phone" class="input" placeholder="当前手机号 / 修改手机号" />
      <input v-model="account.email" class="input" placeholder="当前邮箱 / 修改邮箱" />
      <input v-model="account.oldPassword" class="input" password placeholder="旧密码（修改密码时填写）" />
      <input v-model="account.newPassword" class="input" password placeholder="新密码" />
      <button class="secondary-btn" :loading="accountSaving" :disabled="accountSaving" @click="saveAccount">
        保存账号安全
      </button>
      <button class="danger-btn" @click="logout">退出登录</button>
    </view>

    <view class="form-card">
      <view class="section-title">个人信息</view>
      <input v-model="profile.personal.realName" class="input" placeholder="姓名" />
      <input v-model="profile.personal.phone" class="input" placeholder="手机号" />
      <input v-model="profile.personal.email" class="input" placeholder="邮箱" />
      <input v-model="profile.personal.address" class="input" placeholder="地址" />
    </view>

    <view class="form-card">
      <view class="section-title">驾驶信息</view>
      <input v-model="profile.license.licenseNo" class="input" placeholder="驾照号" />
      <picker mode="date" :value="licenseDate" @change="onLicenseDateChange">
        <view class="picker-field">{{ licenseDate || '驾照有效期' }}</view>
      </picker>
    </view>

    <view class="form-card">
      <view class="section-title">收款信息</view>
      <radio-group class="method-group" @change="onPaymentMethodChange">
        <label class="method-option">
          <radio value="alipay" :checked="profile.payment.defaultMethod === 'alipay'" />
          <text>支付宝</text>
        </label>
        <label class="method-option">
          <radio value="wechat" :checked="profile.payment.defaultMethod === 'wechat'" />
          <text>微信</text>
        </label>
      </radio-group>
      <input v-model="profile.payment.alipayName" class="input" placeholder="支付宝姓名" />
      <input v-model="profile.payment.alipayAccount" class="input" placeholder="支付宝账号" />
      <input v-model="profile.payment.wechatName" class="input" placeholder="微信姓名" />
      <input v-model="profile.payment.wechatAccount" class="input" placeholder="微信号" />
      <view class="hint">平台将按司机默认收款方式线下打款。</view>
    </view>

    <view class="form-card">
      <view class="section-title">车辆信息</view>
      <input v-model="profile.vehicle.plateNo" class="input" placeholder="车牌号" />
      <input v-model="profile.vehicle.model" class="input" placeholder="车型" />
      <input v-model.number="profile.vehicle.seats" class="input" type="number" placeholder="座位数" />
      <picker mode="date" :value="motDate" @change="onMotDateChange">
        <view class="picker-field">{{ motDate || 'MOT 到期日' }}</view>
      </picker>
      <picker mode="date" :value="insuranceDate" @change="onInsuranceDateChange">
        <view class="picker-field">{{ insuranceDate || '保险到期日' }}</view>
      </picker>
    </view>

    <view class="form-card">
      <view class="section-title">资质材料</view>
      <view class="doc-row">
        <text>驾照照片</text>
        <button class="upload-btn" @click="showUploadComingSoon">上传</button>
      </view>
      <view class="doc-row">
        <text>车辆保险</text>
        <button class="upload-btn" @click="showUploadComingSoon">上传</button>
      </view>
      <view class="doc-row">
        <text>MOT 文件</text>
        <button class="upload-btn" @click="showUploadComingSoon">上传</button>
      </view>
      <view class="review-box">
        审核状态：{{ reviewStatusText }}
        <text v-if="profile.documents.reviewRemark">（{{ profile.documents.reviewRemark }}）</text>
      </view>
    </view>

    <button class="save-btn" :loading="saving" :disabled="saving" @click="saveProfile">
      保存资料
    </button>

    <view class="setting-group">
      <view class="setting-item" @click="go('/pages/D0506_driver_feedback')">
        <text>意见反馈</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @click="go('/pages/D0504_driver_privacy_policy')">
        <text>隐私政策</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @click="go('/pages/D0505_driver_terms_of_service')">
        <text>服务条款</text>
        <text class="arrow">›</text>
      </view>
    </view>

  </view>
</template>

<script>
import { getDriverProfile, updateDriverAccount, updateDriverProfile } from '../utils/driverApi.js'

function emptyProfile() {
  return {
    personal: {
      realName: '',
      phone: '',
      email: '',
      address: ''
    },
    license: {
      licenseNo: '',
      licenseExpireAt: ''
    },
    payment: {
      defaultMethod: 'alipay',
      alipayName: '',
      alipayAccount: '',
      wechatName: '',
      wechatAccount: ''
    },
    vehicle: {
      plateNo: '',
      model: '',
      seats: '',
      motExpireAt: '',
      insuranceExpireAt: ''
    },
    documents: {
      licenseImage: '',
      insuranceImage: '',
      motImage: '',
      reviewStatus: 'pending',
      reviewRemark: ''
    }
  }
}

function toDateInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default {
  name: 'D0503_driver_settings',
  data() {
    return {
      profile: emptyProfile(),
      account: {
        phone: '',
        email: '',
        oldPassword: '',
        newPassword: ''
      },
      saving: false,
      accountSaving: false
    }
  },
  computed: {
    licenseDate() {
      return toDateInput(this.profile.license.licenseExpireAt)
    },
    motDate() {
      return toDateInput(this.profile.vehicle.motExpireAt)
    },
    insuranceDate() {
      return toDateInput(this.profile.vehicle.insuranceExpireAt)
    },
    reviewStatusText() {
      const map = {
        pending: '待审核',
        approved: '已通过',
        rejected: '未通过'
      }
      return map[this.profile.documents.reviewStatus] || '待审核'
    }
  },
  onShow() {
    this.fetchProfile()
  },
  methods: {
    async fetchProfile() {
      try {
        const data = await getDriverProfile()
        this.profile = {
          ...emptyProfile(),
          ...data,
          personal: { ...emptyProfile().personal, ...(data.personal || {}) },
          license: { ...emptyProfile().license, ...(data.license || {}) },
          payment: { ...emptyProfile().payment, ...(data.payment || {}) },
          vehicle: { ...emptyProfile().vehicle, ...(data.vehicle || {}) },
          documents: { ...emptyProfile().documents, ...(data.documents || {}) }
        }
        this.account.phone = this.profile.personal.phone
        this.account.email = this.profile.personal.email
      } catch (error) {
        /* request 内已提示 */
      }
    },
    onLicenseDateChange(e) {
      this.profile.license.licenseExpireAt = e.detail.value
    },
    onMotDateChange(e) {
      this.profile.vehicle.motExpireAt = e.detail.value
    },
    onInsuranceDateChange(e) {
      this.profile.vehicle.insuranceExpireAt = e.detail.value
    },
    onPaymentMethodChange(e) {
      this.profile.payment.defaultMethod = e.detail.value
    },
    showUploadComingSoon() {
      uni.showToast({
        title: '资料上传功能即将开放，请联系客服提交材料',
        icon: 'none',
        duration: 2500
      })
    },
    async saveAccount() {
      if (this.accountSaving) return
      this.accountSaving = true
      try {
        const data = await updateDriverAccount({
          phone: this.account.phone,
          email: this.account.email,
          oldPassword: this.account.oldPassword,
          newPassword: this.account.newPassword
        })
        this.account.phone = data.phone || this.account.phone
        this.account.email = data.email || this.account.email
        this.account.oldPassword = ''
        this.account.newPassword = ''
        this.profile.personal.phone = this.account.phone
        this.profile.personal.email = this.account.email
        uni.showToast({ title: '保存成功', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error?.message || '保存失败，请稍后重试', icon: 'none' })
      } finally {
        this.accountSaving = false
      }
    },
    async saveProfile() {
      if (this.saving) return
      this.saving = true
      try {
        const payload = {
          realName: this.profile.personal.realName,
          phone: this.profile.personal.phone,
          email: this.profile.personal.email,
          address: this.profile.personal.address,
          licenseNo: this.profile.license.licenseNo,
          licenseExpireAt: this.licenseDate,
          payment: this.profile.payment,
          vehicle: {
            ...this.profile.vehicle,
            motExpireAt: this.motDate,
            insuranceExpireAt: this.insuranceDate
          },
          documents: {
            licenseImage: this.profile.documents.licenseImage,
            insuranceImage: this.profile.documents.insuranceImage,
            motImage: this.profile.documents.motImage
          }
        }
        const data = await updateDriverProfile(payload)
        this.profile = {
          ...emptyProfile(),
          ...data,
          personal: { ...emptyProfile().personal, ...(data.personal || {}) },
          license: { ...emptyProfile().license, ...(data.license || {}) },
          payment: { ...emptyProfile().payment, ...(data.payment || {}) },
          vehicle: { ...emptyProfile().vehicle, ...(data.vehicle || {}) },
          documents: { ...emptyProfile().documents, ...(data.documents || {}) }
        }
        uni.showToast({ title: '保存成功', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
      } finally {
        this.saving = false
      }
    },
    go(url) {
      uni.navigateTo({ url });
    },
    logout() {
      uni.showModal({
        title: '确认退出登录？',
        success: res => {
          if (res.confirm) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('user')
            uni.reLaunch({ url: '/pages/D0002_driver_login' });
          }
        }
      });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.settings-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 30rpx;
  }

  .form-card {
    background-color: white;
    border-radius: 20rpx;
    padding: 28rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.08);
  }

  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: $color-text-main;
    margin-bottom: 20rpx;
  }

  .input,
  .picker-field {
    width: 100%;
    box-sizing: border-box;
    min-height: 88rpx;
    line-height: 88rpx;
    padding: 0 24rpx;
    margin-bottom: 18rpx;
    border-radius: 14rpx;
    background: #f8fafc;
    border: 1rpx solid #e2e8f0;
    color: $color-text-main;
    font-size: 28rpx;
  }

  .method-group {
    display: flex;
    gap: 40rpx;
    margin-bottom: 20rpx;
  }

  .method-option {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 28rpx;
    color: $color-text-main;
  }

  .hint {
    font-size: 24rpx;
    color: $color-text-light;
    line-height: 1.6;
  }

  .save-btn {
    width: 100%;
    margin: 10rpx 0 28rpx;
    border-radius: 18rpx;
    background: linear-gradient(90deg, #facc15, #f97316);
    color: #111827;
    font-size: 32rpx;
    font-weight: bold;
  }

  .secondary-btn {
    width: 100%;
    border-radius: 16rpx;
    background: #fff7ed;
    color: $color-primary;
    font-size: 30rpx;
    font-weight: bold;
  }

  .danger-btn {
    width: 100%;
    margin-top: 18rpx;
    border-radius: 16rpx;
    background: #fee2e2;
    color: #b91c1c;
    font-size: 30rpx;
    font-weight: bold;
  }

  .doc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22rpx 0;
    border-bottom: 1rpx solid $color-divider;
    font-size: 28rpx;
    color: $color-text-main;
  }

  .upload-btn {
    width: 150rpx;
    height: 64rpx;
    line-height: 64rpx;
    padding: 0;
    border-radius: 999rpx;
    background: #fff7ed;
    color: $color-primary;
    font-size: 26rpx;
  }

  .review-box {
    margin-top: 20rpx;
    padding: 18rpx 20rpx;
    border-radius: 14rpx;
    background: #f8fafc;
    color: $color-text-light;
    font-size: 26rpx;
    line-height: 1.5;
  }

  .setting-group {
    background-color: white;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 30rpx;
      font-size: 30rpx;
      color: $color-text-main;
      border-bottom: 1rpx solid $color-divider;

      &:last-child {
        border-bottom: none;
      }

      .arrow {
        font-size: 36rpx;
        color: $color-text-light;
      }
    }
  }

}
</style>
