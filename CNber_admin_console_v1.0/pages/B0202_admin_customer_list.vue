<template>
  <view class="page">
    <view class="filters">
      <input v-model="search" class="inp" placeholder="手机号搜索" />
      <button class="btn" type="primary" @click="reload">搜索</button>
    </view>
    <scroll-view scroll-y class="list">
      <view
        v-for="u in users"
        :key="u._id"
        class="card"
        @click="goDetail(u)"
      >
        <text class="phone">{{ u.phone }}</text>
        <text class="sub">客户 · 点击查看详情</text>
      </view>
      <view v-if="!loading && users.length === 0" class="empty">暂无客户</view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchCustomerList } from '../services/customer.js'
import { goPage } from '../utils/nav.js'
import { isLoggedIn } from '../store/session.js'

export default {
  data() {
    return {
      search: '',
      users: [],
      loading: false
    }
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/B0001_admin_login' })
      return
    }
    this.reload()
  },
  methods: {
    async reload() {
      this.loading = true
      try {
        const data = await fetchCustomerList({
          page: 1,
          pageSize: 30,
          search: this.search.trim()
        })
        this.users = (data && data.users) || []
      } catch (e) {
        this.users = []
      } finally {
        this.loading = false
      }
    },
    goDetail(u) {
      goPage(`/pages/B0204_admin_customer_detail?id=${u._id}`)
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.filters {
  padding: $admin-page-pad;
}
.inp {
  background: #fff;
  border: 1rpx solid $admin-border;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
}
.btn {
  background: $admin-primary;
  border-radius: 12rpx;
}
.list {
  flex: 1;
  padding: 0 $admin-page-pad 120rpx;
  height: 0;
}
.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 28rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid $admin-border;
}
.phone {
  font-size: 32rpx;
  font-weight: 600;
  color: $admin-text;
  display: block;
}
.sub {
  font-size: 24rpx;
  color: $admin-text-secondary;
  margin-top: 8rpx;
  display: block;
}
.empty {
  text-align: center;
  color: $admin-text-secondary;
  padding: 60rpx;
}
</style>
