<template>
  <div>
    <h2>客户管理</h2>
    <p class="muted">乘客用户（role=user）；订单统计来自 Order 表聚合。</p>

    <div class="toolbar card">
      <input v-model="search" class="input" placeholder="手机号 / 姓名 / 邮箱" />
      <label>状态</label>
      <select v-model="statusFilter" class="input" style="max-width: 140px">
        <option value="">全部</option>
        <option value="active">正常</option>
        <option value="banned">拉黑</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>客户姓名</th>
            <th>手机号</th>
            <th>邮箱</th>
            <th>注册时间</th>
            <th>最近登录/下单</th>
            <th>总订单</th>
            <th>已完成</th>
            <th>已取消</th>
            <th>状态</th>
            <th class="acts">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in customers" :key="c._id">
            <td>{{ c.name || '—' }}</td>
            <td>{{ c.phone }}</td>
            <td>{{ c.email || '—' }}</td>
            <td>{{ fmtTime(c.registeredAt) }}</td>
            <td>
              <span v-if="c.lastActivityAt" class="activity-tag">{{ activityTag(c) }}</span>
              {{ fmtTime(c.lastActivityAt) || '—' }}
            </td>
            <td>{{ c.totalOrders }}</td>
            <td>{{ c.completedOrders }}</td>
            <td>{{ c.cancelledOrders }}</td>
            <td>
              <span class="pill" :class="c.status === 'banned' ? 'pill-banned' : 'pill-ok'">
                {{ statusLabel(c.status) }}
              </span>
            </td>
            <td class="acts">
              <button type="button" class="btn mini" @click="openOrders(c)">查看订单</button>
              <button
                v-if="c.status !== 'banned'"
                type="button"
                class="btn mini danger"
                :disabled="statusSaving === c._id"
                @click="toggleStatus(c, 'banned')"
              >
                拉黑
              </button>
              <button
                v-else
                type="button"
                class="btn mini"
                :disabled="statusSaving === c._id"
                @click="toggleStatus(c, 'active')"
              >
                解封
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

    <div v-if="ordersModal.open" class="modal-mask" @click.self="closeOrders">
      <div class="modal card">
        <div class="modal-head">
          <h3>客户订单 · {{ ordersModal.customer?.phone }}</h3>
          <button type="button" class="btn" @click="closeOrders">关闭</button>
        </div>
        <p v-if="ordersModal.error" class="err">{{ ordersModal.error }}</p>
        <p v-if="ordersModal.loading" class="muted">加载中…</p>
        <div v-else class="table-wrap inner">
          <table class="data">
            <thead>
              <tr>
                <th>订单</th>
                <th>起点</th>
                <th>终点</th>
                <th>状态</th>
                <th>创建时间</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in ordersModal.orders" :key="o._id">
                <td>{{ orderDisplayNo(o) }}</td>
                <td class="ellipsis">{{ o.pickup || '—' }}</td>
                <td class="ellipsis">{{ o.destination || '—' }}</td>
                <td>{{ orderStatusLabel(o.status) }}</td>
                <td>{{ fmtTime(o.createdAt) }}</td>
                <td>
                  <router-link :to="{ name: 'order-detail', params: { id: o._id } }">
                    详情
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!ordersModal.orders.length" class="muted">暂无订单</p>
        </div>
        <p class="muted">共 {{ ordersModal.total }} 单</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  fetchCustomers,
  fetchCustomerOrders,
  patchCustomerStatus
} from '@/api/admin'
import { orderStatusLabel } from '@/utils/orderStatus'

const customers = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const search = ref('')
const statusFilter = ref('')
const error = ref('')
const toast = ref('')
const statusSaving = ref('')

const ordersModal = reactive({
  open: false,
  loading: false,
  error: '',
  customer: null,
  orders: [],
  total: 0
})

function fmtTime(v) {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

function statusLabel(s) {
  return s === 'banned' ? '拉黑' : '正常'
}

function activityTag(c) {
  const login = c.lastLoginAt ? new Date(c.lastLoginAt).getTime() : 0
  const order = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0
  if (login && login >= order) return '登录'
  if (order) return '下单'
  return ''
}

function orderDisplayNo(o) {
  if (o.orderNo) return o.orderNo
  if (o.orderDateKey && o.dailySeq != null) {
    return `${o.orderDateKey}-${String(o.dailySeq).padStart(3, '0')}`
  }
  return String(o._id || '').slice(-8)
}

async function load() {
  error.value = ''
  try {
    const data = await fetchCustomers({
      page: page.value,
      pageSize,
      search: search.value.trim() || undefined,
      status: statusFilter.value || undefined
    })
    customers.value = data?.customers || []
    total.value = data?.total ?? 0
  } catch (e) {
    error.value = e.message || '加载失败'
    customers.value = []
  }
}

async function toggleStatus(c, status) {
  statusSaving.value = c._id
  toast.value = ''
  try {
    await patchCustomerStatus(c._id, status)
    c.status = status
    toast.value = status === 'banned' ? '已拉黑' : '已恢复为正常'
  } catch (e) {
    error.value = e.message || '操作失败'
  } finally {
    statusSaving.value = ''
  }
}

async function openOrders(c) {
  ordersModal.open = true
  ordersModal.customer = c
  ordersModal.loading = true
  ordersModal.error = ''
  ordersModal.orders = []
  ordersModal.total = 0
  try {
    const data = await fetchCustomerOrders(c._id, { page: 1, pageSize: 50 })
    ordersModal.orders = data?.orders || []
    ordersModal.total = data?.total ?? 0
  } catch (e) {
    ordersModal.error = e.message || '加载订单失败'
  } finally {
    ordersModal.loading = false
  }
}

function closeOrders() {
  ordersModal.open = false
}

onMounted(load)
</script>

<style scoped>
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
.toast {
  color: #059669;
  margin-bottom: 8px;
}
.pager {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.acts {
  white-space: nowrap;
}
.btn.mini {
  padding: 4px 8px;
  font-size: 12px;
  margin-right: 4px;
}
.btn.mini.danger {
  color: var(--danger);
  border-color: #fecaca;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.pill-ok {
  background: #ecfdf5;
  color: #047857;
}
.pill-banned {
  background: #fef2f2;
  color: #b91c1c;
}
.activity-tag {
  display: inline-block;
  margin-right: 4px;
  padding: 0 6px;
  font-size: 11px;
  border-radius: 4px;
  background: #eef2ff;
  color: #4338ca;
}
.ellipsis {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}
.modal {
  width: min(920px, 100%);
  max-height: 85vh;
  overflow: auto;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.modal-head h3 {
  margin: 0;
  font-size: 16px;
}
table.inner {
  margin-top: 8px;
}
</style>
