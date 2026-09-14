<template>
  <div>
    <h2>订单列表</h2>
    <div class="toolbar card">
      <label>快捷筛选</label>
      <select v-model="filters.quick" class="input" style="max-width: 160px">
        <option value="">全部</option>
        <option value="pending_confirm">待确认</option>
        <option value="pending_deposit">待付订金</option>
        <option value="pending_dispatch">待派单</option>
        <option value="needs_redispatch">待重新派单</option>
        <option value="driver_response">待司机响应</option>
        <option value="today">今日接送</option>
        <option value="exception">异常订单</option>
      </select>
      <label>状态</label>
      <select v-model="filters.status" class="input" style="max-width: 160px">
        <option value="">全部</option>
        <option value="created">下单完成</option>
        <option value="quoted">已自动报价</option>
        <option value="confirmed">客户确认报价</option>
        <option value="deposit_paid">已付订金</option>
        <option value="needs_redispatch">待重新派单</option>
        <option value="assigned">已指派</option>
        <option value="driver_accepted">司机已接单</option>
        <option value="ready_to_start">待出发</option>
        <option value="in_progress">行程中</option>
        <option value="arrived">已到达</option>
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
      <label class="show-deleted">
        <input v-model="filters.showDeleted" type="checkbox" @change="page = 1; load()" />
        显示已删除订单
      </label>
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
              <th>订单号</th>
              <th>客户手机</th>
              <th>服务类型</th>
              <th>起点</th>
              <th>终点</th>
              <th>预约时间</th>
              <th>主状态</th>
              <th>付款状态</th>
              <th>客户价</th>
              <th>司机价</th>
              <th>平台利润</th>
              <th>司机信息</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in group.orders" :key="o._id" :class="{ 'row-deleted': o.isDeleted }">
              <td>
                <div class="order-no">{{ orderDisplayNo(o) }}</div>
                <span v-if="o.isDeleted" class="deleted-tag">已删除</span>
              </td>
              <td>{{ phoneOf(o.userId) }}</td>
              <td>
                <div>{{ serviceTypeLabel(o.serviceType) }}</div>
                <div v-if="o.vehicleLabel" class="price-sub">{{ o.vehicleLabel }}</div>
              </td>
              <td class="ellipsis">{{ o.pickup || '—' }}</td>
              <td class="ellipsis">{{ o.destination || '—' }}</td>
              <td class="nowrap">{{ adminScheduledTimeLabel(o) }}</td>
              <td>
                <span class="status-pill" :class="adminBookingStatusClass(o)">
                  {{ adminBookingStatusLabel(o) }}
                </span>
              </td>
              <td>
                <span class="status-pill" :class="paymentStatusPillClass(o)">
                  {{ adminPaymentStatusLabel(o) }}
                </span>
              </td>
              <td>
                <div class="price-cell">
                  <div>{{ customerPriceCell(o).main }}</div>
                  <div v-if="customerPriceCell(o).sub" class="price-sub">{{ customerPriceCell(o).sub }}</div>
                </div>
              </td>
              <td>
                <div class="price-cell">
                  <div>{{ driverPriceCell(o).main }}</div>
                  <div v-if="driverPriceCell(o).sub" class="price-sub">{{ driverPriceCell(o).sub }}</div>
                </div>
              </td>
              <td>{{ platformProfitCell(o) }}</td>
              <td class="driver-info-cell">{{ driverInfoLine(o) }}</td>
              <td class="ops-cell">
                <template v-if="adminOrderUiStage(o) === 'await_payment'">
                  <span class="ops-hint">待客户付款</span>
                </template>
                <template v-else-if="adminOrderUiStage(o) === 'payment_review'">
                  <button
                    type="button"
                    class="btn btn-primary small"
                    :disabled="confirmingDepositId === o._id"
                    @click="onConfirmDeposit(o)"
                  >
                    {{ confirmingDepositId === o._id ? '确认中…' : '确认付款' }}
                  </button>
                </template>
                <template v-else-if="adminOrderUiStage(o) === 'ready_dispatch'">
                  <select
                    v-model="selectedDriverIds[o._id]"
                    class="input driver-select ops-select"
                  >
                    <option value="">请选择司机</option>
                    <option
                      v-for="driver in selectableDriversForOrder(o)"
                      :key="driverOptionValue(driver)"
                      :value="driverOptionValue(driver)"
                    >
                      {{ driverOptionLabel(driver) }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="btn btn-primary small"
                    :disabled="!canAssign(o)"
                    @click="onAssign(o)"
                  >
                    {{ assigningId === o._id ? '派单中…' : '确认派单' }}
                  </button>
                  <button
                    type="button"
                    class="btn small"
                    :disabled="!canOpenDispatch(o)"
                    @click="openDispatchModal(o)"
                  >
                    在线司机
                  </button>
                  <button
                    type="button"
                    class="btn one-click small"
                    :disabled="!canOneClickAssign(o)"
                    @click="onOneClickAssign(o)"
                  >
                    一键派单
                  </button>
                </template>
                <template v-else-if="adminOrderUiStage(o) === 'assigned'">
                  <button
                    type="button"
                    class="btn small"
                    :disabled="!canUnassign(o)"
                    @click="onUnassign(o)"
                  >
                    取消派单
                  </button>
                </template>
                <router-link :to="`/orders/${o._id}`" class="btn small link-btn">详情</router-link>
                <button
                  v-if="canAdminSoftDeleteOrder(o)"
                  type="button"
                  class="btn btn-danger small"
                  :disabled="deletingId === o._id"
                  @click="openDeleteModal(o)"
                >
                  删除
                </button>
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

    <div v-if="deleteModalVisible" class="modal-mask">
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <h3>删除订单</h3>
            <p class="muted">订单：{{ orderDisplayNo(deleteTarget || {}) }}</p>
          </div>
          <button type="button" class="btn small" @click="closeDeleteModal">关闭</button>
        </div>
        <p class="delete-warn">
          此操作不会物理删除数据，但会从默认订单列表隐藏。请输入管理员密码确认。
        </p>
        <label class="field-label">删除原因</label>
        <input
          v-model="deleteReason"
          class="input"
          type="text"
          placeholder="例如：测试订单清理"
        />
        <label class="field-label">管理员密码</label>
        <input
          v-model="deletePassword"
          class="input"
          type="password"
          placeholder="当前登录管理员密码"
          autocomplete="current-password"
        />
        <p v-if="deleteError" class="err">{{ deleteError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="closeDeleteModal">取消</button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="deleteSubmitting"
            @click="submitDelete"
          >
            {{ deleteSubmitting ? '删除中…' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  assignDriver,
  autoQuoteOrder,
  confirmOrderDeposit,
  fetchAvailableDrivers,
  fetchDrivers,
  fetchDriversForDispatch,
  fetchOrders,
  quoteOrder,
  softDeleteOrder,
  unassignDriver
} from '@/api/admin'
import { orderStatusLabel } from '@/utils/orderStatus'
import {
  adminBookingStatusLabel,
  adminBookingStatusClass,
  adminPaymentStatusLabel,
  adminOrderUiStage,
  adminScheduledTimeLabel,
  canAdminSoftDeleteOrder
} from '@/utils/bookingStatus'
import { depositConfirmedForDispatch } from '@/utils/depositDispatch'
import { serviceTypeLabel } from '@/utils/serviceType'
import {
  customerPriceCell,
  driverPriceCell,
  platformProfitCell
} from '@/utils/currencyDisplay'

const orders = ref([])
const drivers = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const error = ref('')
const success = ref('')
const quotingId = ref('')
const assigningId = ref('')
const confirmingDepositId = ref('')
const selectedDriverIds = reactive({})
const dispatchModalVisible = ref(false)
const dispatchOrder = ref(null)
const availableDrivers = ref([])
const availableDriversLoading = ref(false)
const route = useRoute()
const deleteModalVisible = ref(false)
const deleteTarget = ref(null)
const deletePassword = ref('')
const deleteReason = ref('')
const deleteError = ref('')
const deleteSubmitting = ref(false)
const deletingId = ref('')

const filters = reactive({
  quick: '',
  status: '',
  depositStatus: '',
  customerPhone: '',
  range: '7d',
  showDeleted: false
})

function applyRouteQuery() {
  const q = route.query
  if (q.quick != null && q.quick !== '') filters.quick = String(q.quick)
  if (q.status != null && q.status !== '') {
    const s = String(q.status)
    if (s === 'pending') {
      filters.quick = 'pending_confirm'
      filters.status = ''
    } else {
      filters.status = s
    }
  }
  if (q.depositStatus != null && q.depositStatus !== '') {
    filters.depositStatus = String(q.depositStatus)
  }
}

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
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : String(amount)
}

function totalPrice(order) {
  return order.priceBreakdown?.totalPrice ?? order.quoteBreakdown?.totalPrice ?? order.quoteBreakdown?.total ?? order.amount
}

function driverPayout(order) {
  return order.priceBreakdown?.driverPayout ?? (Number(totalPrice(order) || 0) * 0.75)
}

function platformProfit(order) {
  return order.priceBreakdown?.platformProfit ?? (Number(totalPrice(order) || 0) - Number(driverPayout(order) || 0))
}

function hasDeposit(order) {
  return depositConfirmedForDispatch(order)
}

function hasDepositPaymentInfo(order) {
  const info = order?.depositPaymentInfo
  if (!info || typeof info !== 'object') return false
  return Object.keys(info).length > 0
}

/** 订单列表内展示「确认定金」：与支付审核/详情页同一门禁，已确认则不显示 */
function canShowConfirmDeposit(order) {
  if (!order?._id || depositConfirmedForDispatch(order)) return false
  if (order.depositStatus === 'submitted') return true
  if (order.paymentStage === 'deposit_submitted') return true
  if (order.paymentStatus === 'pending' && hasDepositPaymentInfo(order)) return true
  return false
}

function paymentStageLabel(stage) {
  const map = {
    none: '—',
    deposit_pending: '待付定金',
    deposit_submitted: '定金待审',
    deposit_confirmed: '定金已确',
    balance_pending: '待付尾款',
    balance_submitted: '尾款待审',
    balance_confirmed: '尾款已确',
    completed: '支付结束'
  }
  return map[stage || 'none'] || stage || '—'
}

function depositStatusLabel(s) {
  const map = { unpaid: '未提交', submitted: '待确认', confirmed: '已确认', rejected: '驳回' }
  return map[s || 'unpaid'] || s || '—'
}

function balanceStatusLabel(s) {
  const map = { unpaid: '未提交', submitted: '待确认', confirmed: '已确认', rejected: '驳回' }
  return map[s || 'unpaid'] || s || '—'
}

function driverSettlementLabel(s) {
  const map = { not_required: '—', pending: '待结算', paid: '已结算' }
  return map[s || 'not_required'] || s || '—'
}

function isDispatchable(order) {
  return ['deposit_paid', 'pending', 'assigned', 'needs_redispatch'].includes(order.status)
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
    deposit_paid: 'status-green',
    paid: 'status-green',
    assigned: 'status-orange',
    needs_redispatch: 'status-orange',
    driver_accepted: 'status-blue',
    ready_to_start: 'status-green',
    in_progress: 'status-deep-blue',
    arrived: 'status-blue',
    started: 'status-deep-blue',
    completed: 'status-deep-green'
  }
  return map[status] || 'status-gray'
}

function dispatchStatusLabel(status) {
  const map = {
    pending: '未派单',
    unassigned: '未派单',
    assigned: '已派单',
    accepted: '司机已接',
    rejected: '司机拒绝',
    needs_redispatch: '待重新派单',
    completed: '已完成',
    cancelled: '派单取消'
  }
  return map[status || 'unassigned'] || status
}

function dispatchStatusClass(status) {
  const map = {
    pending: 'status-gray',
    unassigned: 'status-gray',
    assigned: 'status-orange',
    accepted: 'status-blue',
    rejected: 'status-purple',
    needs_redispatch: 'status-orange',
    completed: 'status-deep-green',
    cancelled: 'status-purple'
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

function driverInfoLine(order) {
  if (!order?.driverId && !order?.assignedDriver) return '—'
  const parts = []
  const name = order.assignedDriverName || order.assignedDriver?.driverProfile?.realName
  const phone =
    order.assignedDriverPhone ||
    phoneOf(order.assignedDriver) ||
    phoneOf(order.driverId)
  const plate =
    order.assignedDriver?.driverProfile?.vehiclePlate ||
    order.assignedDriver?.driverProfile?.vehicle?.plateNo ||
    ''
  if (name) parts.push(name)
  if (phone) parts.push(phone)
  if (plate) parts.push(plate)
  return parts.length ? parts.join(' / ') : assignedDriverLine(order)
}

function paymentStatusPillClass(order) {
  const label = adminPaymentStatusLabel(order)
  if (label === '待付款') return 'status-orange'
  if (label === '付款待确认') return 'status-blue'
  if (label === '已付款') return 'status-green'
  return 'status-gray'
}

function driverOptionValue(driver) {
  return idOf(driver.userId || driver.id || driver._id)
}

/** 兼容 available / for-dispatch / drivers 多种 API 返回结构 */
function extractDriverRows(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.drivers)) return data.drivers
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.external)) return data.external
  return []
}

/** 统一 available / for-dispatch / drivers 列表字段，供下拉与派单弹窗使用 */
function normalizeDriverForSelect(raw) {
  if (!raw) return null
  const userRef = raw.userId && typeof raw.userId === 'object' ? raw.userId : null
  const userId = idOf(userRef || raw.userId || raw.id || raw._id)
  if (!userId) return null
  const profile = raw.driverProfile || userRef?.driverProfile || {}
  const status = String(raw.status || profile.status || raw.serviceStatus || '').toLowerCase()
  const serviceStatus = String(raw.serviceStatus || profile.status || status || '').toLowerCase()
  const approvalStatus =
    raw.approvalStatus ||
    raw.reviewStatus ||
    profile.approvalStatus ||
    profile.documents?.reviewStatus ||
    raw.verificationStatus ||
    ''
  const phone = raw.phone || profile.phone || phoneOf(userRef) || ''
  const carPlate =
    raw.carPlate ||
    raw.vehiclePlate ||
    profile.vehiclePlate ||
    raw.vehicle?.plateNo ||
    profile.vehicle?.plateNo ||
    ''
  const carModel =
    raw.carModel ||
    raw.vehicleModel ||
    profile.vehicleModel ||
    raw.vehicle?.model ||
    profile.vehicle?.model ||
    ''
  const label = raw.label || `${phone} / ${carPlate || '—'} / ${carModel || '—'}`
  return {
    ...raw,
    id: userId,
    _id: userId,
    userId: userRef || { _id: userId, phone, driverProfile: profile },
    name: raw.name || profile.realName || '',
    phone,
    label,
    status,
    serviceStatus,
    approvalStatus,
    reviewStatus: approvalStatus,
    carPlate,
    carModel,
    available:
      raw.available === true ||
      status === 'online' ||
      serviceStatus === 'idle' ||
      serviceStatus === 'available' ||
      serviceStatus === 'online'
  }
}

function normalizeDriverList(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeDriverForSelect)
    .filter(Boolean)
}

function driverOptionLabel(driver) {
  const row = normalizeDriverForSelect(driver) || driver
  const phone = row.phone || phoneOf(row.userId) || '—'
  const name = row.name || row.realName || ''
  const who = name && name !== phone ? `${name} ${phone}` : phone
  const online =
    row.status === 'online' || row.serviceStatus === 'online' || row.serviceStatus === 'idle'
      ? '在线'
      : String(row.status || '离线')
  const service = row.serviceStatus || '—'
  const avail = row.available === false ? '不可派' : '可派'
  const tasks = Number(row.ongoingOrdersCount ?? 0)
  const review = row.approvalStatus || row.reviewStatus || row.verificationStatus || '—'
  return `${who} · ${online} · ${service} · ${avail} · 任务${Number.isFinite(tasks) ? tasks : 0} · ${review}`
}

function activeDriverIds() {
  const ids = new Set()
  for (const order of orders.value) {
    if (
      ![
        'assigned',
        'accepted',
        'driver_accepted',
        'ready_to_start',
        'started',
        'in_progress'
      ].includes(order.status)
    ) continue
    const id = idOf(order.driverId)
    if (id) ids.add(id)
  }
  return ids
}

function isDriverAvailable(driver) {
  const row = normalizeDriverForSelect(driver) || driver
  if (row.available === true) return true
  const status = String(row.status || '').toLowerCase()
  if (['online', 'available', 'approved', 'idle', 'active'].includes(status)) return true
  const serviceStatus = String(row.serviceStatus || '').toLowerCase()
  if (['idle', 'available', 'online'].includes(serviceStatus)) return true
  const approval = String(
    row.approvalStatus || row.reviewStatus || row.verificationStatus || ''
  ).toLowerCase()
  if (['approved', 'passed', 'verified'].includes(approval)) {
    if (['offline', 'rejected', 'blocked'].includes(status)) return false
    return true
  }
  return false
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
    .filter((driver) => {
      const id = driverOptionValue(driver)
      if (id === idOf(order.driverId)) return true
      if (busyIds.has(id)) return false
      if (Number(driver.ongoingOrdersCount) > 0) return false
      return true
    })
    .slice()
    .sort((a, b) => {
      const recentDiff = driverRecentOrderCount(a) - driverRecentOrderCount(b)
      if (recentDiff !== 0) return recentDiff
      return Number(simulatedDistance(order, a)) - Number(simulatedDistance(order, b))
    })
}

/** 手工派单：列出全部已加载司机，由客服明确选择 */
function selectableDriversForOrder(order) {
  const busyIds = activeDriverIds()
  return drivers.value.slice().sort((a, b) => {
    const aBusy = busyIds.has(driverOptionValue(a)) || Number(a.ongoingOrdersCount) > 0 ? 1 : 0
    const bBusy = busyIds.has(driverOptionValue(b)) || Number(b.ongoingOrdersCount) > 0 ? 1 : 0
    if (aBusy !== bBusy) return aBusy - bBusy
    return String(a.phone || '').localeCompare(String(b.phone || ''))
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
    const existingDriverId = idOf(order.driverId) || idOf(order.assignedDriver)
    selectedDriverIds[order._id] = existingDriverId || ''
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
    hasDeposit(order) &&
    isDispatchable(order) &&
    !!selectedDriverIds[order._id] &&
    assigningId.value !== order._id
  )
}

function canOpenDispatch(order) {
  const stage = adminOrderUiStage(order)
  return (
    (stage === 'ready_dispatch' || stage === 'needs_redispatch') &&
    hasDeposit(order) &&
    isDispatchable(order) &&
    assigningId.value !== order._id
  )
}

function canUnassign(order) {
  return (
    !!(order.assignedDriver || order.driverId) &&
    ['assigned', 'unassigned', 'pending'].includes(order.dispatchStatus || 'pending') &&
    !['accepted', 'driver_accepted', 'started', 'in_progress', 'completed', 'cancelled'].includes(order.status) &&
    assigningId.value !== order._id
  )
}

function canOneClickAssign(order) {
  return (
    adminOrderUiStage(order) === 'ready_dispatch' &&
    hasDeposit(order) &&
    isDispatchable(order) &&
    !!getRecommendedDriver(order) &&
    assigningId.value !== order._id
  )
}

async function onQuote(order) {
  const input = window.prompt('请输入客户价（人民币 CNY）', order.customerPriceCny || '')
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

async function onConfirmDeposit(order) {
  confirmingDepositId.value = order._id
  error.value = ''
  success.value = ''
  try {
    await confirmOrderDeposit(order._id)
    success.value = '付款已确认'
    await load()
  } catch (e) {
    error.value = e.message || '确认定金失败'
  } finally {
    confirmingDepositId.value = ''
  }
}

async function onAssign(order) {
  if (!hasDeposit(order)) {
    error.value = '定金未确认，不能派单'
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
    availableDrivers.value = normalizeDriverList(extractDriverRows(data))
  } catch (e) {
    error.value = e.message || '加载在线司机失败'
    availableDrivers.value = []
  } finally {
    availableDriversLoading.value = false
  }
}

async function assignFromModal(driver) {
  const order = dispatchOrder.value
  const driverUserId = driverOptionValue(driver)
  if (!order || !driverUserId) return
  if (!hasDeposit(order)) {
    error.value = '定金未确认，不能派单'
    return
  }
  assigningId.value = order._id
  error.value = ''
  success.value = ''
  try {
    await assignDriver(order._id, driverUserId)
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
      quick: filters.quick || undefined,
      depositStatus: filters.depositStatus || undefined,
      customerPhone: filters.customerPhone || undefined,
      range: filters.showDeleted ? 'all' : filters.range,
      showDeleted: filters.showDeleted ? '1' : undefined
    })
    orders.value = data.orders || []
    total.value = data.total ?? 0
    applyRecommendedDrivers()
  } catch (e) {
    error.value = e.message || '加载失败'
    orders.value = []
  }
}

function openDeleteModal(order) {
  deleteTarget.value = order
  deletePassword.value = ''
  deleteReason.value = ''
  deleteError.value = ''
  deleteModalVisible.value = true
}

function closeDeleteModal() {
  deleteModalVisible.value = false
  deleteTarget.value = null
  deletePassword.value = ''
  deleteReason.value = ''
  deleteError.value = ''
}

async function submitDelete() {
  const order = deleteTarget.value
  if (!order?._id) return
  if (!deleteReason.value.trim()) {
    deleteError.value = '请填写删除原因'
    return
  }
  if (!deletePassword.value) {
    deleteError.value = '请输入管理员密码'
    return
  }
  deleteSubmitting.value = true
  deletingId.value = order._id
  deleteError.value = ''
  error.value = ''
  try {
    await softDeleteOrder(order._id, {
      adminPassword: deletePassword.value,
      reason: deleteReason.value.trim()
    })
    success.value = '订单已归档删除'
    closeDeleteModal()
    await load()
  } catch (e) {
    deleteError.value = e.message || '删除失败'
  } finally {
    deleteSubmitting.value = false
    deletingId.value = ''
  }
}

onMounted(async () => {
  applyRouteQuery()
  await Promise.all([loadDrivers(), load()])
})

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    page.value = 1
    load()
  }
)
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
.ops-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 180px;
}
.ops-select {
  min-width: 140px;
  max-width: 180px;
}
.ops-hint {
  color: #b45309;
  font-size: 13px;
  font-weight: 600;
}
.driver-info-cell {
  font-size: 13px;
  max-width: 160px;
}
.nowrap {
  white-space: nowrap;
  font-size: 13px;
}
.link-btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.price-cell {
  white-space: nowrap;
}
.price-sub {
  margin-top: 2px;
  font-size: 11px;
  color: #64748b;
}
.show-deleted {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  margin-left: 8px;
}
.row-deleted {
  opacity: 0.85;
  background: #fef2f2;
}
.deleted-tag {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  background: #fee2e2;
  color: #b91c1c;
}
.delete-warn {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
  line-height: 1.5;
}
.field-label {
  display: block;
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--muted);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.btn-danger {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.err {
  margin-top: 10px;
  color: var(--danger);
  font-size: 13px;
}
</style>
