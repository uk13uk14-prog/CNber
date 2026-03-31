<template>
  <div class="alumni-page">
    <el-card>
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="搜索学校 / 姓名 / 专业" @input="fetchAlumni" clearable />
      </div>

      <el-table :data="alumni" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="school" label="学校" />
        <el-table-column prop="major" label="专业" />
        <el-table-column prop="year" label="入学年份" />
        <el-table-column prop="status" label="状态" />
        <el-table-column prop="createdAt" label="提交时间" />
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

const alumni = ref([])
const page = ref(1)
const total = ref(0)
const keyword = ref('')
const loading = ref(false)

const fetchAlumni = async () => {
  loading.value = true
  const res = await request.get('/alumni/list', {
    params: { page: page.value, keyword: keyword.value }
  })
  alumni.value = res.data.alumni
  total.value = res.data.total
  loading.value = false
}

const handlePageChange = (p) => {
  page.value = p
  fetchAlumni()
}

onMounted(fetchAlumni)
</script>

<style scoped>
.alumni-page {
  padding: 20px;
}
.filter-bar {
  margin-bottom: 20px;
  width: 300px;
}
</style>
