<template>
  <div class="roles-page">
    <el-card>
      <el-table :data="roles" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="角色名称" />
        <el-table-column prop="permissions" label="权限模块">
          <template #default="{ row }">
            <el-tag v-for="perm in row.permissions" :key="perm" type="info" style="margin: 2px">{{ perm }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button size="small" @click="editRole(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const roles = ref([])
const loading = ref(false)

const fetchRoles = async () => {
  loading.value = true
  const res = await request.get('/auth/roles')
  roles.value = res.data.roles
  loading.value = false
}

const editRole = (row) => {
  alert(`未来可编辑角色权限: ${row.name}`)
}

onMounted(fetchRoles)
</script>

<style scoped>
.roles-page {
  padding: 20px;
}
</style>
