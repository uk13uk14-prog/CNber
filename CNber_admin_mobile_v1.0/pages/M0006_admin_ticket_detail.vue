<template>
  <scroll-view scroll-y class="page">
    <view class="pad">
      <view v-if="loading" class="center muted">加载中…</view>
      <view v-else-if="error" class="center error">{{ error }}</view>
      <template v-else-if="ticket._id">
        <view class="head-card">
          <text class="ticket-no">{{ ticket.ticketNo }}</text>
          <AdminStatusBadge
            :label="statusMeta.label"
            :color="statusMeta.color"
            :bg="statusMeta.bg"
          />
        </view>

        <AdminSectionTitle title="基本信息" />
        <view class="card">
          <view class="row"><text class="dt">类型</text><text class="dd">{{ ticketTypeLabel(ticket.type) }}</text></view>
          <view class="row"><text class="dt">优先级</text><text class="dd">{{ ticketPriorityLabel(ticket.priority) }}</text></view>
          <view class="row"><text class="dt">标题</text><text class="dd">{{ ticket.title }}</text></view>
          <view class="row"><text class="dt">客户手机</text><text class="dd link" @click="callCustomer">{{ ticket.requesterPhone || '—' }}</text></view>
          <view class="row">
            <text class="dt">订单号</text>
            <text v-if="ticket.orderId" class="dd link" @click="goOrder">{{ ticket.orderNo || ticket.orderId }}</text>
            <text v-else class="dd">—</text>
          </view>
          <view class="row"><text class="dt">创建时间</text><text class="dd">{{ fmtTime(ticket.createdAt) }}</text></view>
        </view>

        <AdminSectionTitle title="问题描述" />
        <view class="card">
          <text class="desc">{{ ticket.description || '—' }}</text>
          <view v-if="ticket.resolution" class="resolution">
            <text class="sub-title">处理结果</text>
            <text class="desc">{{ ticket.resolution }}</text>
          </view>
        </view>

        <AdminSectionTitle title="处理记录" />
        <view class="card">
          <view v-if="sortedLogs.length">
            <view v-for="(log, idx) in sortedLogs" :key="log._id || idx" class="log-item">
              <view class="log-head">
                <text class="author">{{ log.authorName || '—' }}</text>
                <text class="time">{{ fmtTime(log.createdAt) }}</text>
              </view>
              <text class="log-content">{{ log.content }}</text>
            </view>
          </view>
          <text v-else class="muted">暂无记录</text>
        </view>

        <template v-if="canUpdate">
          <AdminSectionTitle title="操作" />
          <view class="card">
            <picker mode="selector" :range="statusLabels" :value="statusPickerIndex" @change="onStatusPick">
              <view class="picker-btn">状态：{{ ticketStatusLabel(nextStatus) }}</view>
            </picker>
            <input v-model="resolutionDraft" class="input" placeholder="处理结果（可选）" />
            <button class="btn primary" :loading="saving" @click="updateStatus">更新状态</button>
            <textarea v-model="commentDraft" class="textarea" placeholder="添加处理记录…" />
            <button class="btn ghost" :loading="saving" @click="submitComment">添加记录</button>
          </view>
        </template>

        <view class="footer">
          <button class="btn ghost" @click="callCustomer">拨打客户</button>
          <button class="btn primary" @click="goBack">返回列表</button>
        </view>
      </template>
    </view>
  </scroll-view>
</template>

<script>
import AdminSectionTitle from '@/components/AdminSectionTitle.vue'
import AdminStatusBadge from '@/components/AdminStatusBadge.vue'
import {
  fetchSupportTicketDetail,
  updateSupportTicketStatus,
  addSupportTicketComment
} from '@/services/adminApi'
import {
  TICKET_STATUS_OPTIONS,
  ticketTypeLabel,
  ticketStatusLabel,
  ticketPriorityLabel
} from '@/utils/supportTicketLabels'
import { getTicketStatusMeta } from '@/config/statusMeta'
import { canUpdateTickets } from '@/stores/auth'
import { callPhone, fmtTime, showToast } from '@/utils/phone'

export default {
  components: { AdminSectionTitle, AdminStatusBadge },
  data() {
    return {
      ticketId: '',
      ticket: {},
      loading: false,
      error: '',
      saving: false,
      nextStatus: 'pending',
      resolutionDraft: '',
      commentDraft: ''
    }
  },
  computed: {
    canUpdate() {
      return canUpdateTickets()
    },
    statusLabels() {
      return TICKET_STATUS_OPTIONS.map((o) => o.label)
    },
    statusPickerIndex() {
      const idx = TICKET_STATUS_OPTIONS.findIndex((o) => o.value === this.nextStatus)
      return idx >= 0 ? idx : 0
    },
    sortedLogs() {
      const list = this.ticket?.operationLogs || []
      return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },
    statusMeta() {
      return getTicketStatusMeta(this.ticket.status)
    }
  },
  onLoad(query) {
    this.ticketId = query.id || ''
    if (this.ticketId) this.load()
  },
  methods: {
    ticketTypeLabel,
    ticketStatusLabel,
    ticketPriorityLabel,
    fmtTime,
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await fetchSupportTicketDetail(this.ticketId)
        this.ticket = data?.ticket || {}
        this.nextStatus = this.ticket.status || 'pending'
        this.resolutionDraft = this.ticket.resolution || ''
      } catch (e) {
        this.error = e.message || '加载失败'
      } finally {
        this.loading = false
      }
    },
    onStatusPick(e) {
      const idx = Number(e.detail.value)
      const opt = TICKET_STATUS_OPTIONS[idx]
      if (opt) this.nextStatus = opt.value
    },
    async updateStatus() {
      this.saving = true
      try {
        await updateSupportTicketStatus(this.ticketId, {
          status: this.nextStatus,
          resolution: this.resolutionDraft.trim() || undefined
        })
        showToast('状态已更新', 'success')
        await this.load()
      } catch (e) {
        showToast(e.message || '更新失败')
      } finally {
        this.saving = false
      }
    },
    async submitComment() {
      const content = this.commentDraft.trim()
      if (!content) {
        showToast('请填写处理记录')
        return
      }
      this.saving = true
      try {
        await addSupportTicketComment(this.ticketId, content)
        this.commentDraft = ''
        showToast('已添加记录', 'success')
        await this.load()
      } catch (e) {
        showToast(e.message || '添加失败')
      } finally {
        this.saving = false
      }
    },
    callCustomer() {
      callPhone(this.ticket.requesterPhone)
    },
    goOrder() {
      if (this.ticket.orderId) {
        uni.navigateTo({ url: `/pages/M0004_admin_order_detail?id=${this.ticket.orderId}` })
      }
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.switchTab({ url: '/pages/M0005_admin_tickets' })
      })
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page { height: 100vh; }
.pad { padding: $admin-page-pad; padding-bottom: 120rpx; }
.head-card {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border-radius: $admin-card-radius; padding: 28rpx 24rpx;
  border: 1rpx solid $admin-border; margin-bottom: 8rpx;
}
.ticket-no { font-size: 32rpx; font-weight: 700; color: $admin-text; }
.card {
  background: #fff; border-radius: $admin-card-radius; padding: 24rpx;
  border: 1rpx solid $admin-border; margin-bottom: 8rpx;
}
.row { display: flex; margin-bottom: 10rpx; font-size: 26rpx; }
.dt { width: 140rpx; color: $admin-text-secondary; flex-shrink: 0; }
.dd { flex: 1; word-break: break-all; color: $admin-text; }
.link { color: $admin-primary; }
.desc { font-size: 28rpx; line-height: 1.6; color: $admin-text; }
.sub-title { font-weight: 600; margin-bottom: 8rpx; display: block; color: $admin-text; }
.resolution { margin-top: 20rpx; padding-top: 16rpx; border-top: 1rpx solid $admin-border; }
.log-item { padding: 16rpx 0; border-bottom: 1rpx solid $admin-border; }
.log-head { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.author { font-weight: 500; color: $admin-text; }
.time { color: $admin-text-secondary; font-size: 24rpx; }
.log-content { font-size: 26rpx; line-height: 1.5; color: $admin-text; }
.picker-btn {
  padding: 16rpx; background: $admin-bg; border: 1rpx solid $admin-border;
  border-radius: 12rpx; margin-bottom: 16rpx; font-size: 28rpx; color: $admin-text;
}
.input, .textarea {
  width: 100%; border: 1rpx solid $admin-border; border-radius: 12rpx;
  padding: 16rpx; margin-bottom: 16rpx; box-sizing: border-box; font-size: 28rpx;
}
.textarea { min-height: 140rpx; }
.btn { margin: 0 0 16rpx; font-size: 28rpx; border-radius: 12rpx; }
.btn.primary { background: $admin-primary; color: #fff; }
.btn.ghost { background: #fff; color: $admin-primary; border: 1rpx solid $admin-border; }
.footer { display: flex; gap: 16rpx; margin-top: 24rpx; }
.footer .btn { flex: 1; }
.center { text-align: center; padding: 80rpx; }
.muted { color: $admin-text-secondary; }
.error { color: $admin-danger; }
</style>
