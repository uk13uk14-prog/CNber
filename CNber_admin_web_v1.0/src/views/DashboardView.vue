<template>
  <div>
    <h2>工作台</h2>
    <p class="muted">关键指标（实时自后端）；点击卡片跳转对应列表。</p>
    <div v-if="err" class="card err">{{ err }}</div>
    <div v-else class="grid">
      <router-link class="card stat stat-link" :to="{ path: '/orders', query: { status: 'pending' } }">
        <div class="label">待确认</div>
        <div class="num">{{ stats.pendingConfirmCount ?? 0 }}</div>
      </router-link>
      <router-link
        class="card stat stat-link"
        :to="{ path: '/orders', query: { depositStatus: 'unpaid' } }"
      >
        <div class="label">待付订金</div>
        <div class="num">{{ stats.pendingDepositCount ?? 0 }}</div>
      </router-link>
      <router-link
        class="card stat stat-link"
        :to="{ path: '/orders', query: { quick: 'pending_dispatch' } }"
      >
        <div class="label">待派单</div>
        <div class="num">{{ stats.pendingDispatchCount ?? 0 }}</div>
      </router-link>
      <div class="card stat">
        <div class="label">待司机响应</div>
        <div class="num">{{ stats.waitingDriverResponseCount ?? stats.assignedOrderCount ?? 0 }}</div>
      </div>
      <router-link class="card stat stat-link" :to="{ path: '/orders', query: { quick: 'today' } }">
        <div class="label">今日接送</div>
        <div class="num">{{ stats.todayOrderCount ?? 0 }}</div>
      </router-link>
      <router-link class="card stat stat-link" :to="{ path: '/orders', query: { quick: 'exception' } }">
        <div class="label">异常订单</div>
        <div class="num">{{ stats.exceptionOrderCount ?? 0 }}</div>
      </router-link>
      <router-link class="card stat stat-link" :to="{ path: '/orders', query: { status: 'completed' } }">
        <div class="label">已完成</div>
        <div class="num">{{ stats.completedOrderCount ?? 0 }}</div>
      </router-link>
      <router-link class="card stat stat-link" to="/finance">
        <div class="label">平台毛利</div>
        <div class="num">{{ money(stats.platformProfit) }}</div>
      </router-link>
    </div>
    <p style="margin-top: 24px">
      <router-link to="/orders">进入订单列表 →</router-link>
    </p>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { fetchStats } from '@/api/admin'

const stats = reactive({})
const err = ref('')

function money(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : '¥0.00'
}

onMounted(async () => {
  try {
    const d = await fetchStats()
    Object.assign(stats, d || {})
  } catch (e) {
    err.value = e.message || '加载失败'
  }
})
</script>

<style scoped>
h2 {
  margin: 0 0 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.stat .label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
}
.stat .num {
  font-size: 28px;
  font-weight: 700;
  margin-top: 8px;
}
.stat-link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.stat-link:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
}
.err {
  color: var(--danger);
}
</style>
