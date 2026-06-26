<template>
  <div>
    <h2>任务队列</h2>
    <p class="muted">后台异步任务监控（M1 单 Worker，不阻塞业务请求）。</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="muted">加载中…</p>

    <template v-else-if="stats">
      <section class="grid row-4">
        <div class="card stat">
          <div class="label">Pending</div>
          <div class="num warn">{{ stats.pending ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">Running</div>
          <div class="num primary">{{ stats.running ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">Success</div>
          <div class="num ok">{{ stats.success ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="label">Failed</div>
          <div class="num bad">{{ stats.failed ?? 0 }}</div>
        </div>
      </section>

      <p class="muted sub-hint">
        Worker 并发上限：{{ stats.workerConcurrencyLimit ?? 1 }}（M1 固定单进程）
      </p>

      <div class="panels">
        <section class="card panel">
          <h3>最近失败任务</h3>
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>时间</th>
                  <th>尝试</th>
                  <th>错误</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="j in failedJobs" :key="j._id">
                  <td>{{ j.type }}</td>
                  <td class="nowrap">{{ fmtTime(j.updatedAt) }}</td>
                  <td>{{ j.attempts }}/{{ j.maxAttempts }}</td>
                  <td class="ellipsis">{{ j.error || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!failedJobs.length" class="muted empty">暂无失败任务</p>
          </div>
        </section>

        <section class="card panel">
          <h3>最近成功任务</h3>
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>完成时间</th>
                  <th>尝试</th>
                  <th>Worker</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="j in successJobs" :key="j._id">
                  <td>{{ j.type }}</td>
                  <td class="nowrap">{{ fmtTime(j.finishedAt || j.updatedAt) }}</td>
                  <td>{{ j.attempts }}/{{ j.maxAttempts }}</td>
                  <td>{{ j.workerId || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!successJobs.length" class="muted empty">暂无成功任务</p>
          </div>
        </section>
      </div>

      <div class="toolbar">
        <button type="button" class="btn btn-primary" @click="load">刷新</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchJobQueueStats, fetchRecentJobs } from '@/api/admin'

const stats = ref(null)
const failedJobs = ref([])
const successJobs = ref([])
const loading = ref(false)
const error = ref('')

function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [s, failed, success] = await Promise.all([
      fetchJobQueueStats(),
      fetchRecentJobs({ status: 'failed', limit: 10 }),
      fetchRecentJobs({ status: 'success', limit: 10 })
    ])
    stats.value = s
    failedJobs.value = failed.jobs || []
    successJobs.value = success.jobs || []
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
h2 { margin: 0 0 8px; }
h3 { margin: 0 0 12px; font-size: 15px; }
.grid { display: grid; gap: 16px; margin-top: 16px; }
.row-4 { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
.stat { padding: 16px; }
.stat .label { font-size: 12px; color: var(--muted); text-transform: uppercase; }
.stat .num { font-size: 28px; font-weight: 700; margin-top: 8px; }
.stat .num.primary { color: var(--primary); }
.stat .num.warn { color: #d97706; }
.stat .num.ok { color: #059669; }
.stat .num.bad { color: var(--danger); }
.sub-hint { margin-top: 12px; font-size: 13px; }
.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
@media (max-width: 900px) { .panels { grid-template-columns: 1fr; } }
.panel { padding: 16px; }
.empty { padding: 12px 0; }
.err { color: var(--danger); }
.toolbar { margin-top: 16px; }
.ellipsis { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nowrap { white-space: nowrap; }
</style>
