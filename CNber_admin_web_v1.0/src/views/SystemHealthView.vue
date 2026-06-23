<template>
  <div>
    <h2>系统状态</h2>
    <p class="muted">服务与业务健康检查（只读）。</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="muted">加载中…</p>
    <template v-else-if="health">
      <div class="grid">
        <div class="card stat">
          <div class="label">后端服务</div>
          <div class="num" :class="pillClass(health.backend)">{{ health.backend }}</div>
        </div>
        <div class="card stat">
          <div class="label">MongoDB</div>
          <div class="num" :class="pillClass(health.mongodb)">{{ health.mongodb }}</div>
        </div>
        <div class="card stat">
          <div class="label">PM2</div>
          <div class="num">{{ health.pm2 }}</div>
        </div>
        <div class="card stat">
          <div class="label">磁盘使用率</div>
          <div class="num">{{ health.diskUsagePercent ?? 0 }}%</div>
        </div>
        <div class="card stat">
          <div class="label">订单总量</div>
          <div class="num">{{ health.totalOrders ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">司机总量</div>
          <div class="num">{{ health.totalDrivers ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">客户总量</div>
          <div class="num">{{ health.totalCustomers ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">在线司机</div>
          <div class="num">{{ health.onlineDrivers ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">待审核付款</div>
          <div class="num warn">{{ health.pendingPaymentReview ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">待派单</div>
          <div class="num warn">{{ health.pendingDispatch ?? 0 }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchSystemHealth } from '@/api/admin'

const health = ref(null)
const loading = ref(false)
const error = ref('')

function pillClass(v) {
  return v === 'ok' ? 'ok' : v === 'error' ? 'bad' : ''
}

onMounted(async () => {
  loading.value = true
  try {
    health.value = await fetchSystemHealth()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
.stat { padding: 16px; }
.label { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
.num { font-size: 22px; font-weight: 600; text-transform: uppercase; }
.num.ok { color: #047857; }
.num.bad { color: #b91c1c; }
.num.warn { color: #b45309; }
</style>
