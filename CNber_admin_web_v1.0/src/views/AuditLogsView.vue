<template>
  <div>
    <h2>操作日志</h2>
    <p class="muted">后台关键操作审计记录。</p>

    <div class="toolbar card">
      <label>模块</label>
      <select v-model="moduleFilter" class="input" style="max-width: 160px">
        <option value="">全部</option>
        <option v-for="m in modules" :key="m" :value="m">{{ m }}</option>
      </select>
      <label>开始</label>
      <input v-model="startDate" class="input" type="date" />
      <label>结束</label>
      <input v-model="endDate" class="input" type="date" />
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>时间</th>
            <th>操作人</th>
            <th>模块</th>
            <th>动作</th>
            <th>描述</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row._id">
            <td>{{ fmtTime(row.createdAt) }}</td>
            <td>{{ row.operatorPhone || '—' }}</td>
            <td>{{ row.module }}</td>
            <td>{{ row.action }}</td>
            <td class="desc">{{ row.description || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length && !loading" class="muted empty">暂无日志</p>
    </div>
    <div class="pager muted">
      共 {{ total }} 条 · 第 {{ page }} 页
      <button type="button" class="btn mini" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <button type="button" class="btn mini" :disabled="page * pageSize >= total" @click="page++; load()">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchAuditLogs } from '@/api/admin'

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const error = ref('')
const moduleFilter = ref('')
const startDate = ref('')
const endDate = ref('')

const modules = [
  'dispatch',
  'payment_reviews',
  'support_tickets',
  'driver_settlements',
  'system_settings'
]

function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAuditLogs({
      page: page.value,
      pageSize,
      module: moduleFilter.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    })
    rows.value = data?.logs || []
    total.value = data?.total ?? 0
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.desc { max-width: 360px; word-break: break-word; }
.empty { padding: 16px; }
</style>
