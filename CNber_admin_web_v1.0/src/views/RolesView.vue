<template>
  <div>
    <h2>角色权限</h2>
    <p class="muted">模块级权限矩阵；admin 拥有全部权限且不可关闭。</p>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <div class="toolbar card">
      <span class="label">选择角色</span>
      <div class="role-tabs">
        <button
          v-for="r in editableRoles"
          :key="r"
          type="button"
          class="tab"
          :class="{ active: selectedRole === r }"
          @click="selectRole(r)"
        >
          {{ roleLabel(r) }}
        </button>
        <button type="button" class="tab admin-tab" disabled title="admin 拥有全部权限，不可编辑">
          {{ roleLabel('admin') }}（全权限）
        </button>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <button type="button" class="btn" :disabled="saving" @click="resetToDefault">
          重置为默认模板
        </button>
      </div>
    </div>

    <div v-if="loading" class="muted">加载中…</div>

    <div v-else class="table-wrap card">
      <table class="matrix">
        <thead>
          <tr>
            <th class="mod-col">模块</th>
            <th v-for="act in actions" :key="act">{{ actionLabel(act) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mod in modules" :key="mod">
            <td class="mod-col">{{ moduleLabel(mod) }}</td>
            <td v-for="act in actions" :key="act" class="cell">
              <input
                type="checkbox"
                :checked="isChecked(mod, act)"
                :disabled="!selectedRole"
                @change="toggle(mod, act, $event.target.checked)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="note card">
      <h3>说明</h3>
      <ul>
        <li>勾选即授予对应模块的动作权限；未勾选则该角色无法访问相关 API 与按钮。</li>
        <li>菜单显示依赖 <code>view</code> 权限；保存后员工需重新登录或刷新页面生效。</li>
        <li>若数据库无配置，系统使用内置默认模板。</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchRolePermissions, updateRolePermissions, resetRolePermissions } from '@/api/admin'
import { ROLE_LABELS } from '@/utils/staffRoles'
import { PERMISSION_ACTIONS, PERMISSION_MODULES, MODULE_LABELS, ACTION_LABELS } from '@/utils/permissionMatrix'

const editableRoles = ['operator', 'finance', 'support', 'dispatcher']
const modules = PERMISSION_MODULES
const actions = PERMISSION_ACTIONS

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const toast = ref('')
const selectedRole = ref('operator')
const draft = reactive({})

function roleLabel(r) {
  return ROLE_LABELS[r] || r
}
function moduleLabel(m) {
  return MODULE_LABELS[m] || m
}
function actionLabel(a) {
  return ACTION_LABELS[a] || a
}

function isChecked(mod, act) {
  const list = draft[selectedRole.value]?.[mod]
  return Array.isArray(list) && list.includes(act)
}

function toggle(mod, act, on) {
  if (!selectedRole.value) return
  if (!draft[selectedRole.value]) draft[selectedRole.value] = {}
  const cur = new Set(draft[selectedRole.value][mod] || [])
  if (on) cur.add(act)
  else cur.delete(act)
  if (cur.size) draft[selectedRole.value][mod] = [...cur]
  else delete draft[selectedRole.value][mod]
}

function selectRole(r) {
  selectedRole.value = r
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchRolePermissions()
    for (const item of data?.roles || []) {
      draft[item.role] = JSON.parse(JSON.stringify(item.permissions || {}))
    }
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!selectedRole.value) return
  saving.value = true
  error.value = ''
  toast.value = ''
  try {
    await updateRolePermissions(selectedRole.value, draft[selectedRole.value] || {})
    toast.value = `已保存 ${roleLabel(selectedRole.value)} 权限`
  } catch (e) {
    error.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function resetToDefault() {
  if (!selectedRole.value) return
  if (!window.confirm(`确定将 ${roleLabel(selectedRole.value)} 重置为默认模板？`)) return
  saving.value = true
  error.value = ''
  toast.value = ''
  try {
    const data = await resetRolePermissions(selectedRole.value)
    draft[selectedRole.value] = JSON.parse(JSON.stringify(data?.permissions || {}))
    toast.value = '已重置为默认模板'
  } catch (e) {
    error.value = e.message || '重置失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.label {
  font-size: 13px;
  color: #6b7280;
}
.role-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.tab {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.tab.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.admin-tab {
  opacity: 0.65;
  cursor: not-allowed;
}
.actions {
  display: flex;
  gap: 8px;
}
.table-wrap {
  overflow: auto;
  margin-bottom: 16px;
}
.matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.matrix th,
.matrix td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: center;
}
.matrix .mod-col {
  text-align: left;
  min-width: 120px;
  font-weight: 500;
  position: sticky;
  left: 0;
  background: #fff;
}
.cell input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.note {
  padding: 16px 20px;
}
.note h3 {
  margin: 0 0 8px;
  font-size: 15px;
}
.note ul {
  margin: 0;
  padding-left: 20px;
  color: #4b5563;
  line-height: 1.7;
}
code {
  font-size: 12px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
