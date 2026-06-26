<template>
  <div>
    <h2>运营驾驶舱</h2>
    <p class="muted">Operations Dashboard — 在线用户、订单与服务器负载（只读）。</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="muted">加载中…</p>
    <template v-else-if="data">
      <section class="grid row-4">
        <div class="card stat">
          <div class="label">总在线人数</div>
          <div class="num primary">{{ data.onlineUsers?.total ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">客户在线</div>
          <div class="num">{{ data.onlineUsers?.customers ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">司机在线</div>
          <div class="num">{{ data.onlineUsers?.drivers ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">旅行社在线</div>
          <div class="num">{{ data.onlineUsers?.travelAgency ?? 0 }}</div>
        </div>
      </section>

      <section class="grid row-4">
        <div class="card stat">
          <div class="label">今日订单</div>
          <div class="num">{{ data.orders?.today?.created ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">已完成订单</div>
          <div class="num">{{ data.orders?.today?.completed ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">今日活跃用户</div>
          <div class="num">{{ dailyActiveTotal }}</div>
        </div>
        <div class="card stat">
          <div class="label">可派单司机</div>
          <div class="num">{{ data.drivers?.dispatchable ?? 0 }}</div>
        </div>
      </section>

      <section class="grid row-3">
        <div class="card stat">
          <div class="label">任务 Pending</div>
          <div class="num warn">{{ data.jobQueue?.pending ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">任务 Running</div>
          <div class="num primary">{{ data.jobQueue?.running ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">任务 Failed</div>
          <div class="num bad">{{ data.jobQueue?.failed ?? 0 }}</div>
        </div>
      </section>

      <section class="grid row-3">
        <div class="card stat">
          <div class="label">CPU</div>
          <div class="num">{{ data.system?.cpuUsage ?? 0 }}%</div>
        </div>
        <div class="card stat">
          <div class="label">内存</div>
          <div class="num">{{ data.system?.memoryPercent ?? 0 }}%</div>
          <div v-if="data.system?.memorySource === 'memory_pressure'" class="sub">
            系统空闲 {{ data.system?.memoryPressureFreePercent ?? 0 }}% · {{ memoryTotalLabel }}
          </div>
          <div v-else class="sub">
            {{ data.system?.memoryUsedMB ?? 0 }} / {{ data.system?.memoryTotalMB ?? 0 }} MB
          </div>
        </div>
        <div class="card stat">
          <div class="label">运行时长</div>
          <div class="num">{{ data.system?.uptimeHours ?? 0 }} h</div>
          <div class="sub">{{ data.system?.platform ?? '—' }} · {{ data.system?.nodeVersion ?? '—' }}</div>
        </div>
      </section>

      <details class="card details">
        <summary>详细统计</summary>
        <div class="detail-grid">
          <div>
            <h4>今日订单明细</h4>
            <ul>
              <li>新建：{{ data.orders?.today?.created ?? 0 }}</li>
              <li>已报价：{{ data.orders?.today?.quoted ?? 0 }}</li>
              <li>已付订金：{{ data.orders?.today?.depositPaid ?? 0 }}</li>
              <li>已派单：{{ data.orders?.today?.assigned ?? 0 }}</li>
              <li>已完成：{{ data.orders?.today?.completed ?? 0 }}</li>
            </ul>
          </div>
          <div>
            <h4>累计订单</h4>
            <ul>
              <li>总订单：{{ data.orders?.total?.orders ?? 0 }}</li>
              <li>总完成：{{ data.orders?.total?.completed ?? 0 }}</li>
            </ul>
          </div>
          <div>
            <h4>在线用户（5 分钟内活跃）</h4>
            <ul>
              <li>客服：{{ data.onlineUsers?.support ?? 0 }}</li>
              <li>管理员：{{ data.onlineUsers?.admins ?? 0 }}</li>
            </ul>
          </div>
          <div>
            <h4>今日活跃（DAU）</h4>
            <ul>
              <li>客户：{{ data.dailyActiveUsers?.customers ?? 0 }}</li>
              <li>司机：{{ data.dailyActiveUsers?.drivers ?? 0 }}</li>
              <li>旅行社：{{ data.dailyActiveUsers?.travelAgency ?? 0 }}</li>
              <li>客服：{{ data.dailyActiveUsers?.support ?? 0 }}</li>
              <li>管理员：{{ data.dailyActiveUsers?.admins ?? 0 }}</li>
            </ul>
          </div>
          <div>
            <h4>司机状态</h4>
            <ul>
              <li>在线：{{ data.drivers?.online ?? 0 }}</li>
              <li>离线：{{ data.drivers?.offline ?? 0 }}</li>
              <li>已审核：{{ data.drivers?.approved ?? 0 }}</li>
              <li>待审核：{{ data.drivers?.pending ?? 0 }}</li>
            </ul>
          </div>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchOperationsDashboardOverview } from '@/api/admin'

const data = ref(null)
const loading = ref(false)
const error = ref('')

const dailyActiveTotal = computed(() => {
  const d = data.value?.dailyActiveUsers
  if (!d) return 0
  return (
    (d.customers || 0) +
    (d.drivers || 0) +
    (d.travelAgency || 0) +
    (d.support || 0) +
    (d.admins || 0)
  )
})

const memoryTotalLabel = computed(() => {
  const total = data.value?.system?.memoryTotalMB
  return total ? `${total} MB 物理内存` : '—'
})

onMounted(async () => {
  loading.value = true
  try {
    data.value = await fetchOperationsDashboardOverview()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
h2 {
  margin: 0 0 8px;
}
.grid {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}
.row-4 {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}
.row-3 {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
.stat {
  padding: 16px;
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
.stat .num.warn {
  color: #d97706;
}
.stat .num.primary {
  color: var(--primary);
}
.stat .num.bad {
  color: var(--danger);
}
.stat .sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
}
.err {
  color: var(--danger);
}
.details {
  margin-top: 20px;
  padding: 16px;
}
.details summary {
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 12px;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 12px;
}
.detail-grid h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #374151;
}
.detail-grid ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #4b5563;
}
.detail-grid li {
  margin-bottom: 4px;
}
</style>
