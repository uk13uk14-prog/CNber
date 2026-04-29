<template>
  <div>
    <h2>订单列表</h2>
    <div class="toolbar card">
      <label>状态</label>
      <select v-model="filters.status" class="input" style="max-width: 160px">
        <option value="">全部</option>
        <option value="pending">待接单</option>
        <option value="assigned">已指派</option>
        <option value="accepted">已接单</option>
        <option value="started">行程中</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <label>客户手机</label>
      <input v-model="filters.customerPhone" class="input" placeholder="模糊" />
      <label>时间范围</label>
      <select v-model="filters.range" class="input" style="max-width: 160px">
        <option value="3d">最近 3 天</option>
        <option value="7d">最近 7 天</option>
        <option value="14d">最近 14 天</option>
        <option value="all">全部订单</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
    </div>
    <p v-if="success" class="toast">{{ success }}</p>
    <p v-if="error" class="muted">{{ error }}</p>
    <div v-for="group in groupedOrders" :key="group.key" class="order-group">
      <div class="group-title">
        {{ group.title }} 共 {{ group.orders.length }} 单
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>订单</th>
              <th>客户</th>
              <th>起点</th>
              <th>终点</th>
              <th>状态</th>
              <th>调度状态</th>
              <th>金额</th>
              <th>报价</th>
              <th>报价来源</th>
              <th>支付</th>
              <th>已派司机</th>
              <th>推荐司机</th>
              <th>选择司机</th>
              <th>创建时间</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in group.orders" :key="o._id">
              <td>
                <div class="order-no">{{ orderDisplayNo(o) }}</div>
                <div class="order-id">ID: {{ shortId(o._id) }}</div>
              </td>
              <td>{{ phoneOf(o.userId) }}</td>
              <td class="ellipsis">{{ o.pickup || '—' }}</td>
              <td class="ellipsis">{{ o.destination || '—' }}</td>
              <td>
                <span class="status-pill" :class="statusClass(o.status)">
                  {{ orderStatusLabel(o.status) }}
                </span>
              </td>
              <td>
                <span class="status-pill" :class="dispatchStatusClass(o.dispatchStatus)">
                  {{ dispatchStatusLabel(o.dispatchStatus) }}
                </span>
              </td>
              <td>{{ amountLabel(o.amount) }}</td>
              <td>
                <span class="status-pill" :class="statusClass(o.priceStatus || 'pending')">
                  {{ priceStatusLabel(o.priceStatus) }}
                </span>
              </td>
              <td>
                <div>{{ quoteSourceLabel(o.quoteSource) }}</div>
                <div v-if="isAutoQuoted(o)" class="auto-quote-line">
                  {{ autoQuoteLine(o) }}
                </div>
                <div v-if="o.quoteBreakdown && o.quoteBreakdown.total != null" class="recommend-meta">
                  规则总价 {{ amountLabel(o.quoteBreakdown.total) }}
                </div>
              </td>
              <td>
                <span class="status-pill" :class="statusClass(o.paymentStatus || 'unpaid')">
                  {{ paymentStatusLabel(o.paymentStatus) }}
                </span>
              </td>
              <td>{{ assignedDriverLine(o) }}</td>
              <td>
                <div class="recommend-line">{{ recommendedDriverLabel(o) }}</div>
                <div v-if="getRecommendedDriver(o)" class="recommend-meta">
                  模拟 {{ simulatedDistance(o, getRecommendedDriver(o)) }} km ·
                  近单 {{ driverRecentOrderCount(getRecommendedDriver(o)) }}
                </div>
              </td>
              <td>
                <select
                  v-model="selectedDriverIds[o._id]"
                  class="input driver-select"
                  :disabled="o.paymentStatus !== 'paid' || o.status !== 'pending'"
                >
                  <option value="">请选择司机</option>
                  <option
                    v-for="driver in recommendedDriversForOrder(o)"
                    :key="driverOptionValue(driver)"
                    :value="driverOptionValue(driver)"
                  >
                    {{ driverOptionLabel(driver) }}
                  </option>
                </select>
                <div v-if="o.paymentStatus !== 'paid'" class="dispatch-hint">未支付不可派单</div>
              </td>
              <td>{{ fmt(o.createdAt) }}</td>
              <td>
                <button
                  v-if="canEditQuote(o)"
                  type="button"
                  class="btn small"
                  :disabled="quotingId === o._id"
                  @click="onQuote(o)"
                >
                  人工报价
                </button>
                <button
                  v-if="canEditQuote(o)"
                  type="button"
                  class="btn small"
                  :disabled="quotingId === o._id"
                  @click="onAutoQuote(o)"
                >
                  重新报价
                </button>
                <button
                  type="button"
                  class="btn btn-primary small"
                  :disabled="!canOpenDispatch(o)"
                  @click="openDispatchModal(o)"
                >
                  派单
                </button>
                <button
                  type="button"
                  class="btn small"
                  :disabled="!canUnassign(o)"
                  @click="onUnassign(o)"
                >
                  取消派单
                </button>
                <button
                  type="button"
                  class="btn one-click small"
                  :disabled="!canOneClickAssign(o)"
                  @click="onOneClickAssign(o)"
                >
                  一键派单
                </button>
                <router-link :to="`/orders/${o._id}`">详情</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="pager">
      <button type="button" class="btn" :disabled="page <= 1" @click="page--; load()">
        上一页
      </button>
      <span class="muted">第 {{ page }} 页 · 共 {{ total }} 条</span>
      <button
        type="button"
        class="btn"
        :disabled="page * pageSize >= total"
        @click="page++; load()"
      >
        下一页
      </button>
    </div>

    <div v-if="dispatchModalVisible" class="modal-mask">
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <h3>选择在线司机</h3>
            <p class="muted">订单：{{ orderDisplayNo(dispatchOrder || {}) }}</p>
          </div>
          <button type="button" class="btn small" @click="closeDispatchModal">关闭</button>
        </div>

        <p v-if="availableDriversLoading" class="muted">正在加载在线司机...</p>
        <p v-else-if="availableDrivers.length === 0" class="muted">
          当前暂无在线司机，请联系司机上线
        </p>

        <div v-else class="driver-list">
          <div v-for="driver in availableDrivers" :key="driver._id" class="driver-row">
            <div>
              <div class="driver-main">
                {{ driver.name || driver.phone || '未填写姓名' }}
                <span class="muted">/ {{ driver.phone || '无手机号' }}</span>
              </div>
              <div class="driver-meta">
                在线 · {{ vehicleLine(driver.vehicle) }} · 今日 {{ driver.todayOrdersCount || 0 }} 单 ·
                进行中 {{ driver.ongoingOrdersCount || 0 }} 单 ·
                {{ reviewStatusLabel(driver.reviewStatus) }}
              </div>
            </div>
            <button
              type="button"
              class="btn btn-primary small"
              :disabled="assigningId === dispatchOrder?._id"
              @click="assignFromModal(driver)"
            >
              选择派单
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  assignDriver,
  autoQuoteOrder,
  fetchAvailableDrivers,
  fetchDrivers,
  fetchOrders,
  quoteOrder,
  unassignDriver
} from '@/api/admin'
import { orderStatusLabel } from '@/utils/orderStatus'

const orders = ref([])
const drivers = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const error = ref('')
const success = ref('')
const quotingId = ref('')
const assigningId = ref('')
const selectedDriverIds = reactive({})
const dispatchModalVisible = ref(false)
const dispatchOrder = ref(null)
const availableDrivers = ref([])
const availableDriversLoading = ref(false)
const filters = reactive({
  status: '',
  customerPhone: '',
  range: '7d'
})

const groupedOrders = computed(() => {
  const groups = []
  const byKey = new Map()
  for (const order of orders.value) {
    const key = dateGroupKey(order.createdAt)
    if (!byKey.has(key)) {
      const group = { key, title: dateGroupTitle(order.createdAt), orders: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    byKey.get(key).orders.push(order)
  }
  return groups
})

function shortId(id) {
  if (!id) return ''
  const s = String(id)
  return s.slice(-8)
}

function orderDisplayNo(order) {
  if (order.orderNo) return order.orderNo
  return `旧单-${shortId(order._id)}`
}

function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
}

function idOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref._id) return String(ref._id)
  return String(ref)
}

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function dateGroupKey(iso) {
  const d = iso ? new Date(iso) : new Date(0)
  if (isNaN(d.getTime())) return 'unknown'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function dateGroupTitle(iso) {
  const key = dateGroupKey(iso)
  if (key === 'unknown') return '未知日期'
  return key === dateGroupKey(new Date()) ? `${key}（今日）` : key
}

function amountLabel(amount) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : String(amount)
}

function priceStatusLabel(status) {
  const map = {
    pending: '待报价',
    quoted: '已报价',
    confirmed: '已确认'
  }
  return map[status || 'pending'] || status
}

function paymentStatusLabel(status) {
  const map = {
    unpaid: '未支付',
    pending: '待支付',
    paid: '已支付',
    refunded: '已退款'
  }
  return map[status || 'unpaid'] || status
}

function quoteSourceLabel(source) {
  const map = {
    manual: '人工报价',
    rule: '规则报价',
    matrix: '价格表报价'
  }
  return map[source || 'manual'] || source
}

function isAutoQuoted(order) {
  return ['matrix', 'rule'].includes(order.quoteSource) && order.amount != null && order.amount !== ''
}

function autoQuoteLine(order) {
  if (order.quoteSource === 'matrix') return '已自动报价（价格表）'
  if (order.quoteSource === 'rule') return '已自动报价（规则）'
  return ''
}

function statusClass(status) {
  const map = {
    pending: 'status-gray',
    quoted: 'status-blue',
    confirmed: 'status-purple',
    paid: 'status-green',
    assigned: 'status-orange',
    started: 'status-deep-blue',
    completed: 'status-deep-green'
  }
  return map[status] || 'status-gray'
}

function dispatchStatusLabel(status) {
  const map = {
    unassigned: '未派单',
    assigned: '已派单',
    accepted: '司机已接',
    rejected: '司机拒绝',
    completed: '已完成'
  }
  return map[status || 'unassigned'] || status
}

function dispatchStatusClass(status) {
  const map = {
    unassigned: 'status-gray',
    assigned: 'status-orange',
    accepted: 'status-blue',
    rejected: 'status-purple',
    completed: 'status-deep-green'
  }
  return map[status || 'unassigned'] || 'status-gray'
}

function assignedDriverLine(order) {
  if (order.assignedDriverName || order.assignedDriverPhone) {
    return `${order.assignedDriverName || '司机'} ${order.assignedDriverPhone || ''}`.trim()
  }
  const driverId = order.assignedDriver || order.driverId
  const phone = phoneOf(driverId)
  if (phone) return `已派：${phone}`
  return driverId ? `已派：${idOf(driverId)}` : '未派'
}

function driverOptionValue(driver) {
  return idOf(driver.userId || driver._id)
}

function driverOptionLabel(driver) {
  const user = driver.userId
  const phone = driver.phone || phoneOf(user)
  const name = driver.name ? `${driver.name} · ` : ''
  const id = driverOptionValue(driver)
  const suffix = driver.status ? ` · ${driver.status}` : ''
  return `${name}${phone || id}${suffix}`
}

function activeDriverIds() {
  const ids = new Set()
  for (const order of orders.value) {
    if (!['assigned', 'accepted', 'started'].includes(order.status)) continue
    const id = idOf(order.driverId)
    if (id) ids.add(id)
  }
  return ids
}

function isDriverAvailable(driver) {
  const status = driver.status || ''
  // 兼容当前后端 Driver.status=approved 的历史数据；有 available 时优先按 available 使用。
  return status === 'available' || status === 'approved'
}

function driverRecentOrderCount(driver) {
  const n = Number(driver.recentOrderCount ?? driver.totalOrders ?? 0)
  return Number.isFinite(n) ? n : 0
}

function hashText(text) {
  return String(text || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

function simulatedDistance(order, driver) {
  const seed = `${order.pickup || ''}:${order.destination || ''}:${driverOptionValue(driver)}`
  return ((hashText(seed) % 120) / 10 + 0.5).toFixed(1)
}

function recommendedDriversForOrder(order) {
  const busyIds = activeDriverIds()
  return drivers.value
    .filter((driver) => isDriverAvailable(driver))
    .filter((driver) => !busyIds.has(driverOptionValue(driver)) || driverOptionValue(driver) === idOf(order.driverId))
    .slice()
    .sort((a, b) => {
      const recentDiff = driverRecentOrderCount(a) - driverRecentOrderCount(b)
      if (recentDiff !== 0) return recentDiff
      return Number(simulatedDistance(order, a)) - Number(simulatedDistance(order, b))
    })
}

function getRecommendedDriver(order) {
  return recommendedDriversForOrder(order)[0] || null
}

function recommendedDriverLabel(order) {
  const driver = getRecommendedDriver(order)
  if (!driver) return '暂无可用司机'
  return driverOptionLabel(driver)
}

function applyRecommendedDrivers() {
  for (const order of orders.value) {
    const existingDriverId = idOf(order.driverId)
    if (existingDriverId) {
      selectedDriverIds[order._id] = existingDriverId
      continue
    }
    if (selectedDriverIds[order._id]) continue
    const driver = getRecommendedDriver(order)
    if (driver) selectedDriverIds[order._id] = driverOptionValue(driver)
  }
}

function canEditQuote(order) {
  return (
    order.status === 'pending' &&
    (order.priceStatus || 'pending') !== 'confirmed' &&
    (order.paymentStatus || 'unpaid') === 'unpaid'
  )
}

function canAssign(order) {
  return (
    order.paymentStatus === 'paid' &&
    order.status === 'pending' &&
    !!selectedDriverIds[order._id] &&
    assigningId.value !== order._id
  )
}

function canOpenDispatch(order) {
  return (
    ['pending', 'assigned'].includes(order.status) &&
    assigningId.value !== order._id
  )
}

function canUnassign(order) {
  return (
    !!(order.assignedDriver || order.driverId) &&
    ['assigned', 'unassigned'].includes(order.dispatchStatus || 'unassigned') &&
    !['accepted', 'started', 'completed', 'cancelled'].includes(order.status) &&
    assigningId.value !== order._id
  )
}

function canOneClickAssign(order) {
  return (
    order.paymentStatus === 'paid' &&
    order.status === 'pending' &&
    !!getRecommendedDriver(order) &&
    assigningId.value !== order._id
  )
}

async function onQuote(order) {
  const input = window.prompt('请输入报价金额（GBP）', order.amount || '')
  if (input == null) return
  const amount = Number(input)
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = '报价金额必须大于 0'
    return
  }

  quotingId.value = order._id
  error.value = ''
  try {
    await quoteOrder(order._id, amount)
    await load()
  } catch (e) {
    error.value = e.message || '报价失败'
  } finally {
    quotingId.value = ''
  }
}

async function onAutoQuote(order) {
  quotingId.value = order._id
  error.value = ''
  success.value = ''
  try {
    await autoQuoteOrder(order._id)
    success.value = '报价已重算'
    await load()
  } catch (e) {
    error.value = e.message || '重新报价失败'
  } finally {
    quotingId.value = ''
  }
}

async function onAssign(order) {
  if (order.paymentStatus !== 'paid') {
    error.value = '未支付不可派单'
    return
  }

  const driverId = selectedDriverIds[order._id]
  if (!driverId) {
    error.value = '请选择司机'
    return
  }

  assigningId.value = order._id
  error.value = ''
  success.value = ''
  try {
    await assignDriver(order._id, driverId)
    success.value = '派单成功'
    await load()
  } catch (e) {
    error.value = e.message || '派单失败'
  } finally {
    assigningId.value = ''
  }
}

function closeDispatchModal() {
  dispatchModalVisible.value = false
  dispatchOrder.value = null
}

async function openDispatchModal(order) {
  dispatchOrder.value = order
  dispatchModalVisible.value = true
  availableDriversLoading.value = true
  error.value = ''
  success.value = ''
  try {
    const data = await fetchAvailableDrivers()
    availableDrivers.value = Array.isArray(data) ? data : data.drivers || []
  } catch (e) {
    error.value = e.message || '加载在线司机失败'
    availableDrivers.value = []
  } finally {
    availableDriversLoading.value = false
  }
}

async function assignFromModal(driver) {
  const order = dispatchOrder.value
  if (!order || !driver?._id) return
  assigningId.value = order._id
  error.value = ''
  success.value = ''
  try {
    await assignDriver(order._id, driver._id)
    success.value = '派单成功'
    closeDispatchModal()
    await Promise.all([loadDrivers(), load()])
  } catch (e) {
    error.value = e.message || '派单失败'
  } finally {
    assigningId.value = ''
  }
}

async function onUnassign(order) {
  assigningId.value = order._id
  error.value = ''
  success.value = ''
  try {
    await unassignDriver(order._id)
    success.value = '已取消派单'
    await Promise.all([loadDrivers(), load()])
  } catch (e) {
    error.value = e.message || '取消派单失败'
  } finally {
    assigningId.value = ''
  }
}

function vehicleLine(vehicle = {}) {
  const parts = [vehicle.model, vehicle.plateNo, vehicle.seats ? `${vehicle.seats} 座` : ''].filter(Boolean)
  return parts.length ? parts.join(' · ') : '车辆信息未完善'
}

function reviewStatusLabel(status) {
  const map = {
    pending: '资质未审核',
    approved: '资质已通过',
    rejected: '资质未通过'
  }
  return map[status || 'pending'] || status
}

async function onOneClickAssign(order) {
  const driver = getRecommendedDriver(order)
  if (!driver) {
    error.value = '暂无可用推荐司机'
    return
  }
  selectedDriverIds[order._id] = driverOptionValue(driver)
  await onAssign(order)
}

async function loadDrivers() {
  try {
    let data = await fetchAvailableDrivers()
    let rows = Array.isArray(data) ? data : data.drivers || []
    if (!rows.length) {
      data = await fetchDrivers({ page: 1, pageSize: 100, status: 'approved' })
      rows = data.drivers || []
    }
    drivers.value = rows
    applyRecommendedDrivers()
  } catch (e) {
    error.value = e.message || '加载司机失败'
    drivers.value = []
  }
}

async function load() {
  error.value = ''
  try {
    const data = await fetchOrders({
      page: page.value,
      pageSize: pageSize.value,
      status: filters.status || undefined,
      customerPhone: filters.customerPhone || undefined,
      range: filters.range
    })
    orders.value = data.orders || []
    total.value = data.total ?? 0
    applyRecommendedDrivers()
  } catch (e) {
    error.value = e.message || '加载失败'
    orders.value = []
  }
}

onMounted(async () => {
  await Promise.all([loadDrivers(), load()])
})
</script>

<style scoped>
h2 {
  margin: 0 0 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.toolbar label {
  font-size: 13px;
  color: var(--muted);
}
.ellipsis {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.order-group {
  margin-bottom: 24px;
}
.group-title {
  margin: 12px 0 8px;
  font-weight: 700;
  color: #111827;
}
.order-no {
  font-weight: 700;
  white-space: nowrap;
}
.order-id {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.pager {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}
.small {
  margin-right: 8px;
  padding: 4px 10px;
  font-size: 12px;
}
.one-click {
  background: #16a34a;
  color: #fff;
  border-color: #16a34a;
}
.one-click:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.driver-select {
  min-width: 150px;
  max-width: 180px;
  padding: 6px 8px;
}
.recommend-line {
  font-weight: 600;
  white-space: nowrap;
}
.recommend-meta {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.auto-quote-line {
  margin-top: 4px;
  color: #15803d;
  font-size: 12px;
  white-space: nowrap;
}
.dispatch-hint {
  margin-top: 4px;
  color: var(--danger);
  font-size: 12px;
}
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}
.modal-card {
  width: min(760px, 100%);
  max-height: 80vh;
  overflow: auto;
  border-radius: 16px;
  background: #fff;
  padding: 20px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
}
.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.modal-head h3 {
  margin: 0 0 4px;
}
.driver-list {
  display: grid;
  gap: 12px;
}
.driver-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.driver-main {
  font-weight: 700;
}
.driver-meta {
  margin-top: 6px;
  color: var(--muted);
  font-size: 12px;
}
.toast {
  display: inline-block;
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: #dcfce7;
  color: #166534;
  font-size: 13px;
}
.status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}
.status-gray {
  background: #f3f4f6;
  color: #4b5563;
}
.status-blue {
  background: #dbeafe;
  color: #1d4ed8;
}
.status-purple {
  background: #ede9fe;
  color: #6d28d9;
}
.status-green {
  background: #dcfce7;
  color: #15803d;
}
.status-orange {
  background: #ffedd5;
  color: #c2410c;
}
.status-deep-blue {
  background: #dbeafe;
  color: #1e3a8a;
}
.status-deep-green {
  background: #bbf7d0;
  color: #166534;
}
</style>
