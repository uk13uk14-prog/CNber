<template>
  <div>
    <h2>司机入驻审核</h2>
    <p class="muted">预约制运营：司机须审核通过且启用后，方可被人工派单。</p>
    <p v-if="err" class="err">{{ err }}</p>

    <div class="toolbar card">
      <label>审核状态</label>
      <select v-model="filterStatus" class="input" style="max-width: 140px">
        <option value="">全部</option>
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已拒绝</option>
        <option value="suspended">已停用</option>
      </select>
      <button type="button" class="btn btn-primary" @click="page = 1; load()">查询</button>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>手机号</th>
            <th>审核</th>
            <th>启用</th>
            <th>车牌</th>
            <th>车型</th>
            <th>证件</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in items" :key="d.userId">
            <td>{{ d.phone }}</td>
            <td>{{ verificationLabel(d.verificationStatus) }}</td>
            <td>{{ d.isActive ? '是' : '否' }}</td>
            <td>{{ d.vehiclePlate || '—' }}</td>
            <td>{{ d.vehicleModel || '—' }}</td>
            <td class="proof">
              <a v-if="d.drivingLicenseImage" :href="d.drivingLicenseImage" target="_blank" rel="noopener">驾照</a>
              <a v-if="d.insuranceImage" :href="d.insuranceImage" target="_blank" rel="noopener">保险</a>
            </td>
            <td>{{ d.adminNotes || '—' }}</td>
            <td class="acts">
              <button
                v-if="d.verificationStatus === 'pending'"
                type="button"
                class="btn mini btn-primary"
                @click="patchVerify(d, 'approved')"
              >
                通过
              </button>
              <button
                v-if="d.verificationStatus === 'pending'"
                type="button"
                class="btn mini btn-danger"
                @click="patchVerify(d, 'rejected')"
              >
                拒绝
              </button>
              <button
                v-if="d.verificationStatus === 'approved'"
                type="button"
                class="btn mini"
                @click="toggleActive(d)"
              >
                {{ d.isActive ? '停用' : '启用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!items.length && !loading" class="muted">暂无司机</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchDriverOnboarding, patchDriverActive, patchDriverVerification } from '@/api/admin'
import { VERIFICATION_LABELS } from '@/utils/p0Labels'

const filterStatus = ref('pending')
const items = ref([])
const page = ref(1)
const err = ref('')
const loading = ref(false)

function verificationLabel(s) {
  return VERIFICATION_LABELS[s] || s || '—'
}

async function load() {
  loading.value = true
  err.value = ''
  try {
    const data = await fetchDriverOnboarding({
      verificationStatus: filterStatus.value || undefined,
      page: page.value,
      pageSize: 30
    })
    items.value = data.items || []
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function patchVerify(row, verificationStatus) {
  const adminNotes = window.prompt('审核备注（可选）', row.adminNotes || '') ?? row.adminNotes
  try {
    await patchDriverVerification(row.userId, { verificationStatus, adminNotes })
    await load()
  } catch (e) {
    err.value = e.message || '操作失败'
  }
}

async function toggleActive(row) {
  try {
    await patchDriverActive(row.userId, { isActive: !row.isActive })
    await load()
  } catch (e) {
    err.value = e.message || '操作失败'
  }
}

onMounted(load)
</script>

<style scoped>
.acts {
  white-space: nowrap;
}
.proof a {
  margin-right: 6px;
}
</style>
