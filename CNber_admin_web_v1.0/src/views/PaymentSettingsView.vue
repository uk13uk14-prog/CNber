<template>
  <div>
    <h2>支付设置</h2>
    <p class="muted">
      配置真实转账入口（银行 / Wise / Revolut / 微信 / 支付宝等）。乘客端先按此处指引付款，再上传截图，由人工审核。
    </p>
    <p v-if="msg" class="toast">{{ msg }}</p>
    <p v-if="err" class="err">{{ err }}</p>

    <div class="card">
      <h3>{{ editingId ? '编辑收款方式' : '新增收款方式' }}</h3>
      <div class="grid">
        <label>展示名称
          <input v-model="form.displayName" class="input" placeholder="如：公司 Wise 账户" />
        </label>
        <label>付款类型
          <select v-model="form.paymentType" class="input">
            <option value="bank">银行转账</option>
            <option value="wise">Wise</option>
            <option value="revolut">Revolut</option>
            <option value="wechat">微信</option>
            <option value="alipay">支付宝</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label>户名 <input v-model="form.accountName" class="input" /></label>
        <label>银行名称 <input v-model="form.bankName" class="input" /></label>
        <label>Sort Code <input v-model="form.sortCode" class="input" /></label>
        <label>账号 accountNumber <input v-model="form.accountNumber" class="input" /></label>
        <label>IBAN <input v-model="form.iban" class="input" /></label>
        <label>Wise 链接 <input v-model="form.wiseLink" class="input" placeholder="https://wise.com/..." /></label>
        <label>Revolut 链接 <input v-model="form.revolutLink" class="input" /></label>
        <label v-if="form.paymentType === 'alipay'">
          支付宝收款链接
          <input v-model="form.paymentLink" class="input" placeholder="https://..." />
        </label>
        <label v-else>通用付款链接 <input v-model="form.paymentLink" class="input" /></label>
        <label v-if="form.paymentType === 'wechat'">
          微信收款码图片 URL
          <input v-model="form.wechatQrImage" class="input" placeholder="https://.../wechat-qr.png" />
        </label>
        <label v-else>微信二维码 URL <input v-model="form.wechatQrImage" class="input" /></label>
        <label>支付宝二维码 URL <input v-model="form.alipayQrImage" class="input" /></label>
        <label>通用二维码 URL <input v-model="form.qrImage" class="input" /></label>
        <label>客服微信 <input v-model="form.customerServiceWechat" class="input" /></label>
        <label>客服 WhatsApp <input v-model="form.customerServiceWhatsapp" class="input" placeholder="+44..." /></label>
        <label>排序 <input v-model.number="form.sortOrder" class="input" type="number" /></label>
        <label class="row"><input v-model="form.isActive" type="checkbox" /> 启用</label>
      </div>
      <label class="block">客户可见说明（note）</label>
      <textarea v-model="form.note" class="input ta" rows="3" placeholder="到账时间、备注格式 CNBER-订单号 等" />
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
            <th>入口</th>
            <th>启用</th>
            <th>排序</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accounts" :key="a._id">
            <td>{{ a.displayName || '—' }}</td>
            <td>{{ methodLabel(a.paymentType || a.method) }}</td>
            <td class="ellipsis">{{ entrySummary(a) }}</td>
            <td>{{ a.isActive !== false && a.enabled !== false ? '是' : '否' }}</td>
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
  patchPaymentAccount,
  deletePaymentAccount
} from '@/api/admin'

const accounts = ref([])
const err = ref('')
const msg = ref('')
const saving = ref(false)
const editingId = ref('')

const form = reactive({
  paymentType: 'bank',
  displayName: '',
  accountName: '',
  bankName: '',
  accountNumber: '',
  sortCode: '',
  iban: '',
  wiseLink: '',
  revolutLink: '',
  paymentLink: '',
  qrImage: '',
  wechatQrImage: '',
  alipayQrImage: '',
  customerServiceWechat: '',
  customerServiceWhatsapp: '',
  note: '',
  isActive: true,
  sortOrder: 0
})

function methodLabel(m) {
  const map = {
    bank: '银行',
    wise: 'Wise',
    revolut: 'Revolut',
    wechat: '微信',
    alipay: '支付宝',
    other: '其他'
  }
  return map[m] || m || '—'
}

function entrySummary(a) {
  if (a.wiseLink) return 'Wise'
  if (a.revolutLink) return 'Revolut'
  if (a.paymentLink) return '链接'
  if (a.wechatQrImage || a.alipayQrImage || a.qrImage || a.qrCodeUrl) return '二维码'
  if (a.accountNumber || a.accountNo || a.iban) return '银行账号'
  if (a.customerServiceWechat) return '客服微信'
  return '—'
}

function resetForm() {
  editingId.value = ''
  form.paymentType = 'bank'
  form.displayName = ''
  form.accountName = ''
  form.bankName = ''
  form.accountNumber = ''
  form.sortCode = ''
  form.iban = ''
  form.wiseLink = ''
  form.revolutLink = ''
  form.paymentLink = ''
  form.qrImage = ''
  form.wechatQrImage = ''
  form.alipayQrImage = ''
  form.customerServiceWechat = ''
  form.customerServiceWhatsapp = ''
  form.note = ''
  form.isActive = true
  form.sortOrder = 0
}

function fillFromAccount(a) {
  form.paymentType = a.paymentType || a.method || 'other'
  form.displayName = a.displayName || a.name || ''
  form.accountName = a.accountName || ''
  form.bankName = a.bankName || ''
  form.accountNumber = a.accountNumber || a.accountNo || ''
  form.sortCode = a.sortCode || ''
  form.iban = a.iban || ''
  form.wiseLink = a.wiseLink || ''
  form.revolutLink = a.revolutLink || ''
  form.paymentLink = a.paymentLink || ''
  form.qrImage = a.qrImage || a.qrCodeUrl || ''
  form.wechatQrImage = a.wechatQrImage || ''
  form.alipayQrImage = a.alipayQrImage || ''
  form.customerServiceWechat = a.customerServiceWechat || ''
  form.customerServiceWhatsapp = a.customerServiceWhatsapp || ''
  form.note = a.note || a.instructions || ''
  form.isActive = a.isActive !== false && a.enabled !== false
  form.sortOrder = Number(a.sortOrder) || 0
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
  if (!form.displayName.trim()) {
    err.value = '请填写展示名称'
    return
  }
  saving.value = true
  err.value = ''
  msg.value = ''
  try {
    const body = {
      ...form,
      method: form.paymentType,
      enabled: form.isActive,
      instructions: form.note
    }
    if (editingId.value) {
      await patchPaymentAccount(editingId.value, body)
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
  fillFromAccount(a)
}

async function toggle(a) {
  err.value = ''
  msg.value = ''
  try {
    const next = !(a.isActive !== false && a.enabled !== false)
    await patchPaymentAccount(a._id, { isActive: next, enabled: next })
    msg.value = '已更新'
    await load()
  } catch (e) {
    err.value = e.message || '操作失败'
  }
}

async function remove(a) {
  if (!confirm(`删除「${a.displayName || a.name}」？`)) return
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
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
