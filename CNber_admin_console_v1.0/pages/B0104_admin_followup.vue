<template>
  <view class="page">
    <scroll-view scroll-y class="scroll">
      <view class="pad">
        <AdminOrderSummary v-if="order._id" :order="order" />

        <AdminSectionTitle title="历史跟进" />
        <AdminFollowNoteItem v-for="(n, i) in notes" :key="i" :item="n" />
        <text v-if="!notes.length" class="empty">暂无记录</text>

        <AdminSectionTitle title="新增备注" />
        <textarea
          v-model="draft"
          class="ta"
          placeholder="记录通话、异常、客户要求等"
        />

        <view class="acts">
          <button class="btn" type="primary" @click="submitNote">保存备注</button>
        </view>

        <AdminSectionTitle title="快速状态" />
        <view class="row">
          <button class="sm" @click="quickStatus('cancelled')">标记取消</button>
          <button class="sm" @click="quickStatus('completed')">标记完成</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import AdminOrderSummary from '../components/AdminOrderSummary.vue'
import AdminSectionTitle from '../components/AdminSectionTitle.vue'
import AdminFollowNoteItem from '../components/AdminFollowNoteItem.vue'
import {
  fetchOrderDetail,
  addOrderFollowUp,
  updateOrderMainStatus
} from '../services/order.js'
import { isLoggedIn } from '../store/session.js'
import { back } from '../utils/nav.js'

export default {
  components: { AdminOrderSummary, AdminSectionTitle, AdminFollowNoteItem },
  data() {
    return {
      id: '',
      order: {},
      draft: ''
    }
  },
  computed: {
    notes() {
      return (this.order.followUpNotes || []).slice().reverse()
    }
  },
  onLoad(q) {
    this.id = q.id || ''
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/B0001_admin_login' })
      return
    }
    if (this.id) this.load()
  },
  methods: {
    async load() {
      try {
        const data = await fetchOrderDetail(this.id)
        this.order = (data && data.order) || {}
      } catch (e) {
        this.order = {}
      }
    },
    async submitNote() {
      if (!this.draft.trim()) {
        uni.showToast({ title: '请输入备注', icon: 'none' })
        return
      }
      try {
        await addOrderFollowUp(this.id, this.draft.trim())
        this.draft = ''
        uni.showToast({ title: '已保存', icon: 'success' })
        this.load()
      } catch (e) {
        /* */
      }
    },
    async quickStatus(st) {
      try {
        await updateOrderMainStatus(this.id, st)
        uni.showToast({ title: '状态已更新', icon: 'success' })
        this.load()
      } catch (e) {
        /* */
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.scroll {
  flex: 1;
  height: 0;
}
.pad {
  padding: $admin-page-pad;
  padding-bottom: 60rpx;
}
.ta {
  width: 100%;
  min-height: 200rpx;
  background: #fff;
  border: 1rpx solid $admin-border;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
  font-size: 28rpx;
}
.acts {
  margin-top: 16rpx;
}
.btn {
  background: $admin-primary;
  border-radius: 12rpx;
}
.row {
  display: flex;
  gap: 16rpx;
}
.sm {
  flex: 1;
  font-size: 26rpx;
  border-radius: 12rpx;
  background: #fff;
  border: 1rpx solid $admin-border;
}
.empty {
  color: $admin-text-secondary;
  font-size: 26rpx;
  padding: 16rpx 0;
}
</style>
