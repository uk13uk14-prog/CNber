<template>
  <div>
    <h2>工作台</h2>
    <p class="muted">关键指标（实时自后端）</p>
    <div v-if="err" class="card err">{{ err }}</div>
    <div v-else class="grid">
      <div class="card stat">
        <div class="label">今日新单</div>
        <div class="num">{{ stats.todayOrderCount ?? '—' }}</div>
      </div>
      <div class="card stat">
        <div class="label">待接单池</div>
        <div class="num">{{ stats.pendingDispatchCount ?? '—' }}</div>
      </div>
      <div class="card stat">
        <div class="label">已指派待确认</div>
        <div class="num">{{ stats.assignedOrderCount ?? '—' }}</div>
      </div>
      <div class="card stat">
        <div class="label">已接单</div>
        <div class="num">{{ stats.acceptedOrderCount ?? '—' }}</div>
      </div>
      <div class="card stat">
        <div class="label">进行中</div>
        <div class="num">{{ stats.inProgressOrderCount ?? '—' }}</div>
      </div>
      <div class="card stat">
        <div class="label">累计完成</div>
        <div class="num">{{ stats.completedOrderCount ?? '—' }}</div>
      </div>
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
.err {
  color: var(--danger);
}
</style>
