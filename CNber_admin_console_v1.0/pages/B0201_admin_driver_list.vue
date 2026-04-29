<template>
  <view class="page">
    <view class="filters">
      <input v-model="search" class="inp" placeholder="按手机号搜索" />
      <picker :range="statusLabels" :value="statusIndex" @change="onPick">
        <view class="inp picker">状态：{{ statusLabels[statusIndex] }}</view>
      </picker>
      <button class="btn" type="primary" @click="reload">搜索</button>
    </view>
    <scroll-view scroll-y class="list">
      <view
        v-for="d in drivers"
        :key="d._id"
        class="tap"
        @click="goDetail(d)"
      >
        <AdminDriverCard :driver="d" :show-assign="false" />
      </view>
      <view v-if="!loading && drivers.length === 0" class="empty">暂无司机</view>
    </scroll-view>
  </view>
</template>

<script>
import AdminDriverCard from '../components/AdminDriverCard.vue'
import { fetchDriverList } from '../services/driver.js'
import { goPage } from '../utils/nav.js'
import { isLoggedIn } from '../store/session.js'

const ST = ['', 'pending', 'approved', 'rejected', 'banned']
const ST_LABELS = ['全部', '待审核', '已认证', '已拒绝', '已封禁']

export default {
  components: { AdminDriverCard },
  data() {
    return {
      search: '',
      drivers: [],
      loading: false,
      statusIndex: 0,
      statusLabels: ST_LABELS
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
    onPick(e) {
      this.statusIndex = Number(e.detail.value)
    },
    buildQuery() {
      const q = { page: 1, pageSize: 50 }
      if (this.search.trim()) q.search = this.search.trim()
      const st = ST[this.statusIndex]
      if (st) q.status = st
      return q
    },
    async reload() {
      this.loading = true
      try {
        const data = await fetchDriverList(this.buildQuery())
        this.drivers = (data && data.drivers) || []
      } catch (e) {
        this.drivers = []
      } finally {
        this.loading = false
      }
    },
    goDetail(d) {
      goPage(`/pages/B0203_admin_driver_detail?id=${d._id}`)
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
  flex-shrink: 0;
}
.inp {
  background: #fff;
  border: 1rpx solid $admin-border;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  font-size: 26rpx;
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
.tap {
  margin-bottom: 0;
}
.empty {
  text-align: center;
  color: $admin-text-secondary;
  padding: 60rpx;
}
</style>
