<template>
  <div>
    <h2>CRM 营销中心</h2>
    <p class="muted">
      基于客户画像筛选营销候选池。V1 仅支持名单管理与导出，<strong>不自动发消息、不发券、不改标签</strong>。
    </p>

    <div v-if="!detailId" class="toolbar card">
      <button v-if="canCreate" type="button" class="btn btn-primary" @click="openCreate">创建名单</button>
      <button type="button" class="btn" @click="load">刷新列表</button>
    </div>

    <div v-else class="toolbar card">
      <button type="button" class="btn" @click="closeDetail">← 返回名单列表</button>
      <button
        v-if="canUpdate"
        type="button"
        class="btn"
        :disabled="detailLoading"
        @click="runRefresh"
      >
        刷新名单
      </button>
      <button
        v-if="canExport"
        type="button"
        class="btn btn-primary"
        :disabled="exporting"
        @click="runExport"
      >
        导出 CSV
      </button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <template v-if="!detailId">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>名称</th>
              <th>人数</th>
              <th>创建时间</th>
              <th>创建人</th>
              <th class="acts">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row._id">
              <td>
                <button type="button" class="link-btn" @click="openDetail(row._id)">
                  {{ row.name }}
                </button>
                <div v-if="row.description" class="muted small">{{ row.description }}</div>
              </td>
              <td>{{ row.count ?? 0 }}</td>
              <td>{{ fmtTime(row.createdAt) }}</td>
              <td>{{ row.createdByLabel || '—' }}</td>
              <td class="acts">
                <button type="button" class="btn mini" @click="openDetail(row._id)">查看</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!rows.length && !loading" class="muted empty">暂无营销名单，管理员可创建。</p>
      </div>

      <div v-if="presets.length" class="presets card">
        <h3>推荐名单（规则模板）</h3>
        <p class="muted small">创建时可选用以下预设筛选条件，生成后仍可手动刷新。</p>
        <ul>
          <li v-for="p in presets" :key="p.key">
            <strong>{{ p.name }}</strong> — {{ p.description }}
          </li>
        </ul>
      </div>

      <div class="marketing-logs card">
        <h3>营销记录</h3>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>时间</th>
                <th>名单</th>
                <th>操作</th>
                <th>人数</th>
                <th>操作人</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in marketingLogs" :key="log._id">
                <td>{{ fmtTime(log.createdAt) }}</td>
                <td>{{ log.audienceName || '—' }}</td>
                <td>{{ log.actionLabel || log.action }}</td>
                <td>{{ log.customerCount ?? '—' }}</td>
                <td>{{ log.operatorPhone || '—' }}</td>
                <td>{{ log.remark || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!marketingLogs.length" class="muted empty">暂无营销记录</p>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="detail" class="detail-head card">
        <h3>{{ detail.name }}</h3>
        <p v-if="detail.description" class="muted">{{ detail.description }}</p>
        <p class="muted small">
          共 {{ detail.count ?? 0 }} 人 · 创建于 {{ fmtTime(detail.createdAt) }} ·
          {{ detail.createdByLabel || '—' }}
        </p>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>姓名</th>
              <th>手机号</th>
              <th>订单数</th>
              <th>消费金额 CNY</th>
              <th>标签</th>
              <th>AI 标签</th>
              <th>最近下单</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in customers" :key="c._id">
              <td>{{ c.name || '—' }}</td>
              <td>{{ c.phone || '—' }}</td>
              <td>{{ c.totalOrders ?? 0 }}</td>
              <td>¥{{ formatMoney(c.totalSpentCny) }}</td>
              <td>
                <span v-for="t in c.tags || []" :key="t" class="pill">{{ t }}</span>
                <span v-if="!c.tags?.length" class="muted">—</span>
              </td>
              <td>
                <span v-for="t in c.aiTags || []" :key="t" class="pill pill-ai">{{ t }}</span>
                <span v-if="!c.aiTags?.length" class="muted">—</span>
              </td>
              <td>{{ fmtTime(c.lastOrderAt) || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!customers.length && !detailLoading" class="muted empty">当前筛选条件下无匹配客户。</p>
      </div>

      <div v-if="canUpdate" class="note-form card">
        <h4>添加营销备注</h4>
        <textarea v-model="noteText" class="input note-area" rows="3" placeholder="记录人工联系情况…" />
        <button type="button" class="btn btn-primary" :disabled="noteSaving" @click="submitNote">
          {{ noteSaving ? '保存中…' : '保存备注' }}
        </button>
      </div>

      <div class="marketing-logs card">
        <h4>该名单营销记录</h4>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作</th>
                <th>人数</th>
                <th>操作人</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in audienceLogs" :key="log._id">
                <td>{{ fmtTime(log.createdAt) }}</td>
                <td>{{ log.actionLabel || log.action }}</td>
                <td>{{ log.customerCount ?? '—' }}</td>
                <td>{{ log.operatorPhone || '—' }}</td>
                <td>{{ log.remark || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!audienceLogs.length" class="muted empty">暂无记录</p>
        </div>
      </div>
    </template>

    <div v-if="createModal.open" class="modal-mask" @click.self="closeCreate">
      <div class="modal card modal-wide">
        <div class="modal-head">
          <h3>创建营销名单</h3>
          <button type="button" class="btn" @click="closeCreate">关闭</button>
        </div>

        <label>名单名称</label>
        <input v-model="createModal.name" class="input" placeholder="机场客户" />

        <label>描述（可选）</label>
        <input v-model="createModal.description" class="input" />

        <label>推荐模板</label>
        <select v-model="createModal.preset" class="input" @change="applyPreset">
          <option value="">自定义筛选</option>
          <option v-for="p in presets" :key="p.key" :value="p.key">{{ p.name }}</option>
        </select>

        <div class="filter-grid">
          <label>
            订单数 ≥
            <input v-model.number="createModal.filters.totalOrdersMin" class="input" type="number" min="0" />
          </label>
          <label>
            订单数 ≤
            <input v-model.number="createModal.filters.totalOrdersMax" class="input" type="number" min="0" />
          </label>
          <label>
            消费金额 ≥
            <input v-model.number="createModal.filters.totalSpentCnyMin" class="input" type="number" min="0" />
          </label>
          <label>
            营销同意
            <select v-model="createModal.filters.marketingConsent" class="input">
              <option :value="null">不限</option>
              <option :value="true">已同意</option>
              <option :value="false">未同意</option>
            </select>
          </label>
          <label>
            客户类型
            <select v-model="createModal.filters.customerType" class="input">
              <option value="">不限</option>
              <option value="student">学生</option>
              <option value="family">家庭</option>
              <option value="business">商务</option>
              <option value="tourist">游客</option>
            </select>
          </label>
          <label>
            常用服务类型
            <select v-model="createModal.filters.favoriteServiceType" class="input">
              <option value="">不限</option>
              <option value="ride">ride</option>
              <option value="pickup">pickup</option>
              <option value="dropoff">dropoff</option>
              <option value="charter">charter</option>
            </select>
          </label>
          <label class="span2">
            AI 标签包含（逗号分隔）
            <input v-model="createModal.aiTagsText" class="input" placeholder="机场用户" />
          </label>
        </div>

        <p v-if="createModal.error" class="err">{{ createModal.error }}</p>
        <div class="modal-foot">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="createModal.saving"
            @click="submitCreate"
          >
            创建并生成
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  fetchCrmAudiences,
  createCrmAudience,
  fetchCrmAudience,
  refreshCrmAudience,
  exportCrmAudience,
  fetchCrmMarketingLogs,
  createCrmMarketingLog
} from '@/api/admin'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const canCreate = computed(() => auth.can('crm', 'create'))
const canUpdate = computed(() => auth.can('crm', 'update'))
const canExport = computed(() => auth.can('crm', 'export'))
const rows = ref([])
const presets = ref([])
const loading = ref(false)
const error = ref('')
const toast = ref('')
const detailId = ref('')
const detail = ref(null)
const customers = ref([])
const detailLoading = ref(false)
const exporting = ref(false)
const marketingLogs = ref([])
const audienceLogs = ref([])
const noteText = ref('')
const noteSaving = ref(false)

const createModal = reactive({
  open: false,
  name: '',
  description: '',
  preset: '',
  aiTagsText: '',
  filters: {
    totalOrdersMin: null,
    totalOrdersMax: null,
    totalSpentCnyMin: null,
    marketingConsent: null,
    customerType: '',
    favoriteServiceType: ''
  },
  saving: false,
  error: ''
})

function fmtTime(v) {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

function formatMoney(v) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function resetCreateFilters() {
  createModal.filters = {
    totalOrdersMin: null,
    totalOrdersMax: null,
    totalSpentCnyMin: null,
    marketingConsent: null,
    customerType: '',
    favoriteServiceType: ''
  }
  createModal.aiTagsText = ''
}

function applyPreset() {
  const p = presets.value.find((x) => x.key === createModal.preset)
  if (!p) {
    resetCreateFilters()
    return
  }
  createModal.name = createModal.name || p.name
  createModal.description = p.description || ''
  const f = p.filters || {}
  createModal.filters = {
    totalOrdersMin: f.totalOrdersMin ?? null,
    totalOrdersMax: f.totalOrdersMax ?? null,
    totalSpentCnyMin: f.totalSpentCnyMin ?? null,
    marketingConsent: f.marketingConsent ?? null,
    customerType: f.customerType || '',
    favoriteServiceType: f.favoriteServiceType || ''
  }
  createModal.aiTagsText = (f.aiTagsInclude || []).join('，')
  if (f.preset === 'complaint') {
    /* hasComplaint handled via preset key on submit */
  }
}

function buildFiltersPayload() {
  const f = { ...createModal.filters }
  if (createModal.preset) f.preset = createModal.preset
  if (createModal.aiTagsText.trim()) {
    f.aiTagsInclude = createModal.aiTagsText
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  Object.keys(f).forEach((k) => {
    if (f[k] === null || f[k] === '') delete f[k]
  })
  return f
}

async function loadMarketingLogs(audienceId) {
  try {
    const params = { page: 1, pageSize: 50 }
    if (audienceId) params.audienceId = audienceId
    const data = await fetchCrmMarketingLogs(params)
    const logs = data?.logs || []
    if (audienceId) {
      audienceLogs.value = logs
    } else {
      marketingLogs.value = logs
    }
  } catch {
    if (audienceId) audienceLogs.value = []
    else marketingLogs.value = []
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchCrmAudiences()
    rows.value = data?.rows || []
    presets.value = data?.presets || []
    await loadMarketingLogs()
  } catch (e) {
    error.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function openDetail(id) {
  detailId.value = id
  router.replace({ query: { ...route.query, audience: id } })
  await loadDetail()
}

function closeDetail() {
  detailId.value = ''
  detail.value = null
  customers.value = []
  audienceLogs.value = []
  noteText.value = ''
  const q = { ...route.query }
  delete q.audience
  router.replace({ query: q })
}

async function submitNote() {
  if (!detailId.value) return
  const remark = noteText.value.trim()
  if (!remark) {
    error.value = '请填写备注内容'
    return
  }
  noteSaving.value = true
  error.value = ''
  try {
    await createCrmMarketingLog({
      audienceId: detailId.value,
      action: 'manual_contact',
      remark
    })
    noteText.value = ''
    toast.value = '备注已保存'
    await loadMarketingLogs(detailId.value)
    await loadMarketingLogs()
  } catch (e) {
    error.value = e.message || '保存失败'
  } finally {
    noteSaving.value = false
  }
}

async function loadDetail() {
  if (!detailId.value) return
  detailLoading.value = true
  error.value = ''
  try {
    const data = await fetchCrmAudience(detailId.value)
    detail.value = data
    customers.value = data?.customers || []
    await loadMarketingLogs(detailId.value)
  } catch (e) {
    error.value = e.message || '加载详情失败'
  } finally {
    detailLoading.value = false
  }
}

function openCreate() {
  createModal.open = true
  createModal.name = ''
  createModal.description = ''
  createModal.preset = ''
  resetCreateFilters()
  createModal.error = ''
}

function closeCreate() {
  createModal.open = false
}

async function submitCreate() {
  if (!createModal.name.trim()) {
    createModal.error = '请填写名单名称'
    return
  }
  createModal.saving = true
  createModal.error = ''
  try {
    const created = await createCrmAudience({
      name: createModal.name.trim(),
      description: createModal.description.trim(),
      filters: buildFiltersPayload()
    })
    toast.value = `已创建「${created.name}」，共 ${created.count ?? 0} 人`
    closeCreate()
    await load()
    await openDetail(created._id)
  } catch (e) {
    createModal.error = e.message || '创建失败'
  } finally {
    createModal.saving = false
  }
}

async function runRefresh() {
  if (!detailId.value) return
  detailLoading.value = true
  toast.value = ''
  try {
    const data = await refreshCrmAudience(detailId.value)
    detail.value = data
    customers.value = data?.customers || []
    toast.value = `已刷新，当前 ${data.count ?? 0} 人`
    await load()
  } catch (e) {
    error.value = e.message || '刷新失败'
  } finally {
    detailLoading.value = false
  }
}

async function runExport() {
  if (!detailId.value) return
  exporting.value = true
  toast.value = ''
  try {
    const filename = await exportCrmAudience(detailId.value)
    toast.value = `已导出 ${filename}`
    await loadMarketingLogs(detailId.value)
    await loadMarketingLogs()
  } catch (e) {
    error.value = e.message || '导出失败'
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await load()
  const id = route.query.audience
  if (id) {
    detailId.value = String(id)
    await loadDetail()
  }
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.table-wrap {
  overflow: auto;
}
.link-btn {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-align: left;
}
.link-btn:hover {
  text-decoration: underline;
}
.small {
  font-size: 12px;
}
.empty {
  padding: 16px;
}
.pill {
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
  font-size: 12px;
}
.pill-ai {
  background: #dbeafe;
  color: #1e40af;
}
.acts {
  white-space: nowrap;
}
.presets {
  margin-top: 20px;
}
.marketing-logs {
  margin-top: 20px;
}
.note-form {
  margin-top: 20px;
}
.note-area {
  width: 100%;
  min-height: 80px;
  margin: 8px 0 12px;
  box-sizing: border-box;
}
.presets ul {
  margin: 8px 0 0;
  padding-left: 20px;
}
.detail-head {
  margin-bottom: 16px;
}
.detail-head h3 {
  margin: 0 0 8px;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  width: min(640px, 92vw);
  max-height: 90vh;
  overflow: auto;
}
.modal-wide {
  width: min(720px, 94vw);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.modal-foot {
  margin-top: 12px;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.filter-grid .span2 {
  grid-column: span 2;
}
label {
  display: block;
  margin: 8px 0 4px;
  font-size: 13px;
  color: #6b7280;
}
</style>
