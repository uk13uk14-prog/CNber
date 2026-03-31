<!-- src/views/finance/FinanceList.vue -->
<template>
  <div>
    <h2>提现申请列表</h2>
    <el-table :data="requests" style="margin-top: 20px;">
      <el-table-column prop="id" label="申请ID" />
      <el-table-column prop="driver" label="司机姓名" />
      <el-table-column prop="amount" label="申请金额" />
      <el-table-column label="操作">
        <template #default="scope">
          <el-button size="small" type="success" @click="approve(scope.row)">通过</el-button>
          <el-button size="small" type="danger" @click="reject(scope.row)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const requests = ref([
  { id: 'TX1001', driver: '司机张', amount: 120 },
  { id: 'TX1002', driver: '司机王', amount: 230 }
])

const approve = (row) => {
  alert(`通过提现申请：${row.id}`)
}

const reject = (row) => {
  alert(`驳回提现申请：${row.id}`)
}
</script>
