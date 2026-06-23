<template>
  <div>
    <h2>员工管理</h2>
    <p class="muted">管理后台员工账号；超级管理员（role=admin）不可在此禁用。</p>

    <div class="toolbar card">
      <input v-model="search" class="input" placeholder="手机号 / 姓名" />
      <select v-model="roleFilter" class="input" style="max-width: 140px">
        <option value="">全部角色</option>
        <option v-for="r in allRoles" :key="r" :value="r">{{ roleLabel(r) }}</option>
      </select>
      <select v-model="statusFilter" class="input" style="max-width: 120px">
        <option value="">全部状态</option>
        <option value="active">正常</option>
        <option value="banned">已禁用</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
      <button v-if="canCreate" type="button" class="btn" @click="openCreate">新增员工</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>手机号</th>
            <th>姓名</th>
            <th>角色</th>
            <th>状态</th>
            <th>最近登录</th>
            <th>创建时间</th>
            <th class="acts">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row._id">
            <td>{{ row.phone }}</td>
            <td>{{ row.displayName || '—' }}</td>
            <td><span class="pill">{{ roleLabel(row.role) }}</span></td>
            <td>
              <span class="pill" :class="row.status === 'banned' ? 'pill-banned' : 'pill-ok'">
                {{ row.status === 'banned' ? '已禁用' : '正常' }}
              </span>
            </td>
            <td>{{ fmtTime(row.lastLoginAt) || '—' }}</td>
            <td>{{ fmtTime(row.createdAt) || '—' }}</td>
            <td class="acts">
              <button
                v-if="canDelete && row.role !== 'admin' && row.status !== 'banned'"
                type="button"
                class="btn mini danger"
                :disabled="savingId === row._id"
                @click="toggleStatus(row, 'banned')"
              >
                禁用
              </button>
              <button
                v-if="canDelete && row.role !== 'admin' && row.status === 'banned'"
                type="button"
                class="btn mini"
                :disabled="savingId === row._id"
                @click="toggleStatus(row, 'active')"
              >
                启用
              </button>
              <button v-if="canUpdate" type="button" class="btn mini" @click="openReset(row)">重置密码</button>
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

    <div v-if="createModal.open" class="modal-mask" @click.self="closeCreate">
      <div class="modal card">
        <div class="modal-head">
          <h3>新增员工</h3>
          <button type="button" class="btn" @click="closeCreate">关闭</button>
        </div>
        <label>手机号</label>
        <input v-model="createModal.phone" class="input" />
        <label>姓名（可选）</label>
        <input v-model="createModal.displayName" class="input" />
        <label>角色</label>
        <select v-model="createModal.role" class="input">
          <option v-for="r in creatableRoles" :key="r" :value="r">{{ roleLabel(r) }}</option>
        </select>
        <label>初始密码</label>
        <input v-model="createModal.password" class="input" type="password" />
        <p v-if="createModal.error" class="err">{{ createModal.error }}</p>
        <div class="modal-foot">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="createModal.saving"
            @click="submitCreate"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <div v-if="resetModal.open" class="modal-mask" @click.self="closeReset">
      <div class="modal card">
        <div class="modal-head">
          <h3>重置密码 · {{ resetModal.row?.phone }}</h3>
          <button type="button" class="btn" @click="closeReset">关闭</button>
        </div>
        <label>新密码（至少 6 位）</label>
        <input v-model="resetModal.password" class="input" type="password" />
        <p v-if="resetModal.error" class="err">{{ resetModal.error }}</p>
        <div class="modal-foot">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="resetModal.saving"
            @click="submitReset"
          >
            确认重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  fetchStaff,
  createStaff,
  patchStaffStatus,
  resetStaffPassword
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS } from '@/utils/staffRoles'

const auth = useAuthStore()
const canCreate = computed(() => auth.can('staff', 'create'))
const canUpdate = computed(() => auth.can('staff', 'update'))
const canDelete = computed(() => auth.can('staff', 'delete'))

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const error = ref('')
const toast = ref('')
const savingId = ref('')
const creatableRoles = ref(['operator', 'finance', 'support', 'dispatcher'])
const allRoles = ref(['admin', 'operator', 'finance', 'support', 'dispatcher'])

const createModal = reactive({
  open: false,
  phone: '',
  displayName: '',
  role: 'operator',
  password: '',
  saving: false,
  error: ''
})

const resetModal = reactive({
  open: false,
  row: null,
  password: '',
  saving: false,
  error: ''
})

function roleLabel(role) {
  return ROLE_LABELS[role] || role
}

function fmtTime(v) {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

async function load() {
  error.value = ''
  try {
    const data = await fetchStaff({
      page: page.value,
      pageSize,
      search: search.value.trim() || undefined,
      role: roleFilter.value || undefined,
      status: statusFilter.value || undefined
    })
    rows.value = data?.rows || []
    total.value = data?.total ?? 0
    if (data?.creatableRoles?.length) creatableRoles.value = data.creatableRoles
  } catch (e) {
    error.value = e.message || '加载失败'
    rows.value = []
  }
}

function openCreate() {
  createModal.open = true
  createModal.phone = ''
  createModal.displayName = ''
  createModal.role = 'operator'
  createModal.password = ''
  createModal.error = ''
}

function closeCreate() {
  createModal.open = false
}

async function submitCreate() {
  createModal.saving = true
  createModal.error = ''
  try {
    await createStaff({
      phone: createModal.phone.trim(),
      displayName: createModal.displayName.trim(),
      role: createModal.role,
      password: createModal.password
    })
    toast.value = '员工已创建'
    closeCreate()
    await load()
  } catch (e) {
    createModal.error = e.message || '创建失败'
  } finally {
    createModal.saving = false
  }
}

function openReset(row) {
  resetModal.open = true
  resetModal.row = row
  resetModal.password = ''
  resetModal.error = ''
}

function closeReset() {
  resetModal.open = false
}

async function submitReset() {
  resetModal.saving = true
  resetModal.error = ''
  try {
    await resetStaffPassword(resetModal.row._id, resetModal.password)
    toast.value = '密码已重置'
    closeReset()
  } catch (e) {
    resetModal.error = e.message || '重置失败'
  } finally {
    resetModal.saving = false
  }
}

async function toggleStatus(row, status) {
  savingId.value = row._id
  toast.value = ''
  try {
    await patchStaffStatus(row._id, status)
    row.status = status
    toast.value = status === 'banned' ? '已禁用' : '已启用'
  } catch (e) {
    error.value = e.message || '操作失败'
  } finally {
    savingId.value = ''
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
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
  font-size: 12px;
}
.pill-ok {
  background: #d1fae5;
  color: #065f46;
}
.pill-banned {
  background: #fee2e2;
  color: #991b1b;
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
  width: min(440px, 92vw);
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
label {
  display: block;
  margin: 8px 0 4px;
  font-size: 13px;
  color: #6b7280;
}
</style>
