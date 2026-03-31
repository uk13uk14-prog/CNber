<template>
  <div style="text-align:center;margin-top:50px;">
    <h1>CNber 后台登录</h1>
    <input v-model="account" placeholder="请输入手机号" /><br/><br/>
    <input v-model="password" type="password" placeholder="请输入密码" /><br/><br/>
    <button @click="login">登录</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from '@/utils/request'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const account = ref('')
const password = ref('')

const login = async () => {
  try {
    const res = await axios.post('/auth/login', {
      phone: account.value,
      password: password.value
    })

    const { token, user } = res

    if (!token) {
      return ElMessage.error('登录失败：服务器无 token 返回')
    }

    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    ElMessage.error('登录失败，请检查账号密码或接口是否正常')
  }
}
</script>
