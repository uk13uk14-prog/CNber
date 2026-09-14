<template>
  <div class="dispatch-center">
    <div class="head">
      <div>
        <h2>调度中心</h2>
        <p class="muted">集中处理每日订单，无需在列表中逐条筛选状态。</p>
      </div>
      <button type="button" class="btn" :disabled="loading" @click="reload">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </div>

    <p v-if="toast" class="toast">{{ toast }}</p>
    <p v-if="error" class="err">{{ error }}</p>

    <div class="tabs card">
      <button
        v-for="tab in DISPATCH_CENTER_TABS"
        :key="tab.id"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span class="count">{{ tabCounts[tab.id] || 0 }}</span>
      </button>
    </div>

    <p v-if="loading" class="muted panel">加载订单中…</p>
    <p v-else-if="!visibleOrders.length" class="empty card">当前 Tab 暂无订单</p>

    <div v-else class="cards">
      <article v-for="order in visibleOrders" :key="order._id" class="order-card card">
        <header class="card-head">
          <div class="order-no">{{ orderDisplayNo(order) }}</div>
          <span class="pill" :class="adminBookingStatusClass(order)">
            {{ adminBookingStatusLabel(order) }}
          </span>
        </header>

        <dl class="meta">
          <div class="row">
            <dt>客户</dt>
            <dd>{{ phoneOf(order.userId) }}</dd>
          </div>
          <div class="row">
            <dt>服务</dt>
            <dd>
              {{ serviceTypeLabel(order.serviceType) }}
              <span v-if="order.vehicleLabel" class="sub"> · {{ order.vehicleLabel }}</span>
            </dd>
          </div>
          <div class="row route">
            <dt>路线</dt>
            <dd>{{ order.pickup || '—' }} → {{ order.destination || '—' }}</dd>
          </div>
          <div class="row">
            <dt>预约</dt>
            <dd>{{ adminScheduledTimeLabel(order) }}</dd>
          </div>
          <div class="row prices">
            <dt>价格</dt>
            <dd>
              客户 {{ customerPriceCell(order).main }}
              <span v-if="customerPriceCell(order).sub" class="sub">{{ customerPriceCell(order).sub }}</span>
              · 司机 {{ driverPriceCell(order).main }}
            </dd>
          </div>
          <div v-if="showDriverRow(order)" class="row">
            <dt>司机</dt>
            <dd>{{ driverInfoLine(order) }}</dd>
          </div>
        </dl>

        <footer class="card-actions">
          <template v-if="activeTab === 'await_payment'">
            <span class="ops-hint">等待客户付款</span>
          </template>

          <template v-else-if="activeTab === 'payment_review'">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="actingId === order._id"
              @click="onConfirmDeposit(order)"
            >
              {{ actingId === order._id ? '确认中…' : '确认付款' }}
            </button>
          </template>

          <template v-else-if="activeTab === 'ready_dispatch' || activeTab === 'needs_redispatch'">
            <select v-model="selectedDriverIds[order._id]" class="input driver-select">
              <option value="">请选择司机</option>
              <option
                v-for="driver in selectableDriversForOrder(order, drivers, orders)"
                :key="driverOptionValue(driver)"
                :value="driverOptionValue(driver)"
              >
                {{ driverOptionLabel(driver) }}
              </option>
            </select>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!selectedDriverIds[order._id] || actingId === order._id"
              @click="onAssign(order)"
            >
              {{ actingId === order._id ? '派单中…' : '确认派单' }}
            </button>
          </template>

          <template v-else-if="activeTab === 'assigned'">
            <button
              type="button"
              class="btn"
              :disabled="!canUnassignOrder(order, actingId === order._id) || actingId === order._id"
              @click="onUnassign(order)"
            >
              {{ actingId === order._id ? '处理中…' : '取消派单' }}
            </button>
          </template>

          <template v-else-if="activeTab === 'in_trip'">
            <router-link :to="`/orders/${order._id}`" class="btn btn-primary link-btn">
              查看详情
            </router-link>
          </template>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  assignDriver,
  confirmOrderDeposit,
  fetchAvailableDrivers,
  fetchDrivers,
  fetchDriversForDispatch,
  fetchOrders,
  unassignDriver
} from '@/api/admin'
import {
  DISPATCH_CENTER_TABS,
  adminBookingStatusClass,
  adminBookingStatusLabel,
  adminScheduledTimeLabel,
  dispatchCenterTab,
  driverInfoLine,
  filterOrdersByDispatchTab,
  orderDisplayNo,
  phoneOf
} from '@/utils/bookingStatus'
import { depositConfirmedForDispatch } from '@/utils/depositDispatch'
import { serviceTypeLabel } from '@/utils/serviceType'
import { customerPriceCell, driverPriceCell } from '@/utils/currencyDisplay'
import {
  canUnassignOrder,
  driverOptionLabel,
  driverOptionValue,
  extractDriverRows,
  idOf,
  normalizeDriverList,
  selectableDriversForOrder
} from '@/utils/dispatchDrivers'

const activeTab = ref('await_payment')
const orders = ref([])
const drivers = ref([])
const loading = ref(false)
const actingId = ref('')
const error = ref('')
const toast = ref('')
const selectedDriverIds = reactive({})

const tabCounts = computed(() => {
  const counts = {}
  for (const tab of DISPATCH_CENTER_TABS) {
    counts[tab.id] = filterOrdersByDispatchTab(orders.value, tab.id).length
  }
  return counts
})

const visibleOrders = computed(() => filterOrdersByDispatchTab(orders.value, activeTab.value))

function showDriverRow(order) {
  return ['assigned', 'in_trip'].includes(dispatchCenterTab(order))
}

async function loadAllOrders() {
  const collected = []
  let page = 1
  const pageSize = 100
  let total = Infinity
  while (collected.length < total && page <= 30) {
    const data = await fetchOrders({ page, pageSize, range: '14d' })
    const batch = data?.orders || []
    total = data?.total ?? batch.length
    collected.push(...batch)
    if (batch.length < pageSize) break
    page += 1
  }
  orders.value = collected.filter((o) => dispatchCenterTab(o))
  applyDefaultDriverSelection()
}

async function loadDrivers() {
  const [available, forDispatch, approved] = await Promise.all([
    fetchAvailableDrivers().catch(() => ({})),
    fetchDriversForDispatch().catch(() => ({})),
    fetchDrivers({ page: 1, pageSize: 100, status: 'approved' }).catch(() => ({}))
  ])
  const merged = new Map()
  for (const row of [
    ...normalizeDriverList(extractDriverRows(available)),
    ...normalizeDriverList(extractDriverRows(forDispatch)),
    ...normalizeDriverList(extractDriverRows(approved))
  ]) {
    const id = driverOptionValue(row)
    if (!id) continue
    const prev = merged.get(id)
    merged.set(id, prev ? { ...prev, ...row } : row)
  }
  drivers.value = Array.from(merged.values())
  applyDefaultDriverSelection()
}

function applyDefaultDriverSelection() {
  for (const order of orders.value) {
    if (dispatchCenterTab(order) !== 'ready_dispatch' && dispatchCenterTab(order) !== 'needs_redispatch') continue
    const existing = idOf(order.driverId) || idOf(order.assignedDriver)
    selectedDriverIds[order._id] = existing || ''
  }
}

async function reload() {
  loading.value = true
  error.value = ''
  toast.value = ''
  try {
    await Promise.all([loadAllOrders(), loadDrivers()])
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onConfirmDeposit(order) {
  actingId.value = order._id
  error.value = ''
  toast.value = ''
  try {
    await confirmOrderDeposit(order._id)
    toast.value = '付款已确认'
    await reload()
  } catch (e) {
    error.value = e.message || '确认失败'
  } finally {
    actingId.value = ''
  }
}

async function onAssign(order) {
  if (!depositConfirmedForDispatch(order)) {
    error.value = '定金未确认，不能派单'
    return
  }
  const driverId = selectedDriverIds[order._id]
  if (!driverId) {
    error.value = '请选择司机'
    return
  }
  actingId.value = order._id
  error.value = ''
  toast.value = ''
  try {
    await assignDriver(order._id, driverId)
    toast.value = '派单成功'
    await reload()
  } catch (e) {
    error.value = e.message || '派单失败'
  } finally {
    actingId.value = ''
  }
}

async function onUnassign(order) {
  actingId.value = order._id
  error.value = ''
  toast.value = ''
  try {
    await unassignDriver(order._id)
    toast.value = '已取消派单'
    await reload()
  } catch (e) {
    error.value = e.message || '取消派单失败'
  } finally {
    actingId.value = ''
  }
}

onMounted(reload)
</script>

<style scoped>
.dispatch-center {
  max-width: 1200px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.head h2 {
  margin: 0 0 6px;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  margin-bottom: 16px;
}
.tab-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
}
.tab-btn:hover {
  background: #f9fafb;
}
.tab-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.count {
  display: inline-block;
  margin-left: 6px;
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 12px;
}
.tab-btn.active .count {
  background: rgba(255, 255, 255, 0.25);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.order-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.order-no {
  font-weight: 700;
  font-size: 15px;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #e5e7eb;
}
.status-orange {
  background: #ffedd5;
  color: #9a3412;
}
.status-blue {
  background: #dbeafe;
  color: #1e40af;
}
.status-green {
  background: #d1fae5;
  color: #065f46;
}
.status-purple {
  background: #ede9fe;
  color: #5b21b6;
}
.meta {
  margin: 0;
}
.row {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}
.row dt {
  margin: 0;
  color: #9ca3af;
}
.row dd {
  margin: 0;
  color: #374151;
  word-break: break-word;
}
.route dd {
  line-height: 1.4;
}
.sub {
  color: #9ca3af;
  font-size: 12px;
}
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}
.driver-select {
  flex: 1;
  min-width: 160px;
}
.ops-hint {
  color: #9ca3af;
  font-size: 13px;
}
.link-btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.empty,
.panel {
  padding: 24px;
  text-align: center;
}
</style>
