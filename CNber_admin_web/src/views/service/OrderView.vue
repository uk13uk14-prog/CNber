<!-- src/views/service/OrderView.vue -->
<template>
  <div>
    <h2>客服订单查看</h2>
    <el-table :data="orders" style="margin-top: 20px;">
      <el-table-column prop="orderId" label="订单号" />
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="customer" label="乘客姓名" />
      <el-table-column prop="createdAt" label="下单时间" />
    </el-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const orders = ref([
  {
    orderId: 'OD1001',
    status: '待派单',
    customer: '小明',
    createdAt: '2025-05-27 21:00'
  },
  {
    orderId: 'OD1002',
    status: '已完成',
    customer: '小红',
    createdAt: '2025-05-26 18:30'
  }
])
</script>
