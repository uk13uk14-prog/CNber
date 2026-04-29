<template>
  <div>
    <h2>司机管理</h2>
    <p class="muted">
      分层视图与分配页同源；「当前分层」相对当前登录管理员。行内按钮直接 upsert 关系。
    </p>

    <div v-if="loadErr" class="card err">{{ loadErr }}</div>

    <div class="buckets">
      <section v-for="sec in sections" :key="sec.key" class="card bucket">
        <h3>{{ sec.title }}</h3>
        <table v-if="sec.rows.length" class="data inner">
          <thead>
            <tr>
              <th>手机号</th>
              <th>资料状态</th>
              <th>车牌</th>
              <th>评分</th>
              <th>完成单</th>
              <th>当前分层</th>
              <th class="acts">快捷</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in sec.rows" :key="d._id" @click="selectRow(d)">
              <td>{{ phoneOf(d.userId) }}</td>
              <td>{{ driverStatusLabel(d.status) }}</td>
              <td>{{ d.carPlate || '—' }}</td>
              <td>{{ d.score ?? '—' }}</td>
              <td>{{ d.totalOrders ?? 0 }}</td>
              <td><span class="pill">{{ layerFor(d) }}</span></td>
              <td class="acts" @click.stop>
                <button type="button" class="btn mini" @click="quickLayer(d, 'team')">团队</button>
                <button type="button" class="btn mini" @click="quickLayer(d, 'familiar')">熟悉</button>
                <button type="button" class="btn mini" @click="quickLayer(d, 'external')">外部</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">暂无</p>
      </section>
    </div>

    <h3>全量司机（分页）</h3>
    <div class="toolbar card">
      <input v-model="search" class="input" placeholder="手机号搜索" />
      <button type="button" class="btn btn-primary" @click="reloadFlat">查询</button>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>手机号</th>
            <th>资料状态</th>
            <th>车牌</th>
            <th>评分</th>
            <th>完成单</th>
            <th>当前分层</th>
            <th class="acts">快捷</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in flatDrivers" :key="d._id" @click="selectRow(d)">
            <td>{{ phoneOf(d.userId) }}</td>
            <td>{{ driverStatusLabel(d.status) }}</td>
            <td>{{ d.carPlate || '—' }}</td>
            <td>{{ d.score ?? '—' }}</td>
            <td>{{ d.totalOrders ?? 0 }}</td>
            <td><span class="pill">{{ layerFor(d) }}</span></td>
            <td class="acts" @click.stop>
              <button type="button" class="btn mini" @click="quickLayer(d, 'team')">团队</button>
              <button type="button" class="btn mini" @click="quickLayer(d, 'familiar')">熟悉</button>
              <button type="button" class="btn mini" @click="quickLayer(d, 'external')">外部</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pager muted">共 {{ flatTotal }} 条</div>

    <div class="card form">
      <h3>维护分层关系（表单）</h3>
      <p class="muted">选中一行后可在下方微调关系分、备注，再保存。</p>
      <label>司机用户 ID</label>
      <input v-model="form.driverUserId" class="input" readonly />
      <label>分层</label>
      <select v-model="form.layer" class="input">
        <option value="team">team 自己团队</option>
        <option value="familiar">familiar 熟悉</option>
        <option value="external">external 不熟/外部</option>
      </select>
      <label>关系分（0–100）</label>
      <input v-model.number="form.relationScore" class="input" type="number" />
      <label>备注</label>
      <input v-model="form.note" class="input" type="text" />
      <button type="button" class="btn btn-primary" :disabled="saving || !form.driverUserId" @click="onSave">
        {{ saving ? '保存中…' : '保存关系' }}
      </button>
      <p v-if="saveMsg" :class="saveOk ? 'ok' : 'err2'">{{ saveMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchDriversForDispatch, fetchDrivers, putStaffDriverRelation } from '@/api/admin'
import { driverStatusLabel } from '@/utils/driverDisplay.js'

const team = ref([])
const familiar = ref([])
const external = ref([])
const loadErr = ref('')

const flatDrivers = ref([])
const flatTotal = ref(0)
const search = ref('')

const form = reactive({
  driverUserId: '',
  layer: 'familiar',
  relationScore: 50,
  note: ''
})

const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(false)

const sections = computed(() => [
  { key: 'team', title: '自己团队 (team)', rows: team.value },
  { key: 'familiar', title: '熟悉司机 (familiar)', rows: familiar.value },
  { key: 'external', title: '外部 / 不熟 (external)', rows: external.value }
])

const layerMap = computed(() => {
  const m = new Map()
  for (const d of team.value) m.set(uidOf(d), 'team')
  for (const d of familiar.value) m.set(uidOf(d), 'familiar')
  for (const d of external.value) m.set(uidOf(d), 'external')
  return m
})

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

function layerFor(d) {
  const id = uidOf(d)
  if (!id) return '—'
  if (layerMap.value.has(id)) return layerMap.value.get(id)
  return d.status === 'approved' ? 'external' : '—'
}

function selectRow(d) {
  form.driverUserId = uidOf(d)
  const rel = d.relation
  if (rel?.layer) form.layer = rel.layer
  else form.layer = layerFor(d)
  saveMsg.value = ''
}

async function quickLayer(d, layer) {
  saveMsg.value = ''
  saveOk.value = false
  try {
    await putStaffDriverRelation({
      driverUserId: uidOf(d),
      layer,
      relationScore: form.relationScore,
      note: form.note
    })
    saveOk.value = true
    saveMsg.value = `已设为 ${layer}`
    await loadBuckets()
    await reloadFlat()
  } catch (e) {
    saveMsg.value = e.message || '操作失败'
    saveOk.value = false
  }
}

async function loadBuckets() {
  loadErr.value = ''
  try {
    const d = await fetchDriversForDispatch()
    team.value = d.team || []
    familiar.value = d.familiar || []
    external.value = d.external || []
  } catch (e) {
    loadErr.value = e.message || '分层数据加载失败'
  }
}

async function reloadFlat() {
  const data = await fetchDrivers({
    page: 1,
    pageSize: 50,
    search: search.value || undefined
  })
  flatDrivers.value = data.drivers || []
  flatTotal.value = data.total ?? 0
}

async function onSave() {
  saving.value = true
  saveMsg.value = ''
  saveOk.value = false
  try {
    await putStaffDriverRelation({
      driverUserId: form.driverUserId,
      layer: form.layer,
      relationScore: form.relationScore,
      note: form.note
    })
    saveOk.value = true
    saveMsg.value = '已保存'
    await loadBuckets()
    await reloadFlat()
  } catch (e) {
    saveMsg.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadBuckets()
  await reloadFlat()
})
</script>

<style scoped>
.buckets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
@media (max-width: 1100px) {
  .buckets {
    grid-template-columns: 1fr;
  }
}
.bucket h3 {
  margin-top: 0;
  font-size: 15px;
}
table.inner {
  font-size: 13px;
}
tbody tr {
  cursor: pointer;
}
tbody tr:hover {
  background: #f9fafb;
}
.acts {
  white-space: nowrap;
}
.btn.mini {
  padding: 4px 8px;
  font-size: 12px;
  margin-right: 4px;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  font-size: 12px;
}
.form label {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  color: var(--muted);
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.err {
  color: var(--danger);
}
.err2 {
  color: var(--danger);
  font-size: 13px;
}
.ok {
  color: #059669;
  font-size: 13px;
}
.pager {
  margin: 8px 0 16px;
}
</style>
