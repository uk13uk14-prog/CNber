<template>
  <div>
    <h2>{{ U.title }}</h2>
    <p class="muted">{{ U.intro }}</p>
    <p v-if="success" class="toast">{{ success }}</p>
    <p v-if="error" class="err">{{ error }}</p>

    <div class="card import-card exchange-card">
      <div class="import-head">
        <strong>英镑兑人民币汇率</strong>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="rateSaving"
          @click="saveExchangeRate"
        >
          保存汇率
        </button>
      </div>
      <div class="exchange-row">
        <label class="exchange-label" for="gbp-cny-rate">1 GBP =</label>
        <input
          id="gbp-cny-rate"
          v-model="exchangeRateInput"
          class="input exchange-input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="10.00"
        />
        <span class="exchange-suffix">CNY</span>
      </div>
      <p class="muted">V1 固定报价：客户价 CNY、司机结算 GBP；司机人民币结算 = 司机价 × 汇率；平台利润 = 客户价 − 司机人民币结算。</p>
      <p v-if="rateError" class="err">{{ rateError }}</p>
    </div>

    <div class="card import-card">
      <div class="import-head">
        <strong>服务类型管理</strong>
        <button type="button" class="btn btn-primary" @click="openServiceTypeForm()">新增服务类型</button>
      </div>
      <div class="table-wrap">
        <table class="data fixed-table">
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>排序</th>
              <th>启用</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in serviceTypeConfigs" :key="row._id">
              <td><code>{{ row.code }}</code></td>
              <td><input v-model="row.label" class="input note" type="text" /></td>
              <td><input v-model.number="row.sortOrder" class="input mini" type="number" /></td>
              <td><input v-model="row.enabled" type="checkbox" /></td>
              <td><input v-model="row.remark" class="input note" type="text" /></td>
              <td>
                <button
                  type="button"
                  class="btn btn-primary small"
                  :disabled="svcSavingId === row._id"
                  @click="saveServiceType(row)"
                >
                  保存
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="svcConfigError" class="err">{{ svcConfigError }}</p>
    </div>

    <div class="card import-card">
      <div class="import-head">
        <strong>车型管理</strong>
        <button type="button" class="btn btn-primary" @click="openVehicleForm()">新增车型</button>
      </div>
      <div class="table-wrap">
        <table class="data fixed-table">
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>座位</th>
              <th>排序</th>
              <th>启用</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in vehicleClassConfigs" :key="row._id">
              <td><code>{{ row.code }}</code></td>
              <td><input v-model="row.label" class="input note" type="text" /></td>
              <td><input v-model.number="row.seats" class="input mini" type="number" min="1" /></td>
              <td><input v-model.number="row.sortOrder" class="input mini" type="number" /></td>
              <td><input v-model="row.enabled" type="checkbox" /></td>
              <td><input v-model="row.remark" class="input note" type="text" /></td>
              <td>
                <button
                  type="button"
                  class="btn btn-primary small"
                  :disabled="vehSavingId === row._id"
                  @click="saveVehicleClass(row)"
                >
                  保存
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="vehConfigError" class="err">{{ vehConfigError }}</p>
    </div>

    <div class="card import-card">
      <div class="import-head">
        <strong>V1 固定报价</strong>
        <span class="muted">汇率 1 GBP = ¥{{ exchangeRateInput }}</span>
      </div>
      <div class="table-wrap">
        <table class="data fixed-table">
          <thead>
            <tr>
              <th>服务类型</th>
              <th>客户价 CNY</th>
              <th>司机价 GBP</th>
              <th>司机人民币结算 CNY</th>
              <th>平台利润 CNY</th>
              <th>启用</th>
              <th>备注</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in fixedRules" :key="rule.serviceType">
              <td>{{ rule.serviceLabel || serviceTypeLabel(rule.serviceType) }}</td>
              <td>
                <input v-model.number="rule.customerPriceCny" class="input mini" type="number" min="0" step="1" />
              </td>
              <td>
                <input v-model.number="rule.driverPriceGbp" class="input mini" type="number" min="0" step="0.01" />
              </td>
              <td class="calc-cell">{{ formatCny(calcFixedRow(rule).driverSettlementCny) }}</td>
              <td class="calc-cell">{{ formatCny(calcFixedRow(rule).platformProfitCny) }}</td>
              <td><input v-model="rule.enabled" type="checkbox" /></td>
              <td><input v-model="rule.remark" class="input note" type="text" /></td>
              <td>
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="fixedSavingId === rule.serviceType"
                  @click="saveFixed(rule)"
                >
                  保存
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="fixedError" class="err">{{ fixedError }}</p>
    </div>

    <div class="card import-card">
      <div class="import-head">
        <strong>路线固定报价</strong>
        <div class="import-actions">
          <button type="button" class="btn" @click="fillRouteExamples">填入示例</button>
          <button type="button" class="btn btn-primary" @click="openRouteForm()">新增路线报价</button>
        </div>
      </div>
      <div class="route-filters">
        <select v-model="routeFilters.serviceType" class="input">
          <option value="">全部服务</option>
          <option v-for="o in serviceTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-model="routeFilters.vehicleClass" class="input">
          <option value="">全部车型</option>
          <option v-for="v in vehicleOptions" :key="v.class" :value="v.class">{{ v.label }}</option>
        </select>
        <input v-model="routeFilters.search" class="input" placeholder="搜索起点/终点" />
        <button type="button" class="btn" @click="loadRoutes">查询</button>
      </div>
      <div class="table-wrap">
        <table class="data fixed-table">
          <thead>
            <tr>
              <th>服务</th>
              <th>起点</th>
              <th>终点</th>
              <th>车型</th>
              <th>客户价 CNY</th>
              <th>司机价 GBP</th>
              <th>司机结算 CNY</th>
              <th>平台利润 CNY</th>
              <th>启用</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in routeRules" :key="r._id || `route-${idx}`">
              <td>{{ serviceTypeLabel(r?.serviceType) }}</td>
              <td>{{ r?.fromLabel || '—' }}</td>
              <td>{{ r?.toLabel || '—' }}</td>
              <td>{{ r?.vehicleLabel || vehicleLabelOf(r?.vehicleClass) }}</td>
              <td>{{ formatCny(r?.customerPriceCny) }}</td>
              <td>{{ formatGbp(r?.driverPriceGbp) }}</td>
              <td class="calc-cell">{{ formatCny(r?.driverSettlementCny) }}</td>
              <td class="calc-cell">{{ formatCny(r?.platformProfitCny) }}</td>
              <td>{{ r?.enabled !== false ? '是' : '否' }}</td>
              <td>{{ r?.remark || '—' }}</td>
              <td class="route-ops">
                <button type="button" class="btn small" @click="openRouteForm(r)">编辑</button>
                <button
                  type="button"
                  class="btn small"
                  @click="toggleRouteEnabled(r)"
                >
                  {{ r.enabled ? '禁用' : '启用' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="routeError" class="err">{{ routeError }}</p>
    </div>

    <div v-if="serviceTypeFormVisible" class="modal-mask">
      <div class="modal-card route-form-card">
        <h3>新增服务类型</h3>
        <label class="field-label">服务代码</label>
        <input v-model="serviceTypeForm.code" class="input" placeholder="例如 tour_custom" />
        <label class="field-label">服务名称</label>
        <input v-model="serviceTypeForm.label" class="input" placeholder="例如 旅游定制" />
        <label class="field-label">排序</label>
        <input v-model.number="serviceTypeForm.sortOrder" class="input" type="number" />
        <label class="field-label">备注</label>
        <input v-model="serviceTypeForm.remark" class="input" />
        <p v-if="serviceTypeFormError" class="err">{{ serviceTypeFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="closeServiceTypeForm">取消</button>
          <button type="button" class="btn btn-primary" :disabled="svcFormSaving" @click="submitServiceTypeForm">
            {{ svcFormSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="vehicleFormVisible" class="modal-mask">
      <div class="modal-card route-form-card">
        <h3>新增车型</h3>
        <label class="field-label">车型代码</label>
        <input v-model="vehicleForm.code" class="input" placeholder="例如 vclass_luxury" />
        <label class="field-label">车型名称</label>
        <input v-model="vehicleForm.label" class="input" placeholder="例如 奔驰 V Class" />
        <label class="field-label">座位数</label>
        <input v-model.number="vehicleForm.seats" class="input" type="number" min="1" />
        <label class="field-label">排序</label>
        <input v-model.number="vehicleForm.sortOrder" class="input" type="number" />
        <label class="field-label">备注</label>
        <input v-model="vehicleForm.remark" class="input" />
        <p v-if="vehicleFormError" class="err">{{ vehicleFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="closeVehicleForm">取消</button>
          <button type="button" class="btn btn-primary" :disabled="vehFormSaving" @click="submitVehicleForm">
            {{ vehFormSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="routeFormVisible" class="modal-mask">
      <div class="modal-card route-form-card">
        <h3>{{ routeForm._id ? '编辑路线报价' : '新增路线报价' }}</h3>
        <label class="field-label">服务类型</label>
        <select v-model="routeForm.serviceType" class="input">
          <option v-for="o in serviceTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <label class="field-label">起点</label>
        <input v-model="routeForm.fromLabel" class="input" placeholder="例如 London" />
        <label class="field-label">终点</label>
        <input v-model="routeForm.toLabel" class="input" placeholder="例如 Birmingham" />
        <label class="field-label">车型等级</label>
        <select v-model="routeForm.vehicleClass" class="input">
          <option v-for="v in vehicleOptions" :key="v.class" :value="v.class">{{ v.label }}</option>
        </select>
        <label class="field-label">客户价 CNY</label>
        <input v-model.number="routeForm.customerPriceCny" class="input" type="number" min="0" />
        <label class="field-label">司机价 GBP</label>
        <input v-model.number="routeForm.driverPriceGbp" class="input" type="number" min="0" step="0.01" />
        <label class="field-label">备注</label>
        <input v-model="routeForm.remark" class="input" />
        <p v-if="routeFormError" class="err">{{ routeFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="closeRouteForm">取消</button>
          <button type="button" class="btn btn-primary" :disabled="routeSaving" @click="saveRouteForm">
            {{ routeSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <details class="legacy-section card">
      <summary>旧版计价规则（V1 已停用，仅兼容保留）</summary>

    <div class="card import-card legacy-inner">
      <div class="import-head">
        <strong>{{ U.matrixHead }}</strong>
        <div class="import-actions">
          <button type="button" class="btn" @click="fillMatrixCsvExample">{{ U.btnCsv }}</button>
          <button type="button" class="btn" @click="fillMatrixTxtExample">{{ U.btnTxt }}</button>
          <button type="button" class="btn" @click="fillMatrixJsonExample">{{ U.btnJson }}</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="matrixImporting"
            @click="submitMatrixImport"
          >
            {{ U.btnImportMatrix }}
          </button>
        </div>
      </div>
      <textarea
        v-model="matrixImportText"
        class="input import-textarea"
        :placeholder="U.phMatrix"
      />
      <p v-if="matrixImportError" class="err">{{ matrixImportError }}</p>
      <p v-if="matrixImportResult" class="muted">
        {{ U.mr1 }}{{ matrixImportResult.created }}{{ U.mr2 }}{{ matrixImportResult.updated }}{{ U.mr3
        }}{{ matrixImportResult.failed }}{{ U.mr4 }}{{ matrixImportResult.total }}
      </p>
      <ul v-if="matrixImportErrors.length" class="error-list">
        <li v-for="item in matrixImportErrors" :key="item.index">
          {{ U.row1 }}{{ item.index + 1 }}{{ U.row2 }}{{ item.message }}
        </li>
      </ul>
    </div>

    <div class="card import-card">
      <div class="import-head">
        <strong>{{ U.ruleHead }}</strong>
        <div class="import-actions">
          <button type="button" class="btn" @click="fillExample">{{ U.btnFillEx }}</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="importing"
            @click="submitImport"
          >
            {{ U.btnImportRules }}
          </button>
        </div>
      </div>
      <textarea
        v-model="importText"
        class="input import-textarea"
        :placeholder="U.phRules"
      />
      <p v-if="ruleImportError" class="err">{{ ruleImportError }}</p>
      <p class="muted">{{ U.hintImport }}</p>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>{{ U.thSvc }}</th>
            <th>{{ U.thBase }}</th>
            <th>{{ U.thMile }}</th>
            <th>{{ U.thMin }}</th>
            <th>{{ U.thAir }}</th>
            <th>{{ U.thNight }}</th>
            <th>{{ U.thMul }}</th>
            <th>{{ U.thEn }}</th>
            <th>{{ U.thNote }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in rules" :key="rule._id">
            <td class="service-type-cell">
              {{ serviceTypeLabel(rule.serviceType) }}

              <select v-model="rule.serviceType">
                <option value="ride">&#x666e;&#x901a;&#x7528;&#x8f66;</option>
                <option value="pickup">&#x63a5;&#x673a;</option>
                <option value="dropoff">&#x9001;&#x673a;</option>
                <option value="charter">&#x5305;&#x8f66;</option>
                <option value="point">&#x70b9;&#x5bf9;&#x70b9;</option>
              </select>
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
                {{ U.btnSave }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </details>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import {
  fetchPricingRules,
  fetchExchangeRate,
  fetchFixedPricing,
  fetchRoutePricing,
  createRoutePricing,
  updateRoutePricing,
  patchRoutePricing,
  fetchServiceTypeConfigs,
  createServiceTypeConfig,
  updateServiceTypeConfig,
  fetchVehicleClassConfigs,
  createVehicleClassConfig,
  updateVehicleClassConfig,
  importPriceMatrix,
  importPricingRules,
  updateExchangeRate,
  updateFixedPricing,
  updatePricingRule
} from '@/api/admin'
import { serviceTypeLabel as staticServiceTypeLabel } from '@/utils/serviceType'
import { formatCny, formatGbp } from '@/utils/currencyDisplay'

function c(...pts) {
  return String.fromCodePoint(...pts)
}

const U = Object.freeze({
  title: c(0x62a5, 0x4ef7, 0x8bbe, 0x7f6e),
  intro: c(
    0x914d, 0x7f6e, 0x6700, 0x5c0f, 0x53ef, 0x7528, 0x62a5, 0x4ef7, 0x89c4, 0x5219, 0xff0c, 0x5f53, 0x524d, 0x81ea,
    0x52a8, 0x62a5, 0x4ef7, 0x4f7f, 0x7528, 0x6a21, 0x62df, 0x20, 0x31, 0x30, 0x20, 0x82f1, 0x91cc, 0x20, 0x2f, 0x20,
    0x33, 0x30, 0x20, 0x5206, 0x949f, 0x3002
  ),
  matrixHead: c(
    0x4ef7, 0x683c, 0x8868, 0x5bfc, 0x5165, 0xff08, 0x673a, 0x573a, 0x20, 0x2b, 0x20, 0x90ae, 0x7f16, 0x56fa, 0x5b9a,
    0x4ef7, 0xff09
  ),
  btnCsv: c(0x586b, 0x5165, 0x20, 0x43, 0x53, 0x56, 0x20, 0x793a, 0x4f8b),
  btnTxt: c(0x586b, 0x5165, 0x20, 0x54, 0x58, 0x54, 0x20, 0x793a, 0x4f8b),
  btnJson: c(0x586b, 0x5165, 0x20, 0x4a, 0x53, 0x4f, 0x4e, 0x20, 0x793a, 0x4f8b),
  btnImportMatrix: c(0x5bfc, 0x5165, 0x4ef7, 0x683c, 0x8868),
  phMatrix: c(
    0x652f, 0x6301, 0x7c98, 0x8d34, 0x20, 0x43, 0x53, 0x56, 0x20, 0x2f, 0x20, 0x54, 0x58, 0x54, 0x20, 0x2f, 0x20, 0x4a,
    0x53, 0x4f, 0x4e, 0x20, 0x4ef7, 0x683c, 0x8868
  ),
  mr1: c(0x5bfc, 0x5165, 0x7ed3, 0x679c, 0xff1a, 0x65b0, 0x589e, 0x20),
  mr2: c(0xff0c, 0x66f4, 0x65b0, 0x20),
  mr3: c(0xff0c, 0x5931, 0x8d25, 0x20),
  mr4: c(0xff0c, 0x603b, 0x8ba1, 0x20),
  row1: c(0x7b2c, 0x20),
  row2: c(0x20, 0x6761, 0xff1a),
  ruleHead: c(0x5bfc, 0x5165, 0x62a5, 0x4ef7),
  btnFillEx: c(0x586b, 0x5165, 0x793a, 0x4f8b),
  btnImportRules: c(0x5bfc, 0x5165, 0x62a5, 0x4ef7),
  phRules: c(0x7c98, 0x8d34, 0x62a5, 0x4ef7, 0x89c4, 0x5219, 0x20, 0x4a, 0x53, 0x4f, 0x4e, 0x20, 0x6570, 0x7ec4),
  hintImport: c(
    0x82e5, 0x5bfc, 0x5165, 0x89c4, 0x5219, 0x7684, 0x670d, 0x52a1, 0x7c7b, 0x578b, 0x4e0e, 0x5df2, 0x6709, 0x8bb0,
    0x5f55, 0x76f8, 0x540c, 0x5219, 0x66f4, 0x65b0, 0xff0c, 0x5426, 0x5219, 0x65b0, 0x589e, 0x3002
  ),
  thSvc: c(0x670d, 0x52a1, 0x7c7b, 0x578b),
  thBase: c(0x8d77, 0x6b65, 0x4ef7),
  thMile: c(0x6bcf, 0x82f1, 0x91cc),
  thMin: c(0x6bcf, 0x5206, 0x949f),
  thAir: c(0x673a, 0x573a, 0x9644, 0x52a0, 0x8d39),
  thNight: c(0x591c, 0x95f4, 0x9644, 0x52a0, 0x8d39),
  thMul: c(0x52a0, 0x4ef7, 0x500d, 0x7387),
  thEn: c(0x542f, 0x7528),
  thNote: c(0x5907, 0x6ce8),
  btnSave: c(0x4fdd, 0x5b58),
  noteEx: c(0x63a5, 0x673a, 0x62a5, 0x4ef7),
  csvN1: c(0x5e0c, 0x601d, 0x7f57, 0x5230, 0x53, 0x57, 0x31, 0x63a5, 0x673a),
  csvN2: c(0x5e0c, 0x601d, 0x7f57, 0x5230, 0x45, 0x31, 0x34, 0x63a5, 0x673a),
  csvN3: c(0x76d6, 0x7279, 0x5a01, 0x514b, 0x9001, 0x673a),
  loadFail: c(0x52a0, 0x8f7d, 0x62a5, 0x4ef7, 0x89c4, 0x5219, 0x5931, 0x8d25),
  saveOk: c(0x4fdd, 0x5b58, 0x6210, 0x529f),
  saveFail: c(0x4fdd, 0x5b58, 0x5931, 0x8d25),
  matrixEmpty: c(0x8bf7, 0x5148, 0x7c98, 0x8d34, 0x4ef7, 0x683c, 0x8868, 0x5185, 0x5bb9),
  matrixOk: c(0x4ef7, 0x683c, 0x8868, 0x5bfc, 0x5165, 0x5b8c, 0x6210),
  matrixFail: c(0x4ef7, 0x683c, 0x8868, 0x5bfc, 0x5165, 0x5931, 0x8d25),
  jsonBad: c(0x4a, 0x53, 0x4f, 0x4e, 0x20, 0x683c, 0x5f0f, 0x4e0d, 0x6b63, 0x786e),
  importMustArr: c(0x5bfc, 0x5165, 0x5185, 0x5bb9, 0x5fc5, 0x987b, 0x662f, 0x20, 0x4a, 0x53, 0x4f, 0x4e, 0x20, 0x6570, 0x7ec4),
  id1: c(0x5bfc, 0x5165, 0x5b8c, 0x6210, 0xff1a, 0x65b0, 0x589e, 0x20),
  id2: c(0xff0c, 0x66f4, 0x65b0, 0x20),
  id3: c(0xff0c, 0x5931, 0x8d25, 0x20),
  importFail: c(0x5bfc, 0x5165, 0x5931, 0x8d25),
  jsonNote: c(0x5e0c, 0x601d, 0x7f57, 0x5230, 0x53, 0x57, 0x31, 0x63a5, 0x673a)
})

const STD_SERVICE_TYPES = ['ride', 'pickup', 'dropoff', 'charter', 'point']

function coerceStandardServiceType(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return 'ride'
  const low = s.toLowerCase()
  return STD_SERVICE_TYPES.includes(low) ? low : s
}

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
const exchangeRateInput = ref('10.00')
const rateSaving = ref(false)
const rateError = ref('')
const fixedRules = ref([])
const fixedSavingId = ref('')
const fixedError = ref('')
const routeRules = ref([])
const routeError = ref('')
const routeSaving = ref(false)
const routeFormVisible = ref(false)
const routeFormError = ref('')
const serviceTypeConfigs = ref([])
const vehicleClassConfigs = ref([])
const svcConfigError = ref('')
const vehConfigError = ref('')
const svcSavingId = ref('')
const vehSavingId = ref('')
const serviceTypeFormVisible = ref(false)
const vehicleFormVisible = ref(false)
const serviceTypeFormError = ref('')
const vehicleFormError = ref('')
const svcFormSaving = ref(false)
const vehFormSaving = ref(false)
const serviceTypeForm = reactive({
  code: '',
  label: '',
  sortOrder: 100,
  remark: '',
  enabled: true
})
const vehicleForm = reactive({
  code: '',
  label: '',
  seats: null,
  sortOrder: 100,
  remark: '',
  enabled: true
})
const routeFilters = reactive({ serviceType: '', vehicleClass: '', search: '' })
const routeForm = reactive({
  _id: '',
  serviceType: 'point',
  fromLabel: '',
  toLabel: '',
  vehicleClass: 'standard_5',
  customerPriceCny: 900,
  driverPriceGbp: 80,
  remark: '',
  enabled: true
})

const serviceTypeOptions = computed(() =>
  serviceTypeConfigs.value
    .filter((s) => s.enabled !== false)
    .map((s) => ({ value: s.code, label: s.label }))
)

const vehicleOptions = computed(() =>
  vehicleClassConfigs.value
    .filter((v) => v.enabled !== false)
    .map((v) => ({ class: v.code, label: v.label }))
)

function serviceTypeLabel(code) {
  const row = serviceTypeConfigs.value.find((s) => s.code === code)
  return row?.label || staticServiceTypeLabel(code)
}

function vehicleLabelOf(code) {
  const row = vehicleClassConfigs.value.find((v) => v.code === code)
  return row?.label || code || '—'
}

function calcFixedRow(rule) {
  const rate = Number(exchangeRateInput.value) || 10
  const customerPriceCny = Number(rule.customerPriceCny) || 0
  const driverPriceGbp = Number(rule.driverPriceGbp) || 0
  const driverSettlementCny = Math.round(driverPriceGbp * rate * 100) / 100
  const platformProfitCny = Math.round((customerPriceCny - driverSettlementCny) * 100) / 100
  return { driverSettlementCny, platformProfitCny }
}

async function loadServiceTypes() {
  svcConfigError.value = ''
  try {
    const data = await fetchServiceTypeConfigs()
    serviceTypeConfigs.value = Array.isArray(data?.items)
      ? data.items.map((r) => ({ ...r }))
      : []
  } catch (e) {
    svcConfigError.value = e.message || '加载服务类型失败'
    serviceTypeConfigs.value = []
  }
}

async function loadVehicleClasses() {
  vehConfigError.value = ''
  try {
    const data = await fetchVehicleClassConfigs()
    vehicleClassConfigs.value = Array.isArray(data?.items)
      ? data.items.map((r) => ({ ...r }))
      : []
  } catch (e) {
    vehConfigError.value = e.message || '加载车型失败'
    vehicleClassConfigs.value = []
  }
}

function openServiceTypeForm() {
  serviceTypeFormError.value = ''
  Object.assign(serviceTypeForm, {
    code: '',
    label: '',
    sortOrder: 100,
    remark: '',
    enabled: true
  })
  serviceTypeFormVisible.value = true
}

function closeServiceTypeForm() {
  serviceTypeFormVisible.value = false
  serviceTypeFormError.value = ''
}

async function submitServiceTypeForm() {
  svcFormSaving.value = true
  serviceTypeFormError.value = ''
  try {
    await createServiceTypeConfig({
      code: serviceTypeForm.code,
      label: serviceTypeForm.label,
      sortOrder: Number(serviceTypeForm.sortOrder),
      remark: serviceTypeForm.remark,
      enabled: true
    })
    success.value = '服务类型已新增'
    closeServiceTypeForm()
    await loadServiceTypes()
    await loadFixed()
  } catch (e) {
    serviceTypeFormError.value = e.message || '新增失败'
  } finally {
    svcFormSaving.value = false
  }
}

async function saveServiceType(row) {
  svcSavingId.value = row._id
  svcConfigError.value = ''
  try {
    await updateServiceTypeConfig(row._id, {
      label: row.label,
      sortOrder: Number(row.sortOrder),
      enabled: row.enabled !== false,
      remark: row.remark || ''
    })
    success.value = `${row.code} 已保存`
    await loadServiceTypes()
    await loadFixed()
  } catch (e) {
    svcConfigError.value = e.message || '保存失败'
  } finally {
    svcSavingId.value = ''
  }
}

function openVehicleForm() {
  vehicleFormError.value = ''
  Object.assign(vehicleForm, {
    code: '',
    label: '',
    seats: null,
    sortOrder: 100,
    remark: '',
    enabled: true
  })
  vehicleFormVisible.value = true
}

function closeVehicleForm() {
  vehicleFormVisible.value = false
  vehicleFormError.value = ''
}

async function submitVehicleForm() {
  vehFormSaving.value = true
  vehicleFormError.value = ''
  try {
    await createVehicleClassConfig({
      code: vehicleForm.code,
      label: vehicleForm.label,
      seats: vehicleForm.seats,
      sortOrder: Number(vehicleForm.sortOrder),
      remark: vehicleForm.remark,
      enabled: true
    })
    success.value = '车型已新增'
    closeVehicleForm()
    await loadVehicleClasses()
  } catch (e) {
    vehicleFormError.value = e.message || '新增失败'
  } finally {
    vehFormSaving.value = false
  }
}

async function saveVehicleClass(row) {
  vehSavingId.value = row._id
  vehConfigError.value = ''
  try {
    await updateVehicleClassConfig(row._id, {
      label: row.label,
      seats: row.seats,
      sortOrder: Number(row.sortOrder),
      enabled: row.enabled !== false,
      remark: row.remark || ''
    })
    success.value = `${row.code} 已保存`
    await loadVehicleClasses()
  } catch (e) {
    vehConfigError.value = e.message || '保存失败'
  } finally {
    vehSavingId.value = ''
  }
}

async function loadRoutes() {
  routeError.value = ''
  try {
    const data = await fetchRoutePricing({
      serviceType: routeFilters.serviceType || undefined,
      vehicleClass: routeFilters.vehicleClass || undefined,
      search: routeFilters.search || undefined
    })
    routeRules.value = Array.isArray(data?.rules) ? data.rules : []
  } catch (e) {
    routeError.value = e.message || '加载路线报价失败'
    routeRules.value = []
  }
}

function openRouteForm(row) {
  routeFormError.value = ''
  if (row) {
    Object.assign(routeForm, {
      _id: row._id,
      serviceType: row.serviceType,
      fromLabel: row.fromLabel,
      toLabel: row.toLabel,
      vehicleClass: row.vehicleClass,
      customerPriceCny: row.customerPriceCny,
      driverPriceGbp: row.driverPriceGbp,
      remark: row.remark || '',
      enabled: row.enabled !== false
    })
  } else {
    Object.assign(routeForm, {
      _id: '',
      serviceType: 'point',
      fromLabel: '',
      toLabel: '',
      vehicleClass: 'standard_5',
      customerPriceCny: 900,
      driverPriceGbp: 80,
      remark: '',
      enabled: true
    })
  }
  routeFormVisible.value = true
}

function closeRouteForm() {
  routeFormVisible.value = false
  routeFormError.value = ''
}

async function saveRouteForm() {
  routeSaving.value = true
  routeFormError.value = ''
  try {
    const payload = {
      serviceType: routeForm.serviceType,
      fromLabel: routeForm.fromLabel,
      toLabel: routeForm.toLabel,
      vehicleClass: routeForm.vehicleClass,
      customerPriceCny: Number(routeForm.customerPriceCny),
      driverPriceGbp: Number(routeForm.driverPriceGbp),
      remark: routeForm.remark,
      enabled: routeForm.enabled
    }
    if (routeForm._id) {
      await updateRoutePricing(routeForm._id, payload)
    } else {
      await createRoutePricing(payload)
    }
    success.value = '路线报价已保存'
    closeRouteForm()
    await loadRoutes()
  } catch (e) {
    routeFormError.value = e.message || '保存失败'
  } finally {
    routeSaving.value = false
  }
}

async function toggleRouteEnabled(row) {
  try {
    await patchRoutePricing(row._id, { enabled: !row.enabled })
    await loadRoutes()
  } catch (e) {
    routeError.value = e.message || '操作失败'
  }
}

function fillRouteExamples() {
  openRouteForm({
    serviceType: 'point',
    fromLabel: 'London',
    toLabel: 'Birmingham',
    vehicleClass: 'standard_5',
    customerPriceCny: 1600,
    driverPriceGbp: 120,
    remark: '示例路线'
  })
}

async function loadFixed() {
  fixedError.value = ''
  try {
    const data = await fetchFixedPricing()
    fixedRules.value = Array.isArray(data?.rules) ? data.rules.map((r) => ({ ...r })) : []
    if (data?.exchangeRate != null) {
      exchangeRateInput.value = Number(data.exchangeRate).toFixed(2)
    }
  } catch (e) {
    fixedError.value = e.message || '加载固定报价失败'
    fixedRules.value = []
  }
}

async function saveFixed(rule) {
  fixedSavingId.value = rule.serviceType
  fixedError.value = ''
  success.value = ''
  try {
    await updateFixedPricing(rule.serviceType, {
      customerPriceCny: Number(rule.customerPriceCny),
      driverPriceGbp: Number(rule.driverPriceGbp),
      enabled: rule.enabled !== false,
      remark: rule.remark || ''
    })
    success.value = `${serviceTypeLabel(rule.serviceType)} 固定报价已保存`
    await loadFixed()
  } catch (e) {
    fixedError.value = e.message || '保存固定报价失败'
  } finally {
    fixedSavingId.value = ''
  }
}

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
    note: U.noteEx
  }
]

const matrixCsvExample = [
  'airport,postcodePrefix,serviceType,price,note',
  ['LHR', 'SW1', 'pickup', '65', U.csvN1].join(','),
  ['LHR', 'E14', 'pickup', '72', U.csvN2].join(','),
  ['LGW', 'SW1', 'dropoff', '90', U.csvN3].join(',')
].join('\n')

const matrixTxtExample = [
  ['LHR', 'SW1', 'pickup', '65', U.csvN1].join(' '),
  ['LHR', 'E14', 'pickup', '72', U.csvN2].join(' '),
  ['LGW', 'SW1', 'dropoff', '90', U.csvN3].join(' ')
].join('\n')

const matrixJsonExample = [
  {
    airport: 'LHR',
    postcodePrefix: 'SW1',
    serviceType: 'pickup',
    price: 65,
    enabled: true,
    note: U.jsonNote
  }
]

async function loadExchangeRate() {
  rateError.value = ''
  try {
    const data = await fetchExchangeRate()
    const rate = data?.rate ?? data?.value ?? 10
    exchangeRateInput.value = Number(rate).toFixed(2)
  } catch (e) {
    rateError.value = e.message || '加载汇率失败'
    if (!exchangeRateInput.value) exchangeRateInput.value = '10.00'
  }
}

async function saveExchangeRate() {
  rateSaving.value = true
  rateError.value = ''
  success.value = ''
  try {
    const rate = Number(exchangeRateInput.value)
    if (!Number.isFinite(rate) || rate <= 0) {
      rateError.value = '请输入正数汇率'
      return
    }
    const data = await updateExchangeRate(rate)
    const saved = data?.rate ?? data?.value ?? rate
    exchangeRateInput.value = Number(saved).toFixed(2)
    success.value = `汇率已保存：1 GBP = ¥${exchangeRateInput.value}`
    await loadFixed()
  } catch (e) {
    rateError.value = e.message || '保存汇率失败'
  } finally {
    rateSaving.value = false
  }
}

async function load() {
  error.value = ''
  try {
    const data = await fetchPricingRules()
    rules.value = (data.rules || []).map((r) => ({
      ...r,
      serviceType: coerceStandardServiceType(r.serviceType)
    }))
  } catch (e) {
    error.value = e.message || U.loadFail
    rules.value = []
  }
}

async function save(rule) {
  savingId.value = rule._id
  error.value = ''
  success.value = ''
  try {
    await updatePricingRule(rule._id, {
      serviceType: rule.serviceType,
      baseFare: rule.baseFare,
      perMile: rule.perMile,
      perMinute: rule.perMinute,
      airportSurcharge: rule.airportSurcharge,
      nightSurcharge: rule.nightSurcharge,
      serviceMultiplier: rule.serviceMultiplier,
      enabled: rule.enabled,
      note: rule.note
    })
    success.value = U.saveOk
    await load()
  } catch (e) {
    error.value = e.message || U.saveFail
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
    matrixImportError.value = U.matrixEmpty
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
    success.value = U.matrixOk
  } catch (e) {
    matrixImportError.value = e.message || U.matrixFail
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
    ruleImportError.value = U.jsonBad
    return
  }
  if (!Array.isArray(parsed)) {
    ruleImportError.value = U.importMustArr
    return
  }

  importing.value = true
  try {
    const data = await importPricingRules(parsed)
    const failedCount = Array.isArray(data.failed) ? data.failed.length : 0
    success.value = `${U.id1}${data.created || 0}${U.id2}${data.updated || 0}${U.id3}${failedCount}`
    await load()
  } catch (e) {
    ruleImportError.value = e.message || U.importFail
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  await Promise.allSettled([
    load(),
    loadExchangeRate(),
    loadServiceTypes(),
    loadVehicleClasses(),
    loadFixed(),
    loadRoutes()
  ])
})
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
.legacy-section {
  margin: 16px 0;
  padding: 12px 16px;
}
.legacy-section summary {
  cursor: pointer;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}
.legacy-inner {
  margin-top: 12px;
}
.fixed-table .calc-cell {
  font-weight: 600;
  color: #0f766e;
  white-space: nowrap;
}
.route-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.route-ops {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.btn.small {
  padding: 4px 10px;
  font-size: 12px;
}
code {
  font-size: 12px;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}
.route-form-card {
  max-width: 480px;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}
.modal-card {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.field-label {
  display: block;
  margin: 10px 0 4px;
  font-size: 13px;
  color: #64748b;
}
.exchange-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}
.exchange-label,
.exchange-suffix {
  color: #475569;
  font-size: 14px;
}
.exchange-input {
  max-width: 140px;
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
.service-type-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.service-type-cell select {
  min-width: 7.5rem;
  max-width: 12rem;
  width: 100%;
}
</style>
