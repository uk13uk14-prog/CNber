<template>
  <div>
    <h2>数据备份</h2>
    <p class="muted">V1 仅展示数据库状态与备份信息，不支持在线恢复。</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="muted">加载中…</p>
    <template v-else-if="status">
      <div class="grid">
        <div class="card stat">
          <div class="label">MongoDB</div>
          <div class="num" :class="status.mongoConnected ? 'ok' : 'bad'">
            {{ status.mongoConnected ? '已连接' : '未连接' }}
          </div>
        </div>
        <div class="card stat">
          <div class="label">数据库大小</div>
          <div class="num">{{ status.dbSizeMb ?? 0 }} MB</div>
        </div>
        <div class="card stat">
          <div class="label">订单数</div>
          <div class="num">{{ status.orderCount ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">客户数</div>
          <div class="num">{{ status.customerCount ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">司机数</div>
          <div class="num">{{ status.driverCount ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">最近备份</div>
          <div class="num small">{{ fmtTime(status.lastBackupAt) }}</div>
        </div>
      </div>
      <div v-if="canRun" class="actions">
        <button type="button" class="btn" disabled title="V1 预留">手动备份（预留）</button>
        <p class="muted small">POST /api/admin/backup/run 已预留，V1 不执行真实备份。</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchBackupStatus } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const canRun = computed(() => auth.staffRole === 'admin')
const status = ref(null)
const loading = ref(false)
const error = ref('')

function fmtTime(v) {
  if (!v) return '暂无记录'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '暂无记录' : d.toLocaleString('zh-CN')
}

onMounted(async () => {
  loading.value = true
  try {
    status.value = await fetchBackupStatus()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
.stat { padding: 16px; }
.label { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
.num { font-size: 24px; font-weight: 600; }
.num.small { font-size: 14px; font-weight: 500; }
.num.ok { color: #047857; }
.num.bad { color: #b91c1c; }
.actions { margin-top: 24px; }
.small { font-size: 13px; }
</style>
