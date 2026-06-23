<template>
  <view class="page">
    <view v-if="!canView" class="empty card">
      <text>无工单查看权限</text>
    </view>
    <template v-else>
      <scroll-view scroll-x class="tabs-wrap">
        <view class="tabs">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="tab"
            :class="{ active: statusFilter === tab.value }"
            @click="switchStatus(tab.value)"
          >
            {{ tab.label }}
          </view>
        </view>
      </scroll-view>

      <scroll-view
        scroll-y
        class="list-scroll"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onPullDown"
        @scrolltolower="loadMore"
      >
        <view v-if="loading && !rows.length" class="center muted">加载中…</view>
        <view v-else-if="!rows.length" class="empty card"><text>暂无工单</text></view>
        <view v-else>
          <view v-for="row in rows" :key="row._id" class="ticket-card card">
            <view class="head">
              <text class="ticket-no">{{ row.ticketNo }}</text>
              <text class="pill">{{ ticketStatusLabel(row.status) }}</text>
            </view>
            <view class="row"><text class="dt">类型</text><text class="dd">{{ ticketTypeLabel(row.type) }}</text></view>
            <view class="row"><text class="dt">优先级</text><text class="dd">{{ ticketPriorityLabel(row.priority) }}</text></view>
            <view class="row"><text class="dt">客户</text><text class="dd">{{ row.requesterPhone || '—' }}</text></view>
            <view class="row"><text class="dt">订单</text><text class="dd">{{ row.orderNo || '—' }}</text></view>
            <view class="row"><text class="dt">标题</text><text class="dd">{{ row.title }}</text></view>
            <view class="row"><text class="dt">创建</text><text class="dd">{{ fmtTime(row.createdAt) }}</text></view>
            <view class="actions">
              <button class="btn primary" size="mini" @click="goDetail(row)">查看详情</button>
              <button class="btn" size="mini" @click="callCustomer(row)">拨打客户</button>
            </view>
          </view>
          <view v-if="loadingMore" class="center muted">加载更多…</view>
          <view v-else-if="!hasMore && rows.length" class="center muted">没有更多了</view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script>
import { fetchSupportTickets } from '@/services/adminApi'
import { TICKET_STATUS_OPTIONS, ticketTypeLabel, ticketStatusLabel, ticketPriorityLabel } from '@/utils/supportTicketLabels'
import { canViewTickets } from '@/stores/auth'
import { callPhone, fmtTime, showToast } from '@/utils/phone'

export default {
  data() {
    return {
      tabs: TICKET_STATUS_OPTIONS,
      statusFilter: 'pending',
      keyword: '',
      rows: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      loadingMore: false,
      refreshing: false
    }
  },
  computed: {
    canView() {
      return canViewTickets()
    },
    hasMore() {
      return this.rows.length < this.total
    }
  },
  onLoad(query) {
    if (query?.status && TICKET_STATUS_OPTIONS.some((t) => t.value === query.status)) {
      this.statusFilter = query.status
    }
    if (query?.keyword) this.keyword = decodeURIComponent(query.keyword)
  },
  onShow() {
    if (this.canView) this.reload()
  },
  onPullDownRefresh() {
    this.onPullDown()
  },
  methods: {
    ticketTypeLabel,
    ticketStatusLabel,
    ticketPriorityLabel,
    fmtTime,
    switchStatus(value) {
      this.statusFilter = value
      this.reload()
    },
    async reload() {
      this.page = 1
      this.loading = true
      try {
        const data = await fetchSupportTickets({
          status: this.statusFilter,
          page: this.page,
          pageSize: this.pageSize,
          ...(this.keyword ? { keyword: this.keyword } : {})
        })
        this.rows = data?.tickets || []
        this.total = data?.total ?? 0
      } catch (e) {
        showToast(e.message || '加载失败')
      } finally {
        this.loading = false
        this.refreshing = false
        uni.stopPullDownRefresh()
      }
    },
    async onPullDown() {
      this.refreshing = true
      await this.reload()
    },
    async loadMore() {
      if (!this.hasMore || this.loadingMore || this.loading) return
      this.loadingMore = true
      this.page += 1
      try {
        const data = await fetchSupportTickets({
          status: this.statusFilter,
          page: this.page,
          pageSize: this.pageSize,
          ...(this.keyword ? { keyword: this.keyword } : {})
        })
        const batch = data?.tickets || []
        this.rows = [...this.rows, ...batch]
        this.total = data?.total ?? this.rows.length
      } catch (e) {
        this.page -= 1
        showToast(e.message || '加载失败')
      } finally {
        this.loadingMore = false
      }
    },
    goDetail(row) {
      uni.navigateTo({ url: `/pages/M0006_admin_ticket_detail?id=${row._id}` })
    },
    callCustomer(row) {
      callPhone(row.requesterPhone)
    }
  }
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #f5f6f8; }
.tabs-wrap { background: #fff; border-bottom: 1px solid #eee; flex-shrink: 0; }
.tabs { display: flex; white-space: nowrap; padding: 12rpx 16rpx; }
.tab { display: inline-block; padding: 16rpx 28rpx; margin-right: 12rpx; border-radius: 999rpx; background: #f3f4f6; font-size: 26rpx; }
.tab.active { background: #1a5cff; color: #fff; }
.list-scroll { flex: 1; height: 0; padding: 20rpx; box-sizing: border-box; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ticket-no { font-weight: 600; font-size: 28rpx; }
.pill { font-size: 22rpx; padding: 4rpx 12rpx; background: #eef2ff; color: #1a5cff; border-radius: 8rpx; }
.row { display: flex; margin-bottom: 8rpx; font-size: 26rpx; }
.dt { width: 100rpx; color: #6b7280; flex-shrink: 0; }
.dd { flex: 1; word-break: break-all; }
.actions { display: flex; gap: 12rpx; margin-top: 16rpx; }
.btn { margin: 0; font-size: 24rpx; }
.btn.primary { background: #1a5cff; color: #fff; }
.empty, .center { text-align: center; padding: 60rpx 24rpx; color: #6b7280; }
</style>
