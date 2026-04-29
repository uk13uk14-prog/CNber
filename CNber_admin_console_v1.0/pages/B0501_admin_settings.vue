<template>
  <scroll-view scroll-y class="page">
    <view class="pad">
      <AdminSectionTitle title="接口" />
      <view class="card">
        <text class="lab">API Base（不含末尾 /）</text>
        <input v-model="base" class="inp" placeholder="http://localhost:3100/api" />
        <button class="btn" type="primary" @click="saveBase">保存地址</button>
      </view>

      <AdminSectionTitle title="环境" />
      <view class="card">
        <text class="row">当前环境：{{ envLabel }}</text>
        <text class="row muted">实际请求：{{ displayBase }}</text>
      </view>

      <AdminSectionTitle title="维护" />
      <view class="card">
        <button class="btn ghost" @click="ping">测试连接 GET /status</button>
        <button class="btn ghost" @click="clearCache">清缓存（仅本应用 Storage）</button>
      </view>

      <AdminSectionTitle title="关于" />
      <view class="card">
        <text class="row">版本：1.0.0</text>
        <text class="row muted">CNber_admin_console_v1.0</text>
      </view>
    </view>
  </scroll-view>
</template>

<script>
import AdminSectionTitle from '../components/AdminSectionTitle.vue'
import {
  getBaseUrl,
  getEnvLabel,
  STORAGE_API_BASE
} from '../config/api.js'
import { get } from '../utils/request.js'
import { clearSession } from '../store/session.js'

export default {
  components: { AdminSectionTitle },
  data() {
    return {
      base: ''
    }
  },
  computed: {
    envLabel() {
      return getEnvLabel()
    },
    displayBase() {
      return getBaseUrl()
    }
  },
  onShow() {
    this.base = getBaseUrl()
  },
  methods: {
    saveBase() {
      const v = (this.base || '').trim()
      if (!v) {
        uni.showToast({ title: '请输入地址', icon: 'none' })
        return
      }
      uni.setStorageSync(STORAGE_API_BASE, v)
      uni.showToast({ title: '已保存', icon: 'success' })
    },
    async ping() {
      try {
        await get(
          'status',
          {},
          { skipAuth: true, showErrorToast: true }
        )
        uni.showToast({ title: '连接正常', icon: 'success' })
      } catch (e) {
        /* */
      }
    },
    clearCache() {
      try {
        clearSession()
        uni.removeStorageSync(STORAGE_API_BASE)
      } catch (e) {
        /* */
      }
      uni.showToast({ title: '已清理', icon: 'none' })
      uni.reLaunch({ url: '/pages/B0001_admin_login' })
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page {
  height: 100vh;
}
.pad {
  padding: $admin-page-pad;
  padding-bottom: 120rpx;
}
.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 24rpx;
  border: 1rpx solid $admin-border;
  margin-bottom: 8rpx;
}
.lab {
  font-size: 24rpx;
  color: $admin-text-secondary;
  display: block;
  margin-bottom: 8rpx;
}
.inp {
  border: 1rpx solid $admin-border;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  margin-bottom: 12rpx;
}
.btn {
  margin-top: 8rpx;
  background: $admin-primary;
  border-radius: 12rpx;
}
.btn.ghost {
  margin-top: 16rpx;
  background: #fff;
  color: $admin-primary;
  border: 1rpx solid $admin-border;
}
.row {
  display: block;
  font-size: 28rpx;
  margin-bottom: 8rpx;
}
.muted {
  color: $admin-text-secondary;
  font-size: 24rpx;
}
</style>
