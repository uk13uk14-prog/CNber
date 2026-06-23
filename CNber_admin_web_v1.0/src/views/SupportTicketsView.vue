<template>
  <div>
    <h2>工单管理</h2>
    <p class="muted">
      记录并处理客户/司机问题；本阶段仅客服记录闭环，不自动改单、不退款。
      <span v-if="!canUpdate" class="hint-inline">（当前角色仅可查看工单）</span>
    </p>

    <div class="toolbar card">
      <input v-model="keyword" class="input" placeholder="手机号 / 订单号 / 工单号 / 标题" />
      <select v-model="statusFilter" class="input" style="max-width: 120px">
        <option value="">全部状态</option>
        <option v-for="o in TICKET_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="typeFilter" class="input" style="max-width: 130px">
        <option value="">全部类型</option>
        <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="priorityFilter" class="input" style="max-width: 100px">
        <option value="">优先级</option>
        <option v-for="o in TICKET_PRIORITY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
      <button v-if="canCreate" type="button" class="btn" @click="openCreate">新建工单</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>工单号</th>
            <th>类型</th>
            <th>标题</th>
            <th>申请人</th>
            <th>关联订单</th>
            <th>优先级</th>
            <th>状态</th>
            <th>处理人</th>
            <th>创建时间</th>
            <th class="acts">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row._id">
            <td><code>{{ row.ticketNo }}</code></td>
            <td>{{ ticketTypeLabel(row.type) }}</td>
            <td class="ellipsis">{{ row.title }}</td>
            <td>
              <div>{{ row.requesterPhone || '—' }}</div>
              <div class="sub">{{ row.requesterRoleLabel || row.requesterRole }}</div>
            </td>
            <td>
              <router-link v-if="row.orderId" :to="{ name: 'order-detail', params: { id: row.orderId } }">
                {{ row.orderNo || '订单' }}
              </router-link>
              <span v-else>—</span>
            </td>
            <td><span class="pill" :class="ticketPriorityClass(row.priority)">{{ ticketPriorityLabel(row.priority) }}</span></td>
            <td><span class="pill" :class="ticketStatusClass(row.status)">{{ ticketStatusLabel(row.status) }}</span></td>
            <td>{{ row.assignedStaffName || '—' }}</td>
            <td class="time-col">{{ fmtTime(row.createdAt) }}</td>
            <td class="acts">
              <button type="button" class="btn mini" @click="openDetail(row)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager muted">
      共 {{ total }} 条 · 第 {{ page }} 页
      <button type="button" class="btn mini" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <button type="button" class="btn mini" :disabled="page * pageSize >= total" @click="page++; load()">下一页</button>
    </div>

    <!-- 新建 -->
    <div v-if="createModal.open" class="modal-mask" @click.self="closeCreate">
      <div class="modal card modal-wide">
        <div class="modal-head">
          <h3>新建工单</h3>
          <button type="button" class="btn" @click="closeCreate">关闭</button>
        </div>
        <div class="form-grid">
          <label>类型 <select v-model="createModal.form.type" class="input">
            <option v-for="o in TICKET_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select></label>
          <label>优先级 <select v-model="createModal.form.priority" class="input">
            <option v-for="o in TICKET_PRIORITY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select></label>
          <label>申请人角色 <select v-model="createModal.form.requesterRole" class="input">
            <option v-for="o in REQUESTER_ROLE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select></label>
          <label>申请人手机 <input v-model="createModal.form.requesterPhone" class="input" /></label>
          <label>关联订单 ID <input v-model="createModal.form.orderId" class="input" placeholder="可选" /></label>
        </div>
        <label class="block">标题</label>
        <input v-model="createModal.form.title" class="input" />
        <label class="block">问题描述</label>
        <textarea v-model="createModal.form.description" class="input ta" rows="4" />
        <p v-if="createModal.error" class="err">{{ createModal.error }}</p>
        <div class="modal-foot">
          <button type="button" class="btn btn-primary" :disabled="createModal.saving" @click="submitCreate">
            {{ createModal.saving ? '提交中…' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情 -->
    <div v-if="detailModal.open" class="modal-mask" @click.self="closeDetail">
      <div class="modal card modal-wide">
        <div class="modal-head">
          <h3>{{ detailModal.ticket?.ticketNo }} · {{ detailModal.ticket?.title }}</h3>
          <button type="button" class="btn" @click="closeDetail">关闭</button>
        </div>

        <template v-if="detailModal.ticket">
          <div class="detail-meta">
            <span class="pill" :class="ticketStatusClass(detailModal.ticket.status)">
              {{ ticketStatusLabel(detailModal.ticket.status) }}
            </span>
            <span class="pill" :class="ticketPriorityClass(detailModal.ticket.priority)">
              {{ ticketPriorityLabel(detailModal.ticket.priority) }}
            </span>
            <span>{{ ticketTypeLabel(detailModal.ticket.type) }}</span>
            <span>{{ detailModal.ticket.requesterPhone || '—' }}</span>
            <router-link v-if="detailModal.ticket.orderId" :to="{ name: 'order-detail', params: { id: detailModal.ticket.orderId } }">
              订单 {{ detailModal.ticket.orderNo || detailModal.ticket.orderId }}
            </router-link>
          </div>

          <p class="desc">{{ detailModal.ticket.description || '—' }}</p>
          <p v-if="detailModal.ticket.resolution" class="resolution">
            <strong>处理结果：</strong>{{ detailModal.ticket.resolution }}
          </p>

          <div v-if="canUpdate" class="action-row">
            <select v-model="detailModal.nextStatus" class="input" style="max-width: 140px">
              <option v-for="o in TICKET_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <input v-model="detailModal.resolutionDraft" class="input flex1" placeholder="处理结果（可选）" />
            <button type="button" class="btn btn-primary" :disabled="detailModal.saving" @click="updateStatus">
              更新状态
            </button>
          </div>

          <h4>处理记录</h4>
          <ul v-if="detailModal.ticket.operationLogs?.length" class="log-list">
            <li v-for="log in sortedLogs" :key="log._id || log.createdAt">
              <div class="log-head">
                <strong>{{ log.authorName || '—' }}</strong>
                <span class="muted">{{ fmtTime(log.createdAt) }}</span>
              </div>
              <div>{{ log.content }}</div>
            </li>
          </ul>
          <p v-else class="muted">暂无记录</p>

          <div v-if="canUpdate" class="comment-row">
            <textarea v-model="detailModal.commentDraft" class="input ta" rows="2" placeholder="添加处理记录…" />
            <button type="button" class="btn" :disabled="detailModal.saving" @click="submitComment">添加记录</button>
          </div>
        </template>

        <p v-if="detailModal.loading" class="muted">加载中…</p>
        <p v-if="detailModal.error" class="err">{{ detailModal.error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  addSupportTicketComment,
  createSupportTicket,
  fetchSupportTicket,
  fetchSupportTickets,
  patchSupportTicketStatus
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import {
  TICKET_TYPE_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  REQUESTER_ROLE_OPTIONS,
  ticketTypeLabel,
  ticketStatusLabel,
  ticketPriorityLabel,
  ticketStatusClass,
  ticketPriorityClass
} from '@/utils/supportTicketLabels'

const auth = useAuthStore()
const canCreate = computed(() => auth.can('support_tickets', 'create'))
const canUpdate = computed(() => auth.can('support_tickets', 'update'))
const typeOptions = computed(() => {
  if (auth.staffRole === 'finance') {
    return TICKET_TYPE_OPTIONS.filter((x) => x.value === 'refund_request')
  }
  return TICKET_TYPE_OPTIONS
})

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const priorityFilter = ref('')
const error = ref('')
const toast = ref('')

const createModal = reactive({
  open: false,
  saving: false,
  error: '',
  form: emptyCreateForm()
})

const detailModal = reactive({
  open: false,
  loading: false,
  saving: false,
  error: '',
  ticket: null,
  nextStatus: 'pending',
  resolutionDraft: '',
  commentDraft: ''
})

const sortedLogs = computed(() => {
  const list = detailModal.ticket?.operationLogs || []
  return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

function emptyCreateForm() {
  return {
    type: 'complaint',
    priority: 'normal',
    requesterRole: 'customer',
    requesterPhone: '',
    orderId: '',
    title: '',
    description: ''
  }
}

function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
}

async function load() {
  error.value = ''
  try {
    const params = { page: page.value, pageSize: pageSize }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (statusFilter.value) params.status = statusFilter.value
    if (typeFilter.value) params.type = typeFilter.value
    if (priorityFilter.value) params.priority = priorityFilter.value
    const data = await fetchSupportTickets(params)
    rows.value = data?.tickets || []
    total.value = data?.total ?? 0
  } catch (e) {
    error.value = e.message || '加载失败'
  }
}

function openCreate() {
  createModal.form = emptyCreateForm()
  createModal.error = ''
  createModal.open = true
}

function closeCreate() {
  createModal.open = false
}

async function submitCreate() {
  createModal.saving = true
  createModal.error = ''
  try {
    await createSupportTicket({
      ...createModal.form,
      orderId: createModal.form.orderId || undefined
    })
    toast.value = '工单已创建'
    closeCreate()
    await load()
  } catch (e) {
    createModal.error = e.message || '创建失败'
  } finally {
    createModal.saving = false
  }
}

async function openDetail(row) {
  detailModal.open = true
  detailModal.loading = true
  detailModal.error = ''
  detailModal.commentDraft = ''
  detailModal.resolutionDraft = ''
  try {
    const data = await fetchSupportTicket(row._id)
    detailModal.ticket = data?.ticket || row
    detailModal.nextStatus = detailModal.ticket.status
    detailModal.resolutionDraft = detailModal.ticket.resolution || ''
  } catch (e) {
    detailModal.error = e.message || '加载失败'
  } finally {
    detailModal.loading = false
  }
}

function closeDetail() {
  detailModal.open = false
}

async function updateStatus() {
  if (!detailModal.ticket?._id) return
  detailModal.saving = true
  detailModal.error = ''
  try {
    const data = await patchSupportTicketStatus(detailModal.ticket._id, {
      status: detailModal.nextStatus,
      resolution: detailModal.resolutionDraft
    })
    detailModal.ticket = data?.ticket || detailModal.ticket
    toast.value = '状态已更新'
    await load()
  } catch (e) {
    detailModal.error = e.message || '更新失败'
  } finally {
    detailModal.saving = false
  }
}

async function submitComment() {
  if (!detailModal.ticket?._id || !detailModal.commentDraft.trim()) return
  detailModal.saving = true
  detailModal.error = ''
  try {
    const data = await addSupportTicketComment(detailModal.ticket._id, detailModal.commentDraft.trim())
    detailModal.ticket = data?.ticket || detailModal.ticket
    detailModal.commentDraft = ''
    toast.value = '已添加处理记录'
    await load()
  } catch (e) {
    detailModal.error = e.message || '添加失败'
  } finally {
    detailModal.saving = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
}
.hint-inline {
  color: #9ca3af;
}
.sub {
  font-size: 12px;
  color: #9ca3af;
}
.time-col {
  font-size: 12px;
  white-space: nowrap;
}
.ellipsis {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modal-wide {
  max-width: 760px;
  width: 100%;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.block {
  display: block;
  margin: 10px 0 4px;
  font-size: 13px;
  color: #6b7280;
}
.ta {
  width: 100%;
  min-height: 80px;
}
.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
}
.desc {
  white-space: pre-wrap;
  line-height: 1.5;
  margin-bottom: 12px;
}
.resolution {
  background: #f0fdf4;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}
.action-row,
.comment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  margin: 12px 0;
}
.flex1 {
  flex: 1;
  min-width: 160px;
}
.log-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}
.log-list li {
  border-left: 3px solid #e5e7eb;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #f9fafb;
  border-radius: 0 8px 8px 0;
}
.log-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #f3f4f6;
}
.pill-ok {
  background: #d1fae5;
  color: #065f46;
}
.pill-pending {
  background: #fef3c7;
  color: #92400e;
}
.pill-progress {
  background: #dbeafe;
  color: #1e40af;
}
.pill-urgent {
  background: #fee2e2;
  color: #991b1b;
}
.pill-high {
  background: #ffedd5;
  color: #9a3412;
}
code {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
</style>
