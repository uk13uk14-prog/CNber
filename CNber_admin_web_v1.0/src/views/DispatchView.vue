<template>
  <div>
    <p>
      <router-link :to="`/orders/${id}`">← 返回订单详情</router-link>
    </p>
    <h2>分配司机</h2>
    <div v-if="err" class="card err">{{ err }}</div>
    <div v-else class="card">
      <p class="muted">订单 {{ id }}</p>
      <p v-if="order._id">
        <strong>行程</strong> {{ order.pickup }} → {{ order.destination }}
      </p>
    </div>

    <p class="muted">按「自己团队 → 熟悉 → 外部」分组，单选一名司机后确认指派（仅待接单可指派）。</p>

    <div class="buckets">
      <section v-for="sec in sections" :key="sec.key" class="card bucket">
        <h3>{{ sec.title }}</h3>
        <p class="muted small">{{ sec.hint }}</p>
        <div v-if="!sec.rows.length" class="muted">暂无</div>
        <table v-else class="data inner">
          <thead>
            <tr>
              <th style="width: 40px" />
              <th>手机号</th>
              <th>资料状态</th>
              <th>车牌</th>
              <th>驾照号</th>
              <th>评分</th>
              <th>完成单</th>
              <th>关系分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in sec.rows" :key="d._id">
              <td>
                <input
                  v-model="selectedUid"
                  type="radio"
                  :value="uidOf(d)"
                  :disabled="order.status !== 'pending'"
                />
              </td>
              <td>{{ phoneOf(d.userId) }}</td>
              <td>{{ driverStatusLabel(d.status) }}</td>
              <td>{{ d.carPlate || '—' }}</td>
              <td>{{ d.licenseNumber || '—' }}</td>
              <td>{{ d.score ?? '—' }}</td>
              <td>{{ d.totalOrders ?? 0 }}</td>
              <td>{{ d.relation?.relationScore ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <div class="footer">
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!selectedUid || order.status !== 'pending' || assigning"
        @click="onAssign"
      >
        {{ assigning ? '指派中…' : '确认指派' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchOrderById, fetchDriversForDispatch, assignDriver } from '@/api/admin'
import { driverStatusLabel } from '@/utils/driverDisplay.js'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id)

const order = ref({})
const team = ref([])
const familiar = ref([])
const external = ref([])
const err = ref('')
const selectedUid = ref('')
const assigning = ref(false)

const sections = computed(() => [
  { key: 'team', title: '自己团队', rows: team.value, hint: 'layer = team' },
  { key: 'familiar', title: '熟悉司机', rows: familiar.value, hint: 'layer = familiar' },
  { key: 'external', title: '外部 / 不熟', rows: external.value, hint: '未维护或 layer = external' }
])

function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
}

function uidOf(d) {
  const u = d.userId
  if (u && typeof u === 'object' && u._id) return String(u._id)
  if (u) return String(u)
  return ''
}

async function load() {
  err.value = ''
  selectedUid.value = ''
  try {
    const [oData, dData] = await Promise.all([
      fetchOrderById(id.value),
      fetchDriversForDispatch(id.value)
    ])
    order.value = oData.order || {}
    team.value = dData.team || []
    familiar.value = dData.familiar || []
    external.value = dData.external || []
  } catch (e) {
    err.value = e.message || '加载失败'
  }
}

async function onAssign() {
  if (!selectedUid.value) return
  assigning.value = true
  try {
    await assignDriver(id.value, selectedUid.value)
    router.push({ name: 'order-detail', params: { id: id.value } })
  } catch (e) {
    err.value = e.message || '指派失败'
  } finally {
    assigning.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.buckets {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bucket h3 {
  margin: 0 0 4px;
  font-size: 16px;
}
.small {
  font-size: 12px;
  margin-top: 0;
}
table.inner {
  font-size: 13px;
}
.footer {
  margin-top: 20px;
}
.err {
  color: var(--danger);
}
</style>
