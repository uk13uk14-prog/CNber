<template>
  <div class="mobile-dashboard">
    <h2>CNber 移动控制台</h2>
    <el-card class="card" shadow="hover">
      <p>今日总订单：{{ stats.todayOrders }}</p>
      <p>待处理工单：{{ stats.pendingTickets }}</p>
      <p>异常订单数：{{ stats.stuckOrders }}</p>
      <p>AI 错误回复：{{ stats.aiErrors }}</p>
    </el-card>

    <el-card class="card" shadow="hover">
      <el-button type="danger" @click="handleResetAI" block>重启 AI 客服系统</el-button>
      <el-button type="warning" @click="handleForceCloseOrders" block>一键关闭所有异常订单</el-button>
      <el-button type="primary" @click="goToTickets" block>立即处理客服工单</el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import router from '@/router'

const stats = ref({
  todayOrders: 0,
  pendingTickets: 0,
  stuckOrders: 0,
  aiErrors: 0
})

const fetchStats = async () => {
  const res = await request.get('/dashboard/mobile-stats')
  stats.value = res.data
}

const handleResetAI = async () => {
  await request.post('/ai/restart')
  alert('AI 客服已重启')
}

const handleForceCloseOrders = async () => {
  await request.post('/order/force-close-stuck')
  alert('已批量关闭异常订单')
}

const goToTickets = () => {
  router.push('/tickets')
}

onMounted(fetchStats)
</script>

<style scoped>
.mobile-dashboard {
  padding: 20px;
}
.card {
  margin-bottom: 20px;
}
h2 {
  text-align: center;
  margin-bottom: 20px;
}
</style>
