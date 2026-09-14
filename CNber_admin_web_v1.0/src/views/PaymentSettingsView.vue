<template>
  <div>
    <h2>支付设置</h2>
    <p class="muted">
      中国微信 / 支付宝人工转账收款码。后台更换后，已安装 Client 下次进入支付页自动显示最新二维码，无需重打包 App。支付模式默认「临时收款码」；微信/支付宝 App 支付待商户开通后再切换，未开通时不会产生真实扣款。
    </p>
    <p v-if="msg" class="toast">{{ msg }}</p>
    <p v-if="err" class="err">{{ err }}</p>

    <div class="grid">
      <section class="card">
        <h3>微信</h3>
        <label class="row">
          <input v-model="wechatEnabled" type="checkbox" />
          启用微信支付
        </label>
        <label class="mode-label">支付模式</label>
        <select v-model="wechatPaymentMode" class="input">
          <option value="manual_qr">临时收款码（当前）</option>
          <option value="wechat_app_pay">微信 App 支付（未开通）</option>
        </select>
        <p v-if="wechatPaymentMode !== 'manual_qr'" class="warn">
          微信 App 支付尚未开通，Client 不会完成真实扣款，请保持「临时收款码」。
        </p>
        <div class="preview-wrap">
          <img
            v-if="wechatPreview"
            :src="wechatPreview"
            class="qr-preview"
            alt="微信收款码"
          />
          <div v-else class="qr-empty">尚未上传微信收款码</div>
        </div>
        <label class="file-btn">
          上传 / 更换收款码
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onUpload('wechat', $event)" />
        </label>
        <p v-if="uploading === 'wechat'" class="muted">上传中…</p>
      </section>

      <section class="card">
        <h3>支付宝</h3>
        <label class="row">
          <input v-model="alipayEnabled" type="checkbox" />
          启用支付宝支付
        </label>
        <label class="mode-label">支付模式</label>
        <select v-model="alipayPaymentMode" class="input">
          <option value="manual_qr">临时收款码（当前）</option>
          <option value="alipay_app_pay">支付宝 App 支付（未开通）</option>
        </select>
        <p v-if="alipayPaymentMode !== 'manual_qr'" class="warn">
          支付宝 App 支付尚未开通，Client 不会完成真实扣款，请保持「临时收款码」。
        </p>
        <div class="preview-wrap">
          <img
            v-if="alipayPreview"
            :src="alipayPreview"
            class="qr-preview"
            alt="支付宝收款码"
          />
          <div v-else class="qr-empty">尚未上传支付宝收款码</div>
        </div>
        <label class="file-btn">
          上传 / 更换收款码
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onUpload('alipay', $event)" />
        </label>
        <p v-if="uploading === 'alipay'" class="muted">上传中…</p>
      </section>
    </div>

    <section class="card">
      <h3>付款说明</h3>
      <textarea
        v-model="paymentNotice"
        class="input ta"
        rows="4"
        placeholder="显示在 Client 支付页顶部，例如：请扫码转账并备注订单号"
      />
      <div class="actions">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存设置' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchPaymentConfig, putPaymentConfig, uploadPaymentQr } from '@/api/admin'

const err = ref('')
const msg = ref('')
const saving = ref(false)
const uploading = ref('')
const wechatEnabled = ref(true)
const alipayEnabled = ref(true)
const wechatPaymentMode = ref('manual_qr')
const alipayPaymentMode = ref('manual_qr')
const paymentNotice = ref('')
const wechatQrUrl = ref('')
const alipayQrUrl = ref('')
const previewTick = ref(0)

function assetSrc(rel) {
  const u = String(rel || '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) {
    try {
      return `${new URL(u).pathname}?t=${previewTick.value}`
    } catch {
      return u
    }
  }
  const path = u.startsWith('/') ? u : `/${u}`
  return `${path}?t=${previewTick.value}`
}

const wechatPreview = computed(() => assetSrc(wechatQrUrl.value))
const alipayPreview = computed(() => assetSrc(alipayQrUrl.value))

function applyConfig(data) {
  wechatEnabled.value = data?.wechat?.enabled !== false
  alipayEnabled.value = data?.alipay?.enabled !== false
  wechatPaymentMode.value = data?.wechat?.paymentMode || 'manual_qr'
  alipayPaymentMode.value = data?.alipay?.paymentMode || 'manual_qr'
  wechatQrUrl.value = data?.wechat?.qrUrl || ''
  alipayQrUrl.value = data?.alipay?.qrUrl || ''
  paymentNotice.value = data?.paymentNotice || ''
  previewTick.value = Date.now()
}

async function load() {
  err.value = ''
  try {
    const data = await fetchPaymentConfig()
    applyConfig(data)
  } catch (e) {
    err.value = e.message || '加载失败'
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

async function onUpload(type, ev) {
  const input = ev.target
  const file = input?.files && input.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    err.value = '图片过大（最大 2MB）'
    input.value = ''
    return
  }
  uploading.value = type
  err.value = ''
  msg.value = ''
  try {
    const imageBase64 = await readFileAsDataUrl(file)
    const data = await uploadPaymentQr(type, imageBase64)
    applyConfig(data)
    msg.value = type === 'alipay' ? '支付宝收款码已更新' : '微信收款码已更新'
  } catch (e) {
    err.value = e.message || '上传失败'
  } finally {
    uploading.value = ''
    if (input) input.value = ''
  }
}

async function save() {
  saving.value = true
  err.value = ''
  msg.value = ''
  try {
    const data = await putPaymentConfig({
      wechat: { enabled: wechatEnabled.value, paymentMode: wechatPaymentMode.value },
      alipay: { enabled: alipayEnabled.value, paymentMode: alipayPaymentMode.value },
      paymentNotice: paymentNotice.value
    })
    applyConfig(data)
    msg.value = '已保存，立即生效'
  } catch (e) {
    err.value = e.message || '保存失败'
  } finally {
    saving.value = false
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin: 16px 0;
}
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
}
.preview-wrap {
  margin: 12px 0;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
}
.qr-preview {
  width: 180px;
  height: 180px;
  object-fit: contain;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}
.qr-empty {
  color: #94a3b8;
  font-size: 13px;
}
label.row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.mode-label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  color: #64748b;
}
.warn {
  color: #b45309;
  font-size: 12px;
  margin: 8px 0 0;
}
.file-btn {
  display: inline-block;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}
.file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.ta {
  width: 100%;
  margin: 8px 0 12px;
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
  color: var(--danger, #dc2626);
  font-size: 13px;
}
</style>
