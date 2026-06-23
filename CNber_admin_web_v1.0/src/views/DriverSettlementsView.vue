<template>
  <div>
    <h2>司机结算</h2>
    <p class="muted">
      按日 / 3天 / 7天 / 14天或自定义周期汇总已完成订单的司机结算（GBP），按当前汇率换算应付 CNY。V1 人工标记已结算，不接自动打款。
    </p>

    <div class="toolbar card">
      <label>快捷筛选</label>
      <select v-model="quickFilter" class="input" style="max-width: 140px">
        <option value="last3d">最近 3 天</option>
        <option value="today">今天</option>
        <option value="yesterday">昨天</option>
        <option value="last7d">最近 7 天</option>
        <option value="last14d">最近 14 天</option>
        <option value="custom">自定义</option>
      </select>
      <template v-if="quickFilter === 'custom'">
        <input v-model="customStart" class="input" type="date" />
        <span class="muted">至</span>
        <input v-model="customEnd" class="input" type="date" />
      </template>
      <label>状态</label>
      <select v-model="statusFilter" class="input" style="max-width: 120px">
        <option value="">全部</option>
        <option value="pending">待结算</option>
        <option value="paid">已结算</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
      <button v-if="canCreate" type="button" class="btn" @click="openGenerate">生成结算</button>
    </div>

    <p v-if="filterRange.startDate" class="muted range-hint">
      当前区间：{{ filterRange.startDate }} ~ {{ filterRange.endDate }}
    </p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>结算周期</th>
            <th>司机</th>
            <th>完成单数</th>
            <th>司机结算 GBP</th>
            <th>汇率</th>
            <th>应付 CNY</th>
            <th>状态</th>
            <th class="acts">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row._id">
            <td>
              <div>{{ row.periodLabel || '—' }}</div>
              <div class="sub">{{ periodTypeLabel(row.periodType) }}</div>
            </td>
            <td>
              <div>{{ row.driverName || '—' }}</div>
              <div class="sub">{{ row.driverPhone || '—' }}</div>
            </td>
            <td>{{ row.orderCount || 0 }}</td>
            <td>{{ formatGbp(row.driverSettlementGbp) }}</td>
            <td>{{ row.exchangeRate ?? '—' }}</td>
            <td>{{ formatCny(row.payableCny) }}</td>
            <td>
              <span class="pill" :class="row.status === 'paid' ? 'pill-ok' : 'pill-pending'">
                {{ row.status === 'paid' ? '已结算' : '待结算' }}
              </span>
            </td>
            <td class="acts">
              <button type="button" class="btn mini" @click="openDetail(row)">明细</button>
              <button
                v-if="canApprove && row.status !== 'paid'"
                type="button"
                class="btn mini btn-primary"
                :disabled="actingId === row._id"
                @click="openMarkPaid(row)"
              >
                {{ actingId === row._id ? '处理中…' : '标记已结算' }}
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

    <div v-if="genModal.open" class="modal-mask" @click.self="closeGenerate">
      <div class="modal card">
        <div class="modal-head">
          <h3>生成结算单</h3>
          <button type="button" class="btn" @click="closeGenerate">关闭</button>
        </div>
        <label>结算周期类型</label>
        <select v-model="genModal.periodType" class="input" @change="syncGenerateDates">
          <option value="daily">每日</option>
          <option value="three_day">每 3 天</option>
          <option value="seven_day">每 7 天</option>
          <option value="fourteen_day">每 14 天</option>
          <option value="custom">自定义日期</option>
        </select>
        <label>开始日期</label>
        <input v-model="genModal.startDate" class="input" type="date" :disabled="genModal.periodType !== 'custom' && genModal.periodType !== 'daily'" />
        <label>结束日期</label>
        <input v-model="genModal.endDate" class="input" type="date" @change="syncGenerateDates" />
        <p class="muted hint">
          将汇总该区间内 <strong>已完成</strong> 订单，按司机聚合。已标记 <strong>paid</strong> 的结算单不会被覆盖。
        </p>
        <p v-if="genModal.error" class="err">{{ genModal.error }}</p>
        <div class="modal-foot">
          <button type="button" class="btn btn-primary" :disabled="genModal.saving" @click="submitGenerate">
            {{ genModal.saving ? '生成中…' : '生成' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="detailModal.open" class="modal-mask" @click.self="closeDetail">
      <div class="modal card modal-wide">
        <div class="modal-head">
          <h3>结算明细 · {{ detailModal.settlement?.periodLabel }}</h3>
          <button type="button" class="btn" @click="closeDetail">关闭</button>
        </div>
        <template v-if="detailModal.settlement">
          <p>
            司机 {{ detailModal.settlement.driverName || '—' }} /
            {{ detailModal.settlement.driverPhone || '—' }} ·
            {{ formatGbp(detailModal.settlement.driverSettlementGbp) }} ·
            应付 {{ formatCny(detailModal.settlement.payableCny) }}
          </p>
          <div v-if="detailModal.settlement.status === 'paid'" class="payment-block card">
            <h4>打款信息</h4>
            <p>打款时间：{{ fmtTime(detailModal.settlement.paidAt) }}</p>
            <p>打款方式：{{ paymentMethodLabel(detailModal.settlement.paymentMethod) }}</p>
            <p v-if="detailModal.settlement.paymentReference">
              流水号：{{ detailModal.settlement.paymentReference }}
            </p>
            <p v-if="detailModal.settlement.paymentProofUrl">
              凭证：
              <a :href="detailModal.settlement.paymentProofUrl" target="_blank" rel="noopener">查看</a>
            </p>
            <p v-if="detailModal.settlement.paymentRemark">
              备注：{{ detailModal.settlement.paymentRemark }}
            </p>
          </div>
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>路线</th>
                  <th>司机结算 GBP</th>
                  <th>完成时间</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in detailModal.orders" :key="o._id">
                  <td>{{ o.orderNo }}</td>
                  <td class="ellipsis">{{ o.pickup }} → {{ o.destination }}</td>
                  <td>{{ formatGbp(o.driverSettlementGbp) }}</td>
                  <td>{{ fmtTime(o.completedAt) }}</td>
                  <td>
                    <router-link :to="{ name: 'order-detail', params: { id: o._id } }">订单</router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <p v-if="detailModal.loading" class="muted">加载中…</p>
        <p v-if="detailModal.error" class="err">{{ detailModal.error }}</p>
      </div>
    </div>

    <div v-if="paidModal.open" class="modal-mask" @click.self="closeMarkPaid">
      <div class="modal card">
        <div class="modal-head">
          <h3>标记已结算 · {{ paidModal.row?.periodLabel }}</h3>
          <button type="button" class="btn" @click="closeMarkPaid">关闭</button>
        </div>
        <label>打款方式</label>
        <select v-model="paidModal.paymentMethod" class="input">
          <option value="">（可选）</option>
          <option value="bank_transfer">银行转账</option>
          <option value="wise">Wise</option>
          <option value="cash">现金</option>
          <option value="wechat">微信</option>
          <option value="alipay">支付宝</option>
          <option value="other">其他</option>
        </select>
        <label>交易流水号</label>
        <input v-model="paidModal.paymentReference" class="input" placeholder="WISE-xxx" />
        <label>凭证 URL</label>
        <input v-model="paidModal.paymentProofUrl" class="input" placeholder="https://..." />
        <label>打款备注</label>
        <input v-model="paidModal.paymentRemark" class="input" placeholder="已转账" />
        <p v-if="paidModal.error" class="err">{{ paidModal.error }}</p>
        <div class="modal-foot">
          <button type="button" class="btn btn-primary" :disabled="paidModal.saving" @click="submitMarkPaid">
            {{ paidModal.saving ? '提交中…' : '确认已结算' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  fetchDriverSettlementBatches,
  generateDriverSettlementBatches,
  fetchDriverSettlementBatch,
  patchDriverSettlementStatus
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { formatCny, formatGbp } from '@/utils/currencyDisplay'

const auth = useAuthStore()
const canCreate = computed(() => auth.can('driver_settlements', 'create'))
const canApprove = computed(() => auth.can('driver_settlements', 'approve'))

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const quickFilter = ref('last3d')
const customStart = ref('')
const customEnd = ref('')
const statusFilter = ref('')
const filterRange = reactive({ startDate: '', endDate: '' })
const error = ref('')
const toast = ref('')
const actingId = ref('')

const genModal = reactive({
  open: false,
  saving: false,
  error: '',
  periodType: 'three_day',
  startDate: '',
  endDate: ''
})

const detailModal = reactive({
  open: false,
  loading: false,
  error: '',
  settlement: null,
  orders: []
})

const paidModal = reactive({
  open: false,
  saving: false,
  error: '',
  row: null,
  paymentMethod: '',
  paymentReference: '',
  paymentProofUrl: '',
  paymentRemark: ''
})

const PAYMENT_METHOD_LABELS = {
  bank_transfer: '银行转账',
  wise: 'Wise',
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  other: '其他'
}

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '—'
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysStr(base, days) {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function periodTypeLabel(t) {
  const map = {
    daily: '每日',
    three_day: '3 天',
    seven_day: '7 天',
    fourteen_day: '14 天',
    custom: '自定义',
    monthly: '月结'
  }
  return map[t] || t || '—'
}

function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
}

function buildListParams() {
  const params = {
    page: page.value,
    pageSize,
    status: statusFilter.value || undefined
  }
  if (quickFilter.value === 'custom') {
    if (customStart.value) params.startDate = customStart.value
    if (customEnd.value) params.endDate = customEnd.value
  } else {
    params.quick = quickFilter.value
  }
  return params
}

async function load() {
  error.value = ''
  try {
    const data = await fetchDriverSettlementBatches(buildListParams())
    rows.value = data?.settlements || []
    total.value = data?.total ?? 0
    Object.assign(filterRange, data?.filterRange || {})
  } catch (e) {
    error.value = e.message || '加载失败'
  }
}

function syncGenerateDates() {
  const end = genModal.endDate || todayStr()
  genModal.endDate = end
  const span =
    genModal.periodType === 'daily'
      ? 0
      : genModal.periodType === 'three_day'
        ? 2
        : genModal.periodType === 'seven_day'
          ? 6
          : genModal.periodType === 'fourteen_day'
            ? 13
            : null
  if (span != null) {
    genModal.startDate = addDaysStr(end, -span)
  }
}

function openGenerate() {
  genModal.open = true
  genModal.error = ''
  genModal.periodType = 'three_day'
  genModal.endDate = todayStr()
  syncGenerateDates()
}

function closeGenerate() {
  genModal.open = false
}

async function submitGenerate() {
  genModal.saving = true
  genModal.error = ''
  try {
    const data = await generateDriverSettlementBatches({
      periodType: genModal.periodType,
      startDate: genModal.startDate,
      endDate: genModal.endDate
    })
    toast.value = `已生成：新建 ${data.created || 0}，更新 ${data.updated || 0}，跳过已结算 ${data.skippedPaid || 0}`
    closeGenerate()
    await load()
  } catch (e) {
    genModal.error = e.message || '生成失败'
  } finally {
    genModal.saving = false
  }
}

async function openDetail(row) {
  detailModal.open = true
  detailModal.loading = true
  detailModal.error = ''
  detailModal.settlement = row
  detailModal.orders = []
  try {
    const data = await fetchDriverSettlementBatch(row._id)
    detailModal.settlement = data?.settlement || row
    detailModal.orders = data?.orders || []
  } catch (e) {
    detailModal.error = e.message || '加载失败'
  } finally {
    detailModal.loading = false
  }
}

function closeDetail() {
  detailModal.open = false
}

function openMarkPaid(row) {
  paidModal.open = true
  paidModal.row = row
  paidModal.error = ''
  paidModal.paymentMethod = ''
  paidModal.paymentReference = ''
  paidModal.paymentProofUrl = ''
  paidModal.paymentRemark = ''
}

function closeMarkPaid() {
  paidModal.open = false
  paidModal.row = null
}

async function submitMarkPaid() {
  if (!paidModal.row?._id) return
  paidModal.saving = true
  paidModal.error = ''
  actingId.value = paidModal.row._id
  try {
    const body = { status: 'paid' }
    if (paidModal.paymentMethod) body.paymentMethod = paidModal.paymentMethod
    if (paidModal.paymentReference.trim()) body.paymentReference = paidModal.paymentReference.trim()
    if (paidModal.paymentProofUrl.trim()) body.paymentProofUrl = paidModal.paymentProofUrl.trim()
    if (paidModal.paymentRemark.trim()) body.paymentRemark = paidModal.paymentRemark.trim()
    await patchDriverSettlementStatus(paidModal.row._id, body)
    toast.value = '已标记为已结算'
    closeMarkPaid()
    await load()
  } catch (e) {
    paidModal.error = e.message || '操作失败'
  } finally {
    paidModal.saving = false
    actingId.value = ''
  }
}

onMounted(() => {
  const t = todayStr()
  customEnd.value = t
  customStart.value = addDaysStr(t, -2)
  load()
})
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
.range-hint {
  margin: 0 0 12px;
}
.sub {
  font-size: 12px;
  color: #9ca3af;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.pill-ok {
  background: #d1fae5;
  color: #065f46;
}
.pill-pending {
  background: #fef3c7;
  color: #92400e;
}
.modal-wide {
  max-width: 820px;
  width: 100%;
}
.hint {
  font-size: 13px;
  margin: 12px 0;
}
.ellipsis {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.payment-block {
  margin: 12px 0;
  padding: 12px;
}
.payment-block h4 {
  margin: 0 0 8px;
}
.payment-block p {
  margin: 4px 0;
  font-size: 14px;
}
</style>
