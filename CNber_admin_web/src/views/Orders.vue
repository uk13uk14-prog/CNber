<template>
  <div class="orders-page">
    <el-card>
      <div class="filter-bar">
        <el-select v-model="status" placeholder="订单状态" @change="fetchOrders" clearable>
          <el-option label="全部" value="" />
          <el-option label="待支付" value="pending" />
          <el-option label="已支付" value="paid" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </div>

      <el-table :data="orders" v-loading="loading" style="width: 100%">
        <el-table-column prop="userPhone" label="用户手机号" />
        <el-table-column prop="driverName" label="司机姓名" />
        <el-table-column prop="from" label="出发地" />
        <el-table-column prop="to" label="目的地" />
        <el-table-column prop="price" label="价格" />
        <el-table-column prop="status" label="状态" />
        <el-table-column prop="createdAt" label="下单时间" />
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

const orders = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const status = ref('')

const fetchOrders = async () => {
  loading.value = true
  const res = await request.get('/order/list', {
    params: { page: page.value, status: status.value }
  })
  orders.value = res.data.orders
  total.value = res.data.total
  loading.value = false
}

const handlePageChange = (p) => {
  page.value = p
  fetchOrders()
}

onMounted(fetchOrders)
</script>

<style scoped>
.orders-page {
  padding: 20px;
}
.filter-bar {
  margin-bottom: 20px;
}
</style>
