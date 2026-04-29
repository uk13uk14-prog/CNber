<template>
  <div>
    <h2>报价设置</h2>
    <p class="muted">配置最小可用报价规则，当前自动报价使用模拟 10 英里 / 30 分钟。</p>
    <p v-if="success" class="toast">{{ success }}</p>
    <p v-if="error" class="err">{{ error }}</p>

    <div class="card import-card">
      <div class="import-head">
        <strong>价格表导入（机场 + 邮编固定价）</strong>
        <div class="import-actions">
          <button type="button" class="btn" @click="fillMatrixCsvExample">填入 CSV 示例</button>
          <button type="button" class="btn" @click="fillMatrixTxtExample">填入 TXT 示例</button>
          <button type="button" class="btn" @click="fillMatrixJsonExample">填入 JSON 示例</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="matrixImporting"
            @click="submitMatrixImport"
          >
            导入价格表
          </button>
        </div>
      </div>
      <textarea
        v-model="matrixImportText"
        class="input import-textarea"
        placeholder="支持粘贴 CSV / TXT / JSON 价格表"
      />
      <p v-if="matrixImportError" class="err">{{ matrixImportError }}</p>
      <p v-if="matrixImportResult" class="muted">
        导入结果：新增 {{ matrixImportResult.created }}，更新 {{ matrixImportResult.updated }}，
        失败 {{ matrixImportResult.failed }}，总计 {{ matrixImportResult.total }}
      </p>
      <ul v-if="matrixImportErrors.length" class="error-list">
        <li v-for="item in matrixImportErrors" :key="item.index">
          第 {{ item.index + 1 }} 条：{{ item.message }}
        </li>
      </ul>
    </div>

    <div class="card import-card">
      <div class="import-head">
        <strong>导入报价</strong>
        <div class="import-actions">
          <button type="button" class="btn" @click="fillExample">填入示例</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="importing"
            @click="submitImport"
          >
            导入报价
          </button>
        </div>
      </div>
      <textarea
        v-model="importText"
        class="input import-textarea"
        placeholder="粘贴报价规则 JSON 数组"
      />
      <p v-if="ruleImportError" class="err">{{ ruleImportError }}</p>
      <p class="muted">同 serviceType 已存在时会更新，不存在时会创建。</p>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>服务类型</th>
            <th>起步价</th>
            <th>每英里</th>
            <th>每分钟</th>
            <th>机场附加费</th>
            <th>夜间附加费</th>
            <th>加价倍率</th>
            <th>启用</th>
            <th>备注</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in rules" :key="rule._id">
            <td>
              <strong>{{ rule.serviceType }}</strong>
            </td>
            <td><input v-model.number="rule.baseFare" class="input mini" type="number" min="0" /></td>
            <td><input v-model.number="rule.perMile" class="input mini" type="number" min="0" /></td>
            <td><input v-model.number="rule.perMinute" class="input mini" type="number" min="0" /></td>
            <td><input v-model.number="rule.airportSurcharge" class="input mini" type="number" min="0" /></td>
            <td><input v-model.number="rule.nightSurcharge" class="input mini" type="number" min="0" /></td>
            <td><input v-model.number="rule.serviceMultiplier" class="input mini" type="number" min="0" step="0.1" /></td>
            <td><input v-model="rule.enabled" type="checkbox" /></td>
            <td><input v-model="rule.note" class="input note" type="text" /></td>
            <td>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="savingId === rule._id"
                @click="save(rule)"
              >
                保存
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import {
  fetchPricingRules,
  importPriceMatrix,
  importPricingRules,
  updatePricingRule
} from '@/api/admin'

const rules = ref([])
const savingId = ref('')
const importing = ref(false)
const matrixImporting = ref(false)
const importText = ref('')
const matrixImportText = ref('')
const matrixImportResult = ref(null)
const matrixImportErrors = ref([])
const matrixImportError = ref('')
const ruleImportError = ref('')
const error = ref('')
const success = ref('')

const exampleRules = [
  {
    serviceType: 'pickup',
    baseFare: 35,
    perMile: 3,
    perMinute: 0.5,
    airportSurcharge: 15,
    nightSurcharge: 0,
    serviceMultiplier: 1,
    enabled: true,
    note: '接机报价'
  }
]

const matrixCsvExample = `airport,postcodePrefix,serviceType,price,note
LHR,SW1,pickup,65,希思罗到SW1接机
LHR,E14,pickup,72,希思罗到E14接机
LGW,SW1,dropoff,90,盖特威克送机`

const matrixTxtExample = `LHR SW1 pickup 65 希思罗到SW1接机
LHR E14 pickup 72 希思罗到E14接机
LGW SW1 dropoff 90 盖特威克送机`

const matrixJsonExample = [
  {
    airport: 'LHR',
    postcodePrefix: 'SW1',
    serviceType: 'pickup',
    price: 65,
    enabled: true,
    note: '希思罗到SW1接机'
  }
]

async function load() {
  error.value = ''
  try {
    const data = await fetchPricingRules()
    rules.value = data.rules || []
  } catch (e) {
    error.value = e.message || '加载报价规则失败'
    rules.value = []
  }
}

async function save(rule) {
  savingId.value = rule._id
  error.value = ''
  success.value = ''
  try {
    await updatePricingRule(rule._id, {
      baseFare: rule.baseFare,
      perMile: rule.perMile,
      perMinute: rule.perMinute,
      airportSurcharge: rule.airportSurcharge,
      nightSurcharge: rule.nightSurcharge,
      serviceMultiplier: rule.serviceMultiplier,
      enabled: rule.enabled,
      note: rule.note
    })
    success.value = '保存成功'
    await load()
  } catch (e) {
    error.value = e.message || '保存失败'
  } finally {
    savingId.value = ''
  }
}

function fillExample() {
  importText.value = JSON.stringify(exampleRules, null, 2)
}

function fillMatrixCsvExample() {
  matrixImportText.value = matrixCsvExample
}

function fillMatrixTxtExample() {
  matrixImportText.value = matrixTxtExample
}

function fillMatrixJsonExample() {
  matrixImportText.value = JSON.stringify(matrixJsonExample, null, 2)
}

async function submitMatrixImport() {
  matrixImportError.value = ''
  success.value = ''
  matrixImportResult.value = null
  matrixImportErrors.value = []
  if (!matrixImportText.value.trim()) {
    matrixImportError.value = '请先粘贴价格表内容'
    return
  }

  matrixImporting.value = true
  try {
    const data = await importPriceMatrix(matrixImportText.value)
    matrixImportResult.value = {
      created: data.created || 0,
      updated: data.updated || 0,
      failed: data.failed || 0,
      total: data.total || 0
    }
    matrixImportErrors.value = (data.errors || []).slice(0, 5)
    success.value = '价格表导入完成'
  } catch (e) {
    matrixImportError.value = e.message || '价格表导入失败'
  } finally {
    matrixImporting.value = false
  }
}

async function submitImport() {
  ruleImportError.value = ''
  success.value = ''
  let parsed
  try {
    parsed = JSON.parse(importText.value)
  } catch (e) {
    ruleImportError.value = 'JSON 格式不正确'
    return
  }
  if (!Array.isArray(parsed)) {
    ruleImportError.value = '导入内容必须是 JSON 数组'
    return
  }

  importing.value = true
  try {
    const data = await importPricingRules(parsed)
    const failedCount = Array.isArray(data.failed) ? data.failed.length : 0
    success.value = `导入完成：新增 ${data.created || 0}，更新 ${data.updated || 0}，失败 ${failedCount}`
    await load()
  } catch (e) {
    ruleImportError.value = e.message || '导入失败'
  } finally {
    importing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
h2 {
  margin: 0 0 8px;
}
.mini {
  max-width: 90px;
}
.note {
  min-width: 180px;
}
.import-card {
  margin: 16px 0;
  padding: 16px;
}
.import-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.import-textarea {
  width: 100%;
  min-height: 160px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  resize: vertical;
}
.toast {
  display: inline-block;
  margin: 12px 0;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: #dcfce7;
  color: #166534;
  font-size: 13px;
}
.err {
  color: var(--danger);
  font-size: 13px;
}
.error-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--danger);
  font-size: 13px;
}
</style>
