<template>
  <div class="tickets-page">
    <el-card>
      <div class="filter-bar">
        <el-select v-model="status" placeholder="筛选状态" @change="fetchTickets" clearable>
          <el-option label="全部" value="" />
          <el-option label="未处理" value="pending" />
          <el-option label="已处理" value="resolved" />
        </el-select>
      </div>

      <el-table :data="tickets" v-loading="loading" style="width: 100%">
        <el-table-column prop="userPhone" label="用户手机号" />
        <el-table-column prop="subject" label="问题标题" />
        <el-table-column prop="description" label="内容" />
        <el-table-column prop="status" label="状态" />
        <el-table-column prop="createdAt" label="提交时间" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="success" @click="markResolved(row._id)">标记为已处理</el-button>
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

const tickets = ref([])
const status = ref('')
const page = ref(1)
const total = ref(0)
const loading = ref(false)

const fetchTickets = async () => {
  loading.value = true
  const res = await request.get('/support/list', {
    params: { page: page.value, status: status.value }
  })
  tickets.value = res.data.tickets
  total.value = res.data.total
  loading.value = false
}

const markResolved = async (id) => {
  await request.post(`/support/${id}/resolve`)
  fetchTickets()
}

const handlePageChange = (p) => {
  page.value = p
  fetchTickets()
}

onMounted(fetchTickets)
</script>

<style scoped>
.tickets-page {
  padding: 20px;
}
.filter-bar {
  margin-bottom: 20px;
}
</style>
