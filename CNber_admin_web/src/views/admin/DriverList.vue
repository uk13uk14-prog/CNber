<template>
  <div>
    <h2>司机管理</h2>
    <el-button type="primary" @click="dialogVisible = true">新增司机</el-button>
    <el-table :data="drivers" style="margin-top: 20px;">
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="phone" label="手机号" />
    </el-table>
    <el-dialog v-model="dialogVisible" title="添加司机">
      <el-form :model="form">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const drivers = ref([
  { name: '张三', phone: '13100001111' },
  { name: '李四', phone: '13100002222' }
])
const dialogVisible = ref(false)
const form = ref({ name: '', phone: '' })
const submit = () => {
  drivers.value.push({ ...form.value })
  dialogVisible.value = false
  form.value = { name: '', phone: '' }
}
</script>
