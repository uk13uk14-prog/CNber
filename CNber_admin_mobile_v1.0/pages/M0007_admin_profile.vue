<template>
  <scroll-view scroll-y class="page">
    <view class="pad">
      <view class="profile-hero">
        <view class="avatar">{{ avatarText }}</view>
        <text class="name">{{ user?.phone || '—' }}</text>
        <text class="role">{{ roleLabel }}</text>
      </view>

      <AdminSectionTitle title="账号信息" />
      <view class="card">
        <view class="info-row">
          <text class="label">登录标识</text>
          <text class="value">{{ user?.phone || '—' }}</text>
        </view>
        <view class="info-row">
          <text class="label">角色</text>
          <text class="value">{{ roleLabel }}</text>
        </view>
        <view class="info-row last">
          <text class="label">状态</text>
          <text class="value">{{ user?.status === 'banned' ? '已禁用' : '正常' }}</text>
        </view>
      </view>

      <AdminSectionTitle title="接口" />
      <view class="card">
        <text class="field-label">API Base（不含末尾 /）</text>
        <input v-model="apiBase" class="inp" placeholder="http://127.0.0.1:3100/api" />
        <button class="btn primary" @click="saveBase">保存地址</button>
      </view>

      <AdminSectionTitle title="环境" />
      <view class="card">
        <text class="info-line">当前环境：{{ envLabel }}</text>
        <text class="info-line muted">实际请求：{{ displayBase }}</text>
      </view>

      <AdminSectionTitle title="维护" />
      <view class="card">
        <button class="btn ghost" @click="ping">测试连接</button>
        <button class="btn ghost" @click="clearCache">清缓存并退出</button>
      </view>

      <AdminSectionTitle title="关于" />
      <view class="card">
        <text class="info-line">版本：1.0.0</text>
        <text class="info-line muted">CNber_admin_mobile_v1.0</text>
      </view>

      <button class="btn logout" @click="onLogout">退出登录</button>
    </view>
  </scroll-view>
</template>

<script>
import AdminSectionTitle from '@/components/AdminSectionTitle.vue'
import { getUser, logout, ROLE_LABELS } from '@/stores/auth'
import { getBaseUrl, getEnvLabel, STORAGE_API_BASE, LOGIN_PATH } from '@/config/api'

export default {
  components: { AdminSectionTitle },
  data() {
    return {
      user: null,
      apiBase: ''
    }
  },
  computed: {
    roleLabel() {
      return ROLE_LABELS[this.user?.role] || this.user?.role || '—'
    },
    avatarText() {
      const phone = this.user?.phone || ''
      return phone.slice(-2) || '员'
    },
    envLabel() {
      return getEnvLabel()
    },
    displayBase() {
      return getBaseUrl()
    }
  },
  onShow() {
    this.user = getUser()
    this.apiBase = getBaseUrl()
  },
  methods: {
    saveBase() {
      const value = (this.apiBase || '').trim()
      if (!value) {
        uni.showToast({ title: '请输入地址', icon: 'none' })
        return
      }
      uni.setStorageSync(STORAGE_API_BASE, value)
      uni.showToast({ title: '已保存', icon: 'success' })
    },
    async ping() {
      try {
        await new Promise((resolve, reject) => {
          uni.request({
            url: `${getBaseUrl()}/status`,
            method: 'GET',
            success(res) {
              if (res.statusCode >= 400) reject(new Error('连接失败'))
              else resolve()
            },
            fail(err) {
              reject(new Error(err.errMsg || '网络错误'))
            }
          })
        })
        uni.showToast({ title: '连接正常', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '连接失败', icon: 'none' })
      }
    },
    clearCache() {
      try {
        logout()
        uni.removeStorageSync(STORAGE_API_BASE)
      } catch (e) {
        /* ignore */
      }
      uni.showToast({ title: '已清理', icon: 'none' })
      uni.reLaunch({ url: LOGIN_PATH })
    },
    onLogout() {
      logout()
      uni.reLaunch({ url: LOGIN_PATH })
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
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0 40rpx;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #69b1ff);
  color: #fff;
  font-size: 40rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.name {
  font-size: 32rpx;
  font-weight: 600;
  color: $admin-text;
}
.role {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $admin-text-secondary;
}
.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 24rpx;
  border: 1rpx solid $admin-border;
  margin-bottom: 8rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $admin-border;
  &.last {
    border-bottom: none;
  }
}
.label {
  color: $admin-text-secondary;
  font-size: 26rpx;
}
.value {
  color: $admin-text;
  font-size: 26rpx;
}
.field-label {
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
.info-line {
  display: block;
  font-size: 28rpx;
  margin-bottom: 8rpx;
  color: $admin-text;
}
.muted {
  color: $admin-text-secondary;
  font-size: 24rpx;
}
.btn {
  margin: 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  &.primary {
    background: $admin-primary;
    color: #fff;
  }
  &.ghost {
    margin-top: 16rpx;
    background: #fff;
    color: $admin-primary;
    border: 1rpx solid $admin-border;
  }
  &.logout {
    margin-top: 32rpx;
    background: #fff;
    color: $admin-danger;
    border: 1rpx solid #fecdca;
  }
}
</style>
