<template>
  <div>
    <h2>优惠券</h2>
    <p class="muted">管理优惠码；运营可查看，仅管理员可创建与修改。</p>

    <div class="toolbar card">
      <input v-model="keyword" class="input" placeholder="优惠码 / 名称" />
      <select v-model="statusFilter" class="input" style="max-width: 140px">
        <option value="">全部状态</option>
        <option value="not_started">未开始</option>
        <option value="active">进行中</option>
        <option value="expired">已过期</option>
        <option value="disabled">已禁用</option>
        <option value="exhausted">已用完</option>
      </select>
      <select v-model="enabledFilter" class="input" style="max-width: 120px">
        <option value="">启用状态</option>
        <option value="true">已启用</option>
        <option value="false">已禁用</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
      <button v-if="canCreate" type="button" class="btn" @click="openCreate">新增优惠券</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>优惠名称</th>
            <th>优惠码</th>
            <th>类型</th>
            <th>优惠金额</th>
            <th>最低消费</th>
            <th>适用服务</th>
            <th>使用次数</th>
            <th>时间范围</th>
            <th>状态</th>
            <th>启用</th>
            <th v-if="canUpdate || canDelete" class="acts">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row._id">
            <td>{{ row.name }}</td>
            <td><code>{{ row.code }}</code></td>
            <td>{{ typeLabel(row.type) }}</td>
            <td>{{ amountLabel(row) }}</td>
            <td>¥{{ row.minSpendCny || 0 }}</td>
            <td>{{ scopeLabel(row.serviceTypes) }}</td>
            <td>{{ row.usedCount || 0 }} / {{ usageLimitLabel(row.usageLimit) }}</td>
            <td class="time-col">{{ fmtRange(row.startAt, row.endAt) }}</td>
            <td><span class="pill" :class="statusClass(row.status)">{{ row.statusLabel }}</span></td>
            <td>{{ row.enabled ? '是' : '否' }}</td>
            <td v-if="canUpdate || canDelete" class="acts">
              <button v-if="canUpdate" type="button" class="btn mini" @click="openEdit(row)">编辑</button>
              <button
                v-if="canDelete"
                type="button"
                class="btn mini"
                :disabled="savingId === row._id"
                @click="toggleEnabled(row)"
              >
                {{ row.enabled ? '禁用' : '启用' }}
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

    <div v-if="modal.open" class="modal-mask" @click.self="closeModal">
      <div class="modal card modal-wide">
        <div class="modal-head">
          <h3>{{ modal.editingId ? '编辑优惠券' : '新增优惠券' }}</h3>
          <button type="button" class="btn" @click="closeModal">关闭</button>
        </div>

        <div class="form-grid">
          <label>名称 <input v-model="modal.form.name" class="input" /></label>
          <label>优惠码 <input v-model="modal.form.code" class="input" placeholder="NEW100" /></label>
          <label>
            类型
            <select v-model="modal.form.type" class="input">
              <option value="fixed">固定金额 (CNY)</option>
              <option value="percent">百分比（预留）</option>
            </select>
          </label>
          <label v-if="modal.form.type === 'fixed'">
            优惠金额 (CNY)
            <input v-model.number="modal.form.discountAmountCny" class="input" type="number" min="0" />
          </label>
          <label v-else>
            折扣百分比
            <input v-model.number="modal.form.discountPercent" class="input" type="number" min="0" max="100" />
          </label>
          <label>最低消费 (CNY) <input v-model.number="modal.form.minSpendCny" class="input" type="number" min="0" /></label>
          <label>总可用次数 (0=不限) <input v-model.number="modal.form.usageLimit" class="input" type="number" min="0" /></label>
          <label>每用户限制 <input v-model.number="modal.form.perUserLimit" class="input" type="number" min="0" /></label>
          <label>开始时间 <input v-model="modal.form.startAt" class="input" type="datetime-local" /></label>
          <label>结束时间 <input v-model="modal.form.endAt" class="input" type="datetime-local" /></label>
          <label class="row"><input v-model="modal.form.enabled" type="checkbox" /> 启用</label>
        </div>

        <label class="block">适用服务类型（不选=全部）</label>
        <div class="checks">
          <label v-for="st in serviceTypes" :key="st.code" class="check-item">
            <input v-model="modal.form.serviceTypes" type="checkbox" :value="st.code" />
            {{ st.label || st.code }}
          </label>
        </div>

        <label class="block">适用车型（不选=全部）</label>
        <div class="checks">
          <label v-for="vc in vehicleClasses" :key="vc.code" class="check-item">
            <input v-model="modal.form.vehicleClasses" type="checkbox" :value="vc.code" />
            {{ vc.label || vc.code }}
          </label>
        </div>

        <label class="block">备注</label>
        <textarea v-model="modal.form.remark" class="input ta" rows="2" />

        <p v-if="modal.error" class="err">{{ modal.error }}</p>
        <div class="modal-foot">
          <button type="button" class="btn btn-primary" :disabled="modal.saving" @click="submitModal">
            {{ modal.saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createCoupon,
  fetchCatalogServiceTypes,
  fetchCatalogVehicleClasses,
  fetchCoupons,
  patchCouponStatus,
  updateCoupon
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const canCreate = computed(() => auth.can('coupons', 'create'))
const canUpdate = computed(() => auth.can('coupons', 'update'))
const canDelete = computed(() => auth.can('coupons', 'delete'))

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const statusFilter = ref('')
const enabledFilter = ref('')
const error = ref('')
const toast = ref('')
const savingId = ref('')
const serviceTypes = ref([])
const vehicleClasses = ref([])

const modal = reactive({
  open: false,
  editingId: '',
  saving: false,
  error: '',
  form: emptyForm()
})

function emptyForm() {
  const start = new Date()
  const end = new Date()
  end.setMonth(end.getMonth() + 6)
  return {
    name: '',
    code: '',
    type: 'fixed',
    discountAmountCny: 0,
    discountPercent: 0,
    minSpendCny: 0,
    serviceTypes: [],
    vehicleClasses: [],
    usageLimit: 0,
    perUserLimit: 1,
    startAt: toLocalInput(start),
    endAt: toLocalInput(end),
    enabled: true,
    remark: ''
  }
}

function toLocalInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

function fromLocalInput(s) {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function typeLabel(type) {
  return type === 'percent' ? '百分比' : '固定金额'
}

function amountLabel(row) {
  if (row.type === 'percent') return `${row.discountPercent || 0}%`
  return `¥${row.discountAmountCny || 0}`
}

function usageLimitLabel(limit) {
  return limit > 0 ? limit : '不限'
}

function scopeLabel(list) {
  if (!list?.length) return '全部'
  return list.join(', ')
}

function fmtRange(start, end) {
  const s = start ? new Date(start).toLocaleString('zh-CN') : '—'
  const e = end ? new Date(end).toLocaleString('zh-CN') : '—'
  return `${s} ~ ${e}`
}

function statusClass(status) {
  if (status === 'active') return 'pill-ok'
  if (status === 'disabled') return 'pill-banned'
  return ''
}

async function loadCatalogs() {
  const [st, vc] = await Promise.all([fetchCatalogServiceTypes(), fetchCatalogVehicleClasses()])
  serviceTypes.value = st?.items || st?.serviceTypes || []
  vehicleClasses.value = vc?.items || vc?.vehicleClasses || []
}

async function load() {
  error.value = ''
  try {
    const params = { page: page.value, pageSize }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (statusFilter.value) params.status = statusFilter.value
    if (enabledFilter.value) params.enabled = enabledFilter.value
    const data = await fetchCoupons(params)
    rows.value = data?.coupons || []
    total.value = data?.total ?? rows.value.length
  } catch (e) {
    error.value = e.message || '加载失败'
  }
}

function openCreate() {
  modal.editingId = ''
  modal.form = emptyForm()
  modal.error = ''
  modal.open = true
}

function openEdit(row) {
  modal.editingId = row._id
  modal.form = {
    name: row.name || '',
    code: row.code || '',
    type: row.type || 'fixed',
    discountAmountCny: row.discountAmountCny || 0,
    discountPercent: row.discountPercent || 0,
    minSpendCny: row.minSpendCny || 0,
    serviceTypes: [...(row.serviceTypes || [])],
    vehicleClasses: [...(row.vehicleClasses || [])],
    usageLimit: row.usageLimit || 0,
    perUserLimit: row.perUserLimit ?? 1,
    startAt: toLocalInput(row.startAt),
    endAt: toLocalInput(row.endAt),
    enabled: row.enabled !== false,
    remark: row.remark || ''
  }
  modal.error = ''
  modal.open = true
}

function closeModal() {
  modal.open = false
}

async function submitModal() {
  modal.saving = true
  modal.error = ''
  try {
    const body = {
      ...modal.form,
      code: String(modal.form.code || '').trim().toUpperCase(),
      startAt: fromLocalInput(modal.form.startAt),
      endAt: fromLocalInput(modal.form.endAt)
    }
    if (modal.editingId) {
      await updateCoupon(modal.editingId, body)
      toast.value = '已保存'
    } else {
      await createCoupon(body)
      toast.value = '已创建'
    }
    closeModal()
    await load()
  } catch (e) {
    modal.error = e.message || '保存失败'
  } finally {
    modal.saving = false
  }
}

async function toggleEnabled(row) {
  savingId.value = row._id
  error.value = ''
  try {
    await patchCouponStatus(row._id, !row.enabled)
    toast.value = row.enabled ? '已禁用' : '已启用'
    await load()
  } catch (e) {
    error.value = e.message || '操作失败'
  } finally {
    savingId.value = ''
  }
}

onMounted(async () => {
  try {
    await loadCatalogs()
  } catch (_) {
    /* catalog optional for list */
  }
  await load()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.time-col {
  font-size: 12px;
  white-space: nowrap;
}
.modal-wide {
  max-width: 720px;
  width: 100%;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}
.check-item {
  font-size: 13px;
}
.block {
  display: block;
  margin: 8px 0 4px;
  font-size: 13px;
  color: #6b7280;
}
.ta {
  width: 100%;
  min-height: 60px;
}
.pill-ok {
  background: #d1fae5;
  color: #065f46;
}
.pill-banned {
  background: #fee2e2;
  color: #991b1b;
}
code {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
</style>
