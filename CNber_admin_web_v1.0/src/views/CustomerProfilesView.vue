<template>
  <div>
    <h2>客户画像</h2>
    <p class="muted">
      订单聚合数据基础，供 AI 分析、精准活动与用车提醒预留。仅
      <strong>marketingConsent=true</strong>
      的客户可进入后续营销候选池；本页不发送任何消息。
    </p>

    <div class="toolbar card">
      <input v-model="search" class="input" placeholder="手机号 / 姓名" />
      <input v-model="tagFilter" class="input" placeholder="标签筛选" style="max-width: 140px" />
      <label>营销同意</label>
      <select v-model="marketingFilter" class="input" style="max-width: 120px">
        <option value="">全部</option>
        <option value="true">已同意</option>
        <option value="false">未同意</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>姓名</th>
            <th>手机号</th>
            <th>标签</th>
            <th>总订单</th>
            <th>总消费 CNY</th>
            <th>常用路线</th>
            <th>最近下单</th>
            <th>营销同意</th>
            <th>备注</th>
            <th>AI 洞察</th>
            <th class="acts">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row._id">
            <td>{{ row.name || '—' }}</td>
            <td>{{ row.phone || '—' }}</td>
            <td>
              <span v-for="t in row.tags || []" :key="t" class="pill">{{ t }}</span>
              <span v-if="!row.tags?.length" class="muted">—</span>
            </td>
            <td>{{ row.totalOrders ?? 0 }}</td>
            <td>¥{{ formatMoney(row.totalSpentCny) }}</td>
            <td class="ellipsis" :title="routeText(row)">{{ routeText(row) || '—' }}</td>
            <td>{{ fmtTime(row.lastOrderAt) || '—' }}</td>
            <td>
              <span class="pill" :class="row.marketingConsent ? 'pill-ok' : ''">
                {{ row.marketingConsent ? '已同意' : '未同意' }}
              </span>
            </td>
            <td class="ellipsis" :title="row.notes">{{ row.notes || '—' }}</td>
            <td>
              <span v-if="row.aiInsight || row.aiProfileSummary" class="pill pill-ok">有</span>
              <span v-else class="muted">—</span>
            </td>
            <td class="acts">
              <button type="button" class="btn mini" @click="openEdit(row)">编辑</button>
              <button
                type="button"
                class="btn mini"
                :disabled="aiLoading === row._id"
                @click="runAi(row)"
              >
                生成AI分析
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager muted">
      共 {{ total }} 条 · 第 {{ page }} 页
      <button type="button" class="btn mini" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <button
        type="button"
        class="btn mini"
        :disabled="page * pageSize >= total"
        @click="page++; load()"
      >
        下一页
      </button>
    </div>

    <div v-if="editModal.open" class="modal-mask" @click.self="closeEdit">
      <div class="modal card">
        <div class="modal-head">
          <h3>编辑客户画像 · {{ editModal.row?.phone }}</h3>
          <button type="button" class="btn" @click="closeEdit">关闭</button>
        </div>
        <label>标签（逗号分隔）</label>
        <input v-model="editModal.tagsText" class="input" />
        <label>客户类型</label>
        <select v-model="editModal.customerType" class="input">
          <option value="unknown">未知</option>
          <option value="student">学生</option>
          <option value="family">家庭</option>
          <option value="business">商务</option>
          <option value="tourist">游客</option>
        </select>
        <label>营销同意</label>
        <select v-model="editModal.marketingConsent" class="input">
          <option :value="false">未同意（不可进入营销候选池）</option>
          <option :value="true">已同意</option>
        </select>
        <label>备注</label>
        <textarea v-model="editModal.notes" class="input" rows="4" />
        <p v-if="editModal.error" class="err">{{ editModal.error }}</p>
        <div class="modal-foot">
          <button type="button" class="btn btn-primary" :disabled="editModal.saving" @click="saveEdit">
            保存
          </button>
        </div>
        <div v-if="editModal.aiInsight" class="ai-box">
          <h4>AI 洞察</h4>
          <p class="ai-meta muted" v-if="editModal.aiInsight.updatedAt">
            生成于 {{ fmtTime(editModal.aiInsight.updatedAt) }} · V{{ editModal.aiInsight.version || 1 }}
          </p>
          <div v-if="editModal.aiInsight.tags?.length" class="ai-section">
            <strong>标签</strong>
            <div>
              <span v-for="t in editModal.aiInsight.tags" :key="t" class="pill pill-ai">{{ t }}</span>
            </div>
          </div>
          <div v-if="editModal.aiInsight.summary" class="ai-section">
            <strong>摘要</strong>
            <p>{{ editModal.aiInsight.summary }}</p>
          </div>
          <div v-if="editModal.aiInsight.recommendations?.length" class="ai-section">
            <strong>推荐</strong>
            <ul class="ai-recs">
              <li v-for="r in editModal.aiInsight.recommendations" :key="r">{{ r }}</li>
            </ul>
          </div>
        </div>
        <div v-else-if="editModal.row?.aiProfileSummary" class="ai-box">
          <h4>AI 洞察（历史摘要）</h4>
          <pre>{{ editModal.row.aiProfileSummary }}</pre>
        </div>
        <div v-else class="ai-box muted">
          <p>暂无 AI 洞察，可点击列表中的「生成AI分析」。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  fetchCustomerProfiles,
  fetchCustomerProfile,
  patchCustomerProfile,
  generateCustomerAiSummary
} from '@/api/admin'

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const search = ref('')
const tagFilter = ref('')
const marketingFilter = ref('')
const error = ref('')
const toast = ref('')
const aiLoading = ref('')

const editModal = reactive({
  open: false,
  row: null,
  tagsText: '',
  customerType: 'unknown',
  marketingConsent: false,
  notes: '',
  saving: false,
  error: '',
  aiInsight: null
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

function routeText(row) {
  const routes = row.frequentRoutes || []
  if (!routes.length) return ''
  return routes
    .slice(0, 2)
    .map((r) => `${r.from || '?'}→${r.to || '?'}(${r.count})`)
    .join('；')
}

async function load() {
  error.value = ''
  try {
    const data = await fetchCustomerProfiles({
      page: page.value,
      pageSize,
      search: search.value.trim() || undefined,
      tag: tagFilter.value.trim() || undefined,
      marketingConsent: marketingFilter.value || undefined
    })
    rows.value = data?.rows || []
    total.value = data?.total ?? 0
  } catch (e) {
    error.value = e.message || '加载失败'
    rows.value = []
  }
}

async function openEdit(row) {
  editModal.open = true
  editModal.row = row
  editModal.tagsText = (row.tags || []).join('，')
  editModal.customerType = row.customerType || 'unknown'
  editModal.marketingConsent = Boolean(row.marketingConsent)
  editModal.notes = row.notes || ''
  editModal.error = ''
  editModal.aiInsight = row.aiInsight || null
  try {
    const detail = await fetchCustomerProfile(row._id)
    if (detail?.aiInsight) {
      editModal.aiInsight = detail.aiInsight
      row.aiInsight = detail.aiInsight
    }
  } catch {
    /* 列表仍可编辑 */
  }
}

function closeEdit() {
  editModal.open = false
}

async function saveEdit() {
  editModal.saving = true
  editModal.error = ''
  try {
    const tags = editModal.tagsText
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const updated = await patchCustomerProfile(editModal.row._id, {
      tags,
      customerType: editModal.customerType,
      marketingConsent: editModal.marketingConsent,
      notes: editModal.notes
    })
    Object.assign(editModal.row, updated)
    toast.value = '已保存'
    closeEdit()
    await load()
  } catch (e) {
    editModal.error = e.message || '保存失败'
  } finally {
    editModal.saving = false
  }
}

async function runAi(row) {
  aiLoading.value = row._id
  toast.value = ''
  try {
    const updated = await generateCustomerAiSummary(row._id)
    Object.assign(row, updated)
    if (updated.aiInsight) row.aiInsight = updated.aiInsight
    toast.value = 'AI 洞察已生成'
  } catch (e) {
    error.value = e.message || '生成失败'
  } finally {
    aiLoading.value = ''
  }
}

onMounted(load)
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
.ellipsis {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pill {
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
  font-size: 12px;
}
.pill-ok {
  background: #d1fae5;
  color: #065f46;
}
.pill-ai {
  background: #dbeafe;
  color: #1e40af;
}
.acts {
  white-space: nowrap;
}
.pager {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
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
  width: min(520px, 92vw);
  max-height: 90vh;
  overflow: auto;
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
.ai-box {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}
.ai-box pre {
  white-space: pre-wrap;
  font-size: 13px;
  color: #374151;
}
.ai-section {
  margin-top: 10px;
}
.ai-section strong {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}
.ai-section p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
.ai-recs {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 14px;
}
.ai-meta {
  font-size: 12px;
  margin: 0 0 8px;
}
label {
  display: block;
  margin: 8px 0 4px;
  font-size: 13px;
  color: #6b7280;
}
textarea.input {
  width: 100%;
  resize: vertical;
}
</style>
