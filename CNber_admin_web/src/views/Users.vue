<template>
  <div class="users-page">
    <el-card>
      <div class="filter-bar">
        <el-input v-model="search" placeholder="搜索手机号 / 昵称" clearable @clear="fetchUsers" @input="fetchUsers" />
      </div>
      <el-table :data="users" style="width: 100%" v-loading="loading">
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="status" label="状态" />
        <el-table-column prop="createdAt" label="注册时间" />
        <el-table-column label="操作">
          <template #default="scope">
            <el-button size="small" type="danger" @click="toggleBan(scope.row)">
              {{ scope.row.status === 'banned' ? '解封' : '封禁' }}
            </el-button>
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

const users = ref([])
const page = ref(1)
const total = ref(0)
const search = ref('')
const loading = ref(false)

const fetchUsers = async () => {
  loading.value = true
  const res = await request.get('/user/list', {
    params: { page: page.value, search: search.value }
  })
  users.value = res.data.users
  total.value = res.data.total
  loading.value = false
}

const toggleBan = async (user) => {
  await request.post(`/user/${user._id}/${user.status === 'banned' ? 'unban' : 'ban'}`)
  fetchUsers()
}

const handlePageChange = (p) => {
  page.value = p
  fetchUsers()
}

onMounted(fetchUsers)
</script>

<style scoped>
.users-page {
  padding: 20px;
}
.filter-bar {
  margin-bottom: 20px;
}
</style>
