<template>
  <div class="drivers-page">
    <el-card>
      <div class="filter-bar">
        <el-select v-model="status" placeholder="筛选状态" @change="fetchDrivers" clearable>
          <el-option label="全部" value="" />
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已封禁" value="banned" />
        </el-select>
      </div>

      <el-table :data="drivers" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="司机姓名" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="licenseNumber" label="驾照编号" />
        <el-table-column prop="status" label="状态" />
        <el-table-column prop="createdAt" label="注册时间" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" size="small" @click="approve(row._id)">通过</el-button>
            <el-button v-if="row.status === 'pending'" type="danger" size="small" @click="reject(row._id)">拒绝</el-button>
            <el-button v-if="row.status === 'approved'" type="danger" size="small" @click="ban(row._id)">封禁</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        layout="prev, pager, next"
        :total="total"
        :page-size="10"
        :current-page="page"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const drivers = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const status = ref('')

const fetchDrivers = async () => {
  loading.value = true
  const res = await request.get('/driver/list', {
    params: { page: page.value, status: status.value }
  })
  drivers.value = res.data.drivers
  total.value = res.data.total
  loading.value = false
}

const handlePageChange = (p) => {
  page.value = p
  fetchDrivers()
}

const approve = async (id) => {
  await request.post(`/driver/${id}/approve`)
  fetchDrivers()
}
const reject = async (id) => {
  await request.post(`/driver/${id}/reject`)
  fetchDrivers()
}
const ban = async (id) => {
  await request.post(`/driver/${id}/ban`)
  fetchDrivers()
}

onMounted(fetchDrivers)
</script>

<style scoped>
.drivers-page {
  padding: 20px;
}
.filter-bar {
  margin-bottom: 20px;
}
</style>
