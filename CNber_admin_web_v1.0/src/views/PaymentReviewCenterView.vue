<template>
  <div>
    <h2>支付审核中心</h2>
    <p class="muted">人工核对微信/支付宝收款记录。客户提交流水号后标记为「待人工核对」，确认到账后再通过。</p>
    <p v-if="err" class="err">{{ err }}</p>

    <div class="toolbar card">
      <label>队列</label>
      <select v-model="stage" class="input" style="max-width: 160px">
        <option value="pending">待审核（全部）</option>
        <option value="deposit">待审定金</option>
        <option value="balance">待审尾款</option>
        <option value="refund">退款相关</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">刷新</button>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>订单号</th>
            <th>客户</th>
            <th>类型</th>
            <th>金额</th>
            <th>付款人</th>
            <th>付款方式</th>
            <th>流水号</th>
            <th>收款账户</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>备注</th>
            <th>截图</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in items" :key="row._id">
            <td>{{ row.orderNo || row.orderId }}</td>
            <td>{{ row.customerPhone || '—' }}</td>
            <td><span class="pill">{{ row.typeLabel || row.type }}</span></td>
            <td>{{ money(row.amount) }}</td>
            <td>{{ row.payerName || '—' }}</td>
            <td>{{ row.paymentMethodLabel || paymentMethodLabel(row.paymentMethod) }}</td>
            <td class="ref">{{ row.transactionRef || '—' }}</td>
            <td class="account">{{ formatReviewAccount(row) }}</td>
            <td><span class="pill pill-pending">{{ row.reviewStatus || '待人工核对' }}</span></td>
            <td>{{ fmtTime(row.submittedAt) }}</td>
            <td class="note" :title="row.note">{{ row.note || '—' }}</td>
            <td class="proof">
              <a v-if="row.proofImage" :href="row.proofImage" target="_blank" rel="noopener">查看</a>
              <span v-else>—</span>
            </td>
            <td>
              <router-link v-if="row.orderId" :to="{ name: 'order-detail', params: { id: row.orderId } }">
                审核
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!items.length && !loading" class="muted">暂无待审核记录</p>
    <div class="pager muted">
      共 {{ total }} 条
      <button type="button" class="btn mini" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <button type="button" class="btn mini" :disabled="page * pageSize >= total" @click="page++; load()">
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchPaymentReviews } from '@/api/admin'
import { paymentMethodLabel, formatReviewAccount } from '@/utils/paymentDisplay'

const route = useRoute()
const stage = ref('pending')
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const err = ref('')
const loading = ref(false)

function money(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : '—'
}

function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
}

async function load() {
  loading.value = true
  err.value = ''
  try {
    const data = await fetchPaymentReviews({
      stage: stage.value,
      page: page.value,
      pageSize
    })
    items.value = data.items || []
    total.value = data.total || 0
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (route.query.stage) stage.value = String(route.query.stage)
  load()
})

watch(
  () => route.query.stage,
  (s) => {
    if (s) {
      stage.value = String(s)
      page.value = 1
      load()
    }
  }
)
</script>

<style scoped>
.proof a {
  white-space: nowrap;
}
.note {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account {
  max-width: 160px;
  font-size: 13px;
}
.ref {
  max-width: 140px;
  font-size: 13px;
  word-break: break-all;
}
.pill-pending {
  background: #fffbeb;
  color: #b45309;
}
</style>
