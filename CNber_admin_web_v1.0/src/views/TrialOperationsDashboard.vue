<template>
  <div>
    <h2>试运营看板</h2>
    <p class="muted">今日运营数据聚合（只读），用于试运营阶段监控。</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="muted">加载中…</p>
    <template v-else-if="data">
      <p class="muted">统计日期：{{ data.date || '—' }}</p>

      <section class="card">
        <h3>今日订单</h3>
        <div class="grid">
          <div class="stat"><span class="label">待付款</span><span class="num">{{ data.todayOrders?.pendingPayment ?? 0 }}</span></div>
          <div class="stat"><span class="label">付款待确认</span><span class="num">{{ data.todayOrders?.paymentReview ?? 0 }}</span></div>
          <div class="stat"><span class="label">待派单</span><span class="num">{{ data.todayOrders?.readyDispatch ?? 0 }}</span></div>
          <div class="stat"><span class="label">行程中</span><span class="num">{{ data.todayOrders?.inTrip ?? 0 }}</span></div>
          <div class="stat"><span class="label">已完成</span><span class="num">{{ data.todayOrders?.completed ?? 0 }}</span></div>
          <div class="stat"><span class="label">已取消</span><span class="num">{{ data.todayOrders?.cancelled ?? 0 }}</span></div>
        </div>
      </section>

      <section class="card">
        <h3>今日收入</h3>
        <div class="grid">
          <div class="stat"><span class="label">客户收入 CNY</span><span class="num">¥{{ money(data.todayRevenue?.customerRevenueCny) }}</span></div>
          <div class="stat"><span class="label">司机成本</span><span class="num">¥{{ money(data.todayRevenue?.driverCostCny) }}</span></div>
          <div class="stat"><span class="label">毛利</span><span class="num">¥{{ money(data.todayRevenue?.grossProfitCny) }}</span></div>
        </div>
      </section>

      <section class="card">
        <h3>今日客服</h3>
        <div class="grid">
          <div class="stat"><span class="label">新工单</span><span class="num">{{ data.todaySupport?.newTickets ?? 0 }}</span></div>
          <div class="stat"><span class="label">处理中</span><span class="num">{{ data.todaySupport?.processingTickets ?? 0 }}</span></div>
          <div class="stat"><span class="label">已关闭</span><span class="num">{{ data.todaySupport?.closedTickets ?? 0 }}</span></div>
        </div>
      </section>

      <section class="card">
        <h3>今日司机</h3>
        <div class="grid">
          <div class="stat"><span class="label">在线司机</span><span class="num">{{ data.todayDrivers?.activeDrivers ?? 0 }}</span></div>
          <div class="stat"><span class="label">离线司机</span><span class="num">{{ data.todayDrivers?.idleDrivers ?? 0 }}</span></div>
          <div class="stat"><span class="label">待结算批次</span><span class="num">{{ data.todayDrivers?.pendingSettlements ?? 0 }}</span></div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchTrialDashboard } from '@/api/admin'

const data = ref(null)
const loading = ref(false)
const error = ref('')

function money(v) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

onMounted(async () => {
  loading.value = true
  try {
    data.value = await fetchTrialDashboard()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.card { margin-bottom: 20px; padding: 16px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
h3 { margin: 0 0 12px; font-size: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.stat { padding: 12px; background: #f9fafb; border-radius: 8px; }
.label { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.num { font-size: 22px; font-weight: 600; }
.err { color: #b91c1c; }
</style>
