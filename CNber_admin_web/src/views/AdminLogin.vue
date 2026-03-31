<template>
  <div class="login-page">
    <el-card class="login-box">
      <h2 style="text-align:center;">CNber 后台登录</h2>
      <el-form :model="form" @submit.prevent="login">
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input type="password" v-model="form.password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="login" :loading="loading">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/utils/request'
import router from '@/router'

const form = ref({ username: '', password: '' })
const loading = ref(false)

const login = async () => {
  loading.value = true
  const res = await request.post('/auth/login', form.value)
  localStorage.setItem('token', res.data.token)
  localStorage.setItem('adminInfo', JSON.stringify(res.data.admin))
  loading.value = false
  router.push('/users')
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.login-box {
  width: 400px;
}
</style>
