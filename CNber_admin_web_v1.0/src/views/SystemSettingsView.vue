<template>
  <div>
    <h2>系统设置</h2>
    <p class="muted">全平台配置中心；客户端、司机端、营销中心统一读取此处数据。</p>

    <p v-if="toast" class="toast">{{ toast }}</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="muted">加载中…</p>

    <div v-else class="tabs card">
      <div class="tab-head">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === t.id }"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- 平台信息 -->
      <section v-show="activeTab === 'platform'" class="tab-panel">
        <h3>平台信息</h3>
        <div class="grid">
          <label>平台名称<input v-model="form.platform.platformName" class="input" /></label>
          <label>公司名称<input v-model="form.platform.companyName" class="input" /></label>
          <label>公司地址<input v-model="form.platform.companyAddress" class="input" /></label>
          <label>公司邮箱<input v-model="form.platform.companyEmail" class="input" type="email" /></label>
          <label>公司电话<input v-model="form.platform.companyPhone" class="input" /></label>
        </div>
        <button
          v-if="canUpdate"
          type="button"
          class="btn btn-primary"
          :disabled="saving"
          @click="saveSection('platform')"
        >
          {{ saving ? '保存中…' : '保存平台信息' }}
        </button>
      </section>

      <!-- 客服联系方式 -->
      <section v-show="activeTab === 'support'" class="tab-panel">
        <h3>客服联系方式</h3>
        <div class="grid">
          <label>客服电话<input v-model="form.support.supportPhone" class="input" /></label>
          <label>客服微信<input v-model="form.support.supportWechat" class="input" /></label>
          <label>WhatsApp<input v-model="form.support.supportWhatsapp" class="input" placeholder="+44..." /></label>
          <label>Telegram（预留）<input v-model="form.support.supportTelegram" class="input" /></label>
          <label>客服邮箱<input v-model="form.support.supportEmail" class="input" type="email" /></label>
        </div>
        <button
          v-if="canUpdate"
          type="button"
          class="btn btn-primary"
          :disabled="saving"
          @click="saveSection('support')"
        >
          {{ saving ? '保存中…' : '保存客服联系方式' }}
        </button>
      </section>

      <!-- 公告 -->
      <section v-show="activeTab === 'announcement'" class="tab-panel">
        <h3>公告管理</h3>
        <p class="hint">首页公告，客户端与司机端首页可读取。</p>
        <textarea v-model="form.announcement" class="input ta" rows="5" placeholder="例如：暑期接送机优惠活动进行中" />
        <button
          v-if="canUpdate"
          type="button"
          class="btn btn-primary"
          :disabled="saving"
          @click="saveSection('announcement')"
        >
          {{ saving ? '保存中…' : '保存公告' }}
        </button>
      </section>

      <!-- 法律文档 -->
      <section v-show="activeTab === 'legal'" class="tab-panel">
        <h3>法律文档</h3>
        <label>用户协议</label>
        <textarea v-model="form.legal.termsOfService" class="input ta" rows="6" />
        <label>隐私政策</label>
        <textarea v-model="form.legal.privacyPolicy" class="input ta" rows="6" />
        <label>投诉处理政策</label>
        <textarea v-model="form.legal.complaintPolicy" class="input ta" rows="6" />
        <button
          v-if="canUpdate"
          type="button"
          class="btn btn-primary"
          :disabled="saving"
          @click="saveSection('legal')"
        >
          {{ saving ? '保存中…' : '保存法律文档' }}
        </button>
      </section>

      <!-- App 配置 -->
      <section v-show="activeTab === 'app'" class="tab-panel">
        <h3>App 配置</h3>
        <label>最低预约时间（小时）</label>
        <select v-model.number="form.app.minimumBookingHours" class="input" style="max-width: 200px">
          <option :value="12">12 小时</option>
          <option :value="24">24 小时（默认）</option>
          <option :value="48">48 小时</option>
        </select>
        <p class="hint">字段 minimum_booking_hours，影响客户端最早可预约时间。</p>
        <button
          v-if="canUpdate"
          type="button"
          class="btn btn-primary"
          :disabled="saving"
          @click="saveSection('app')"
        >
          {{ saving ? '保存中…' : '保存 App 配置' }}
        </button>
      </section>

      <!-- 营销配置 -->
      <section v-show="activeTab === 'marketing'" class="tab-panel">
        <h3>营销配置</h3>
        <label class="row-check">
          <input v-model="form.marketing.marketingEnabled" type="checkbox" />
          启用营销功能（marketing_enabled）
        </label>
        <p class="hint warn">
          关闭时：优惠券、活动推送、营销短信等全部禁用（本阶段仅配置开关，不接入发送通道）。
        </p>
        <button
          v-if="canUpdate"
          type="button"
          class="btn btn-primary"
          :disabled="saving"
          @click="saveSection('marketing')"
        >
          {{ saving ? '保存中…' : '保存营销配置' }}
        </button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchSystemConfig, updateSystemConfig } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const canUpdate = computed(() => auth.can('system_settings', 'update'))

const tabs = [
  { id: 'platform', label: '平台信息' },
  { id: 'support', label: '客服联系方式' },
  { id: 'announcement', label: '公告' },
  { id: 'legal', label: '法律文档' },
  { id: 'app', label: 'App 配置' },
  { id: 'marketing', label: '营销配置' }
]

const activeTab = ref('platform')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const toast = ref('')

const form = reactive({
  platform: {
    platformName: '',
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: ''
  },
  support: {
    supportPhone: '',
    supportWechat: '',
    supportWhatsapp: '',
    supportTelegram: '',
    supportEmail: ''
  },
  announcement: '',
  legal: {
    termsOfService: '',
    privacyPolicy: '',
    complaintPolicy: ''
  },
  app: {
    minimumBookingHours: 24
  },
  marketing: {
    marketingEnabled: false
  }
})

function applyData(data) {
  if (!data) return
  Object.assign(form.platform, data.platform || {})
  Object.assign(form.support, data.support || {})
  form.announcement = data.announcement || ''
  Object.assign(form.legal, data.legal || {})
  form.app.minimumBookingHours = data.app?.minimumBookingHours ?? 24
  form.marketing.marketingEnabled = Boolean(data.marketing?.marketingEnabled)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchSystemConfig()
    applyData(data)
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function payloadForSection(section) {
  if (section === 'platform') return { platform: { ...form.platform } }
  if (section === 'support') return { support: { ...form.support } }
  if (section === 'announcement') return { announcement: form.announcement }
  if (section === 'legal') return { legal: { ...form.legal } }
  if (section === 'app') return { app: { minimumBookingHours: form.app.minimumBookingHours } }
  if (section === 'marketing') return { marketing: { marketingEnabled: form.marketing.marketingEnabled } }
  return {}
}

async function saveSection(section) {
  saving.value = true
  toast.value = ''
  error.value = ''
  try {
    const data = await updateSystemConfig(payloadForSection(section))
    applyData(data)
    toast.value = '已保存'
  } catch (e) {
    error.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.tabs {
  padding: 0;
  overflow: hidden;
}
.tab-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}
.tab-btn {
  border: none;
  background: transparent;
  padding: 12px 16px;
  font-size: 14px;
  cursor: pointer;
  color: #6b7280;
  border-bottom: 2px solid transparent;
}
.tab-btn:hover {
  color: #111827;
  background: #f3f4f6;
}
.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  background: #fff;
  font-weight: 600;
}
.tab-panel {
  padding: 20px;
}
.tab-panel h3 {
  margin: 0 0 16px;
  font-size: 16px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
}
.ta {
  width: 100%;
  margin-bottom: 12px;
  resize: vertical;
}
.hint {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px;
}
.hint.warn {
  color: #b45309;
}
.row-check {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #374151;
}
</style>
