<template>
  <div>
    <h2>财务对账中心</h2>
    <p class="muted">预约制试运营：人工确认收款、司机结算与平台毛利，不接支付网关。</p>

    <p v-if="err" class="err">{{ err }}</p>

    <div v-if="summary" class="grid">
      <div class="card stat">
        <div class="label">今日收款</div>
        <div class="num">{{ money(summary.todayCollected) }}</div>
      </div>
      <div class="card stat">
        <div class="label">本周收款</div>
        <div class="num">{{ money(summary.weekCollected) }}</div>
      </div>
      <div class="card stat">
        <div class="label">本月收款</div>
        <div class="num">{{ money(summary.monthCollected) }}</div>
      </div>
      <div class="card stat">
        <div class="label">已确认定金</div>
        <div class="num">{{ money(summary.confirmedDepositTotal) }}</div>
      </div>
      <div class="card stat">
        <div class="label">已确认尾款</div>
        <div class="num">{{ money(summary.confirmedBalanceTotal) }}</div>
      </div>
      <div class="card stat">
        <div class="label">平台毛利</div>
        <div class="num">{{ money(summary.platformProfit) }}</div>
      </div>
      <div class="card stat">
        <div class="label">未结算司机金额</div>
        <div class="num warn">{{ money(summary.unsettledDriverAmount) }}</div>
      </div>
    </div>

    <h3>收款明细</h3>
    <div class="toolbar card">
      <label>类型</label>
      <select v-model="txType" class="input" style="max-width: 120px">
        <option value="">全部</option>
        <option value="deposit">定金</option>
        <option value="balance">尾款</option>
      </select>
      <label>状态</label>
      <select v-model="txStatus" class="input" style="max-width: 120px">
        <option value="">全部</option>
        <option value="unpaid">未付</option>
        <option value="pending">待确认</option>
        <option value="confirmed">已确认</option>
      </select>
      <button type="button" class="btn btn-primary" @click="txPage = 1; loadTransactions()">查询</button>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>订单号</th>
            <th>客户手机号</th>
            <th>类型</th>
            <th>金额</th>
            <th>状态</th>
            <th>确认时间</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in transactions" :key="t._id">
            <td>{{ t.orderNo }}</td>
            <td>{{ t.customerPhone || '—' }}</td>
            <td>{{ typeLabel(t.type) }}</td>
            <td>{{ money(t.amount) }}</td>
            <td><span class="pill" :class="statusClass(t.status)">{{ payStatusLabel(t.status) }}</span></td>
            <td>{{ fmtTime(t.confirmedAt) || '—' }}</td>
            <td>
              <router-link v-if="t.orderId" :to="{ name: 'order-detail', params: { id: t.orderId } }">
                订单
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pager muted">
      共 {{ txTotal }} 条
      <button type="button" class="btn mini" :disabled="txPage <= 1" @click="txPage--; loadTransactions()">上一页</button>
      <button
        type="button"
        class="btn mini"
        :disabled="txPage * txPageSize >= txTotal"
        @click="txPage++; loadTransactions()"
      >
        下一页
      </button>
    </div>

    <h3>订单对账明细</h3>
    <div class="toolbar card">
      <label>结算状态</label>
      <select v-model="reconStatus" class="input" style="max-width: 160px">
        <option value="">全部</option>
        <option value="unsettled">未结算</option>
        <option value="partially_settled">部分结算</option>
        <option value="settled">已结算</option>
      </select>
      <button type="button" class="btn btn-primary" @click="reconPage = 1; loadReconciliation()">查询</button>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>订单</th>
            <th>客户实付</th>
            <th>定金</th>
            <th>尾款</th>
            <th>司机应付</th>
            <th>司机已付</th>
            <th>平台毛利</th>
            <th>未结</th>
            <th>退款</th>
            <th>状态</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reconRows" :key="r.orderId">
            <td>{{ r.orderNo || r.orderId }}</td>
            <td>{{ money(r.customerPaidTotal) }}</td>
            <td>{{ money(r.depositPaid) }}</td>
            <td>{{ money(r.balancePaid) }}</td>
            <td>{{ money(r.driverPayable) }}</td>
            <td>{{ money(r.driverPaid) }}</td>
            <td>{{ money(r.platformProfit) }}</td>
            <td>{{ money(r.unsettledAmount) }}</td>
            <td>{{ money(r.refundAmount) }}</td>
            <td>{{ settlementLabel(r.settlementStatus) }}</td>
            <td>
              <router-link :to="{ name: 'order-detail', params: { id: r.orderId } }">详情</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pager muted">
      共 {{ reconTotal }} 条
      <button type="button" class="btn mini" :disabled="reconPage <= 1" @click="reconPage--; loadReconciliation()">
        上一页
      </button>
      <button
        type="button"
        class="btn mini"
        :disabled="reconPage * reconPageSize >= reconTotal"
        @click="reconPage++; loadReconciliation()"
      >
        下一页
      </button>
    </div>

    <h3>司机结算（按单）</h3>
    <p class="muted">
      以下为订单维度待结算视图。
      <router-link :to="{ name: 'driver-settlements' }">前往司机结算中心（按日/周期汇总）→</router-link>
    </p>
    <div class="toolbar card">
      <label>结算状态</label>
      <select v-model="settleStatus" class="input" style="max-width: 160px">
        <option value="">全部</option>
        <option value="not_required">无需</option>
        <option value="pending">待结算</option>
        <option value="paid">已结算</option>
      </select>
      <button type="button" class="btn btn-primary" @click="settlePage = 1; loadSettlements()">查询</button>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>订单号</th>
            <th>司机手机号</th>
            <th>订单金额</th>
            <th>司机应得</th>
            <th>平台毛利</th>
            <th>结算状态</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in settlements" :key="s._id">
            <td>{{ s.orderNo }}</td>
            <td>{{ s.driverPhone || '—' }}</td>
            <td>{{ money(s.orderAmount) }}</td>
            <td>{{ money(s.driverDue) }}</td>
            <td>{{ money(s.platformProfit) }}</td>
            <td><span class="pill" :class="settleClass(s.settlementStatus)">{{ settleLabel(s.settlementStatus) }}</span></td>
            <td>
              <router-link :to="{ name: 'order-detail', params: { id: s.orderId } }">订单</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pager muted">
      共 {{ settleTotal }} 条
      <button type="button" class="btn mini" :disabled="settlePage <= 1" @click="settlePage--; loadSettlements()">
        上一页
      </button>
      <button
        type="button"
        class="btn mini"
        :disabled="settlePage * settlePageSize >= settleTotal"
        @click="settlePage++; loadSettlements()"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  fetchFinanceSummary,
  fetchFinanceTransactions,
  fetchDriverSettlements,
  fetchFinanceReconciliation
} from '@/api/admin'
import { SETTLEMENT_LABELS } from '@/utils/p0Labels'

const summary = reactive({})
const err = ref('')

const transactions = ref([])
const txTotal = ref(0)
const txPage = ref(1)
const txPageSize = 20
const txType = ref('')
const txStatus = ref('')

const settlements = ref([])
const settleTotal = ref(0)
const settlePage = ref(1)
const settlePageSize = 20
const settleStatus = ref('')

const reconRows = ref([])
const reconTotal = ref(0)
const reconPage = ref(1)
const reconPageSize = 20
const reconStatus = ref('')

function money(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : '£0.00'
}

function fmtTime(v) {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

function typeLabel(t) {
  return t === 'balance' ? '尾款' : '定金'
}

function payStatusLabel(s) {
  const map = { unpaid: '未付', pending: '待确认', confirmed: '已确认' }
  return map[s] || s || '—'
}

function statusClass(s) {
  if (s === 'confirmed') return 'pill-ok'
  if (s === 'pending') return 'pill-pending'
  return ''
}

function settleLabel(s) {
  const map = { not_required: '无需', pending: '待结算', paid: '已结算' }
  return map[s] || s || '—'
}

function settleClass(s) {
  if (s === 'paid') return 'pill-ok'
  if (s === 'pending') return 'pill-pending'
  return ''
}

function settlementLabel(s) {
  return SETTLEMENT_LABELS[s] || s || '—'
}

async function loadReconciliation() {
  const data = await fetchFinanceReconciliation({
    page: reconPage.value,
    pageSize: reconPageSize,
    settlementStatus: reconStatus.value || undefined
  })
  reconRows.value = data?.rows || []
  reconTotal.value = data?.total ?? 0
}

async function loadSummary() {
  const data = await fetchFinanceSummary()
  Object.assign(summary, data || {})
}

async function loadTransactions() {
  const data = await fetchFinanceTransactions({
    page: txPage.value,
    pageSize: txPageSize,
    type: txType.value || undefined,
    status: txStatus.value || undefined
  })
  transactions.value = data?.transactions || []
  txTotal.value = data?.total ?? 0
}

async function loadSettlements() {
  const data = await fetchDriverSettlements({
    page: settlePage.value,
    pageSize: settlePageSize,
    status: settleStatus.value || undefined
  })
  settlements.value = data?.settlements || []
  settleTotal.value = data?.total ?? 0
}

onMounted(async () => {
  err.value = ''
  try {
    await Promise.all([
      loadSummary(),
      loadTransactions(),
      loadSettlements(),
      loadReconciliation()
    ])
  } catch (e) {
    err.value = e.message || '加载失败'
  }
})
</script>

<style scoped>
h2 {
  margin: 0 0 8px;
}
h3 {
  margin: 28px 0 12px;
  font-size: 16px;
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
}
.stat .num {
  font-size: 24px;
  font-weight: 700;
  margin-top: 8px;
}
.stat .num.warn {
  color: #b45309;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.toolbar label {
  font-size: 13px;
  color: var(--muted);
}
.err {
  color: var(--danger);
}
.pager {
  margin: 12px 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn.mini {
  padding: 4px 8px;
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
  background: #ecfdf5;
  color: #047857;
}
.pill-pending {
  background: #fffbeb;
  color: #b45309;
}
</style>
