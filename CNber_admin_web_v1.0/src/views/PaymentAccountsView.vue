<template>
  <div>
    <h2>收款账户设置</h2>
    <p class="muted">配置平台收款账户；客户端定金/尾款页按「用途」与「启用」拉取，不在前端写死。</p>
    <p v-if="msg" class="toast">{{ msg }}</p>
    <p v-if="err" class="err">{{ err }}</p>

    <div class="card">
      <h3>{{ editingId ? '编辑账户' : '新增账户' }}</h3>
      <div class="grid">
        <label>账户名称 <input v-model="form.name" class="input" placeholder="如：平台微信A" /></label>
        <label>类型
          <select v-model="form.type" class="input">
            <option value="wechat">微信</option>
            <option value="alipay">支付宝</option>
            <option value="bank">银行</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label>用途
          <select v-model="form.scene" class="input">
            <option value="deposit">定金</option>
            <option value="balance">尾款</option>
            <option value="both">通用</option>
          </select>
        </label>
        <label>收款人姓名 <input v-model="form.receiverName" class="input" /></label>
        <label>账号 <input v-model="form.accountNo" class="input" placeholder="微信号 / 支付宝 / 卡号" /></label>
        <label>二维码 URL <input v-model="form.qrCodeUrl" class="input" placeholder="可选" /></label>
        <label>排序 <input v-model.number="form.sortOrder" class="input" type="number" /></label>
        <label class="row"
          ><input v-model="form.enabled" type="checkbox" /> 启用</label
        >
      </div>
      <label class="block">付款说明</label>
      <textarea v-model="form.instruction" class="input ta" rows="2" placeholder="展示给客户的转账说明" />
      <div class="actions">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : editingId ? '保存修改' : '创建' }}
        </button>
        <button v-if="editingId" type="button" class="btn" :disabled="saving" @click="resetForm">取消编辑</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>用途</th>
            <th>收款人</th>
            <th>账号</th>
            <th>启用</th>
            <th>排序</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accounts" :key="a._id">
            <td>{{ a.name || '—' }}</td>
            <td>{{ typeLabel(a.type) }}</td>
            <td>{{ sceneLabel(a.scene) }}</td>
            <td>{{ a.receiverName || '—' }}</td>
            <td class="ellipsis">{{ a.accountNo || '—' }}</td>
            <td>{{ a.enabled ? '是' : '否' }}</td>
            <td>{{ a.sortOrder ?? 0 }}</td>
            <td>
              <button type="button" class="btn" @click="edit(a)">编辑</button>
              <button type="button" class="btn" @click="toggle(a)">{{ a.enabled ? '禁用' : '启用' }}</button>
              <button type="button" class="btn btn-danger" @click="remove(a)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  fetchPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount
} from '@/api/admin'

const accounts = ref([])
const err = ref('')
const msg = ref('')
const saving = ref(false)
const editingId = ref('')

const form = reactive({
  name: '',
  type: 'wechat',
  scene: 'both',
  receiverName: '',
  accountNo: '',
  qrCodeUrl: '',
  instruction: '',
  enabled: true,
  sortOrder: 0
})

function typeLabel(t) {
  const m = { wechat: '微信', alipay: '支付宝', bank: '银行', other: '其他' }
  return m[t] || t || '—'
}
function sceneLabel(s) {
  const m = { deposit: '定金', balance: '尾款', both: '通用' }
  return m[s] || s || '—'
}

function resetForm() {
  editingId.value = ''
  form.name = ''
  form.type = 'wechat'
  form.scene = 'both'
  form.receiverName = ''
  form.accountNo = ''
  form.qrCodeUrl = ''
  form.instruction = ''
  form.enabled = true
  form.sortOrder = 0
}

async function load() {
  err.value = ''
  try {
    const data = await fetchPaymentAccounts()
    accounts.value = data.accounts || []
  } catch (e) {
    err.value = e.message || '加载失败'
    accounts.value = []
  }
}

async function save() {
  if (!form.name.trim()) {
    err.value = '请填写账户名称'
    return
  }
  saving.value = true
  err.value = ''
  msg.value = ''
  try {
    const body = { ...form }
    if (editingId.value) {
      await updatePaymentAccount(editingId.value, body)
      msg.value = '已保存'
    } else {
      await createPaymentAccount(body)
      msg.value = '已创建'
      resetForm()
    }
    await load()
  } catch (e) {
    err.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

function edit(a) {
  editingId.value = a._id
  form.name = a.name || ''
  form.type = a.type || 'other'
  form.scene = a.scene || 'both'
  form.receiverName = a.receiverName || ''
  form.accountNo = a.accountNo || ''
  form.qrCodeUrl = a.qrCodeUrl || ''
  form.instruction = a.instruction || ''
  form.enabled = Boolean(a.enabled)
  form.sortOrder = Number(a.sortOrder) || 0
}

async function toggle(a) {
  err.value = ''
  msg.value = ''
  try {
    await updatePaymentAccount(a._id, { enabled: !a.enabled })
    msg.value = '已更新'
    await load()
  } catch (e) {
    err.value = e.message || '操作失败'
  }
}

async function remove(a) {
  if (!confirm(`删除账户「${a.name}」？`)) return
  err.value = ''
  try {
    await deletePaymentAccount(a._id)
    msg.value = '已删除'
    if (editingId.value === a._id) resetForm()
    await load()
  } catch (e) {
    err.value = e.message || '删除失败'
  }
}

onMounted(load)
</script>

<style scoped>
h2 {
  margin: 0 0 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
label.row {
  flex-direction: row;
  align-items: center;
}
.block {
  display: block;
  margin-bottom: 4px;
}
.ta {
  width: 100%;
  margin-bottom: 12px;
}
.actions {
  display: flex;
  gap: 8px;
}
.toast {
  color: #166534;
  font-size: 13px;
}
.err {
  color: var(--danger);
  font-size: 13px;
}
.ellipsis {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
