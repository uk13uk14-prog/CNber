<template>
  <div class="ai-logs-page">
    <el-card>
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="搜索问题关键词" @keyup.enter="fetchLogs" clearable @clear="fetchLogs" />
      </div>

      <el-table :data="logs" v-loading="loading" style="width: 100%">
        <el-table-column prop="userPhone" label="用户手机号" />
        <el-table-column prop="question" label="用户问题" />
        <el-table-column prop="response" label="AI 回复" />
        <el-table-column prop="intent" label="命中意图" />
        <el-table-column prop="createdAt" label="时间" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const logs = ref([])
const keyword = ref('')
const loading = ref(false)

const fetchLogs = async () => {
  loading.value = true
  const res = await request.get('/ai/logs', { params: { keyword: keyword.value } })
  logs.value = res.data.logs
  loading.value = false
}

onMounted(fetchLogs)
</script>

<style scoped>
.ai-logs-page {
  padding: 20px;
}
.filter-bar {
  margin-bottom: 20px;
  width: 300px;
}
</style>
