<template>
  <div>
    <p>
      <router-link to="/orders">← 返回列表</router-link>
    </p>
    <div v-if="error" class="card err">{{ error }}</div>
    <template v-else-if="order._id">
      <h2>订单详情</h2>
      <div class="card">
        <p><strong>订单号</strong> {{ order._id }}</p>
        <p>
          <strong>状态</strong>
          <span class="badge">{{ orderStatusLabel(order.status) }}</span>
        </p>
        <p v-if="order.status === 'assigned'" class="hint">
          已指派司机，等待司机在司机端确认接单（POST /api/order/accept）。
        </p>
        <p v-if="order.status === 'cancelled'" class="hint hint-cancel">
          订单已取消。与乘客端规则一致：不进入完成页，行程相关页轮询将优先跳转订单历史。
        </p>
        <p><strong>客户手机</strong> {{ phoneOf(order.userId) }}</p>
        <p><strong>上车</strong> {{ order.pickup }}</p>
        <p><strong>下车</strong> {{ order.destination }}</p>
        <p><strong>服务类型</strong> {{ order.serviceType || 'ride' }}</p>
        <p><strong>金额</strong> {{ order.amount != null ? `¥${order.amount}` : '—' }}</p>
        <p><strong>支付</strong> {{ order.paymentStatus === 'paid' ? '已支付' : '未支付' }}</p>
        <p><strong>司机</strong> {{ phoneOf(order.driverId) || '未分配' }}</p>
        <p class="muted">创建：{{ fmt(order.createdAt) }} · 更新：{{ fmt(order.updatedAt) }}</p>
      </div>

      <h3>订单时间线</h3>
      <div class="card timeline-card">
        <p class="timeline-foot">
          以下基于现有字段拼装，不做推断性「假时间」。精确指派/接单/开始等节点需在订单模型增加独立时间戳后展示。
        </p>
        <ul class="timeline">
          <li v-for="(row, idx) in systemTimeline" :key="'sys-' + idx">
            <div class="tl-dot" />
            <div class="tl-body">
              <div class="tl-title">{{ row.label }}</div>
              <div class="tl-time">{{ row.time || '—' }}</div>
              <div v-if="row.note" class="tl-note">{{ row.note }}</div>
            </div>
          </li>
        </ul>
        <h4 class="subh">备注时间线（真实记录）</h4>
        <ul v-if="notesTimeline.length" class="timeline notes-tl">
          <li v-for="(row, idx) in notesTimeline" :key="'note-' + idx">
            <div class="tl-dot soft" />
            <div class="tl-body">
              <div class="tl-title">{{ row.label }}</div>
              <div class="tl-time">{{ row.time }}</div>
              <div class="tl-note pre">{{ row.body }}</div>
            </div>
          </li>
        </ul>
        <p v-else class="muted">暂无跟进备注</p>
      </div>

      <h3>跟进备注</h3>
      <div class="card">
        <div class="quick">
          <span class="quick-label">快捷短语：</span>
          <button
            v-for="p in notePhrases"
            :key="p"
            type="button"
            class="btn chip"
            @click="appendPhrase(p)"
          >
            {{ p }}
          </button>
        </div>
        <div v-if="!sortedNotes.length" class="muted">暂无备注</div>
        <ul v-else class="notes">
          <li v-for="(n, idx) in sortedNotes" :key="idx">
            <div class="note-meta">
              <strong>{{ authorOf(n) }}</strong>
              <span class="muted">{{ fmt(n.createdAt) }}</span>
            </div>
            <div class="note-body">{{ n.content }}</div>
          </li>
        </ul>
        <label class="lbl">新增备注</label>
        <textarea
          v-model="noteDraft"
          class="ta"
          rows="3"
          placeholder="记录沟通、异常、处理进展等"
        />
        <button
          type="button"
          class="btn btn-primary"
          :disabled="noteSaving || !noteDraft.trim()"
          @click="submitNote"
        >
          {{ noteSaving ? '提交中…' : '保存备注' }}
        </button>
        <p v-if="noteErr" class="err">{{ noteErr }}</p>
      </div>

      <div class="actions">
        <router-link
          v-if="order.status === 'pending'"
          :to="`/orders/${order._id}/dispatch`"
          class="btn btn-primary"
        >
          分配司机
        </router-link>
        <template v-else-if="order.status === 'assigned'">
          <button
            type="button"
            class="btn btn-danger"
            :disabled="revoking"
            @click="revokeAssign"
          >
            {{ revoking ? '处理中…' : '撤销指派' }}
          </button>
          <span class="muted inline-hint">将回到「待接单」并清空司机</span>
          <p v-if="revokeErr" class="err">{{ revokeErr }}</p>
        </template>
        <span v-else class="muted">当前状态不可再分配司机</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchOrderById, postOrderNote, postAdminOrderStatus } from '@/api/admin'
import { orderStatusLabel } from '@/utils/orderStatus'

const route = useRoute()
const order = ref({})
const error = ref('')
const noteDraft = ref('')
const noteSaving = ref(false)
const noteErr = ref('')
const revoking = ref(false)
const revokeErr = ref('')

const notePhrases = [
  '客户已确认',
  '司机已联系',
  '改单处理中',
  '待回电',
  '异常',
  '已取消'
]

const sortedNotes = computed(() => {
  const list = order.value.followUpNotes || []
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return tb - ta
  })
})

/** 备注按时间正序，便于时间线阅读 */
const notesAsc = computed(() => {
  const list = order.value.followUpNotes || []
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return ta - tb
  })
})

const notesTimeline = computed(() => {
  return notesAsc.value.map((n) => ({
    label: authorOf(n),
    time: fmt(n.createdAt),
    body: n.content || ''
  }))
})

const systemTimeline = computed(() => {
  const o = order.value
  if (!o || !o._id) return []
  const rows = []
  rows.push({
    label: '创建订单',
    time: fmt(o.createdAt),
    note: ''
  })

  const st = o.status
  const hasDriver = !!(o.driverId && (typeof o.driverId === 'object' ? o.driverId._id || o.driverId.phone : o.driverId))

  if (hasDriver && st !== 'pending') {
    rows.push({
      label: '已关联司机（后台指派或抢单写入）',
      time: '—',
      note: '模型未单独存储「指派时间」字段'
    })
  }

  if (['accepted', 'started', 'completed'].includes(st)) {
    rows.push({
      label: '司机已接单',
      time: '—',
      note: '模型未单独存储「接单时间」字段'
    })
  }

  if (['started', 'completed'].includes(st)) {
    rows.push({
      label: '行程已开始',
      time: '—',
      note: '模型未单独存储「开始时间」字段'
    })
  }

  if (st === 'completed') {
    rows.push({
      label: '订单已完成',
      time: fmt(o.updatedAt),
      note: '时间为 Mongo 文档最近更新时间（updatedAt），可能与实际完成瞬间有偏差；可后续增加 completedAt'
    })
  }

  if (st === 'cancelled') {
    rows.push({
      label: '订单已取消',
      time: fmt(o.updatedAt),
      note: '时间为文档最近更新时间；可后续增加 cancelledAt'
    })
  }

  return rows
})

function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
}

function authorOf(n) {
  if (n.authorDisplay) return n.authorDisplay
  if (n.authorPhone) return n.authorPhone
  return '—'
}

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

function appendPhrase(text) {
  const t = noteDraft.value.trim()
  noteDraft.value = t ? `${t} ${text}` : text
}

async function load() {
  error.value = ''
  noteErr.value = ''
  try {
    const data = await fetchOrderById(route.params.id)
    order.value = data.order || {}
  } catch (e) {
    error.value = e.message || '加载失败'
  }
}

async function submitNote() {
  if (!noteDraft.value.trim()) return
  noteSaving.value = true
  noteErr.value = ''
  try {
    const data = await postOrderNote(route.params.id, noteDraft.value.trim())
    order.value = data.order || order.value
    noteDraft.value = ''
  } catch (e) {
    noteErr.value = e.message || '保存失败'
  } finally {
    noteSaving.value = false
  }
}

async function revokeAssign() {
  if (!confirm('确定撤销指派？订单将回到「待接单」并清空当前司机。')) return
  revoking.value = true
  revokeErr.value = ''
  try {
    const data = await postAdminOrderStatus(route.params.id, 'pending')
    order.value = data.order || {}
  } catch (e) {
    revokeErr.value = e.message || '撤销失败'
  } finally {
    revoking.value = false
  }
}

onMounted(load)
watch(
  () => route.params.id,
  () => load()
)
</script>

<style scoped>
.actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.err {
  color: var(--danger);
}
a.btn {
  display: inline-block;
  text-decoration: none;
  line-height: 1.2;
}
.hint {
  font-size: 13px;
  color: #92400e;
  background: #fffbeb;
  padding: 8px 12px;
  border-radius: 6px;
}
.hint-cancel {
  color: #7f1d1d;
  background: #fee2e2;
}
.inline-hint {
  font-size: 13px;
}
.btn-danger {
  background: #dc2626;
  color: #fff;
  border: 1px solid #b91c1c;
  border-radius: var(--radius);
  padding: 8px 16px;
  cursor: pointer;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.quick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.quick-label {
  font-size: 13px;
  color: var(--muted);
}
.chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #f9fafb;
  cursor: pointer;
}
.chip:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.notes {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}
.notes li {
  border-bottom: 1px solid var(--border);
  padding: 12px 0;
}
.note-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  margin-bottom: 6px;
}
.note-body {
  white-space: pre-wrap;
  line-height: 1.5;
}
.lbl {
  display: block;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}
.ta {
  width: 100%;
  max-width: 560px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 10px;
  font-family: inherit;
}

.timeline-card {
  margin-bottom: 20px;
}
.timeline-foot {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 14px;
}
.subh {
  font-size: 14px;
  margin: 18px 0 10px;
  color: #374151;
}
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
}
.timeline li {
  display: flex;
  gap: 12px;
  padding: 10px 0 10px 4px;
  border-left: 2px solid #e5e7eb;
  margin-left: 8px;
}
.timeline li:last-child {
  border-left-color: transparent;
}
.tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  margin-left: -17px;
  margin-top: 5px;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #e5e7eb;
}
.tl-dot.soft {
  background: #94a3b8;
}
.tl-body {
  flex: 1;
  min-width: 0;
}
.tl-title {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}
.tl-time {
  font-size: 13px;
  color: #4b5563;
  margin-top: 4px;
}
.tl-note {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.45;
}
.tl-note.pre {
  white-space: pre-wrap;
}
.notes-tl li {
  border-left-color: #cbd5e1;
}
</style>
