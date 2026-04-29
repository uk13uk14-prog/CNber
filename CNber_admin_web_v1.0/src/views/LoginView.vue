<template>
  <div class="wrap">
    <div class="box card">
      <h1>CNber 管理后台</h1>
      <p class="muted">请使用管理员账号登录</p>
      <form @submit.prevent="onSubmit">
        <label>手机号</label>
        <input v-model="phone" class="input" type="text" autocomplete="username" />
        <label>密码</label>
        <input
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
        />
        <div class="remember-row">
          <label class="remember-item">
            <input v-model="rememberPhone" type="checkbox" />
            <span>记住账号</span>
          </label>
          <label class="remember-item">
            <input v-model="rememberPassword" type="checkbox" />
            <span>记住密码</span>
          </label>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const ADMIN_REMEMBER_PHONE = 'ADMIN_REMEMBER_PHONE'
const ADMIN_REMEMBER_PASSWORD = 'ADMIN_REMEMBER_PASSWORD'

const phone = ref('')
const password = ref('')
const rememberPhone = ref(false)
const rememberPassword = ref(false)
const loading = ref(false)
const error = ref('')

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

function loadRememberedLogin() {
  const rememberedPhone = localStorage.getItem(ADMIN_REMEMBER_PHONE) || ''
  const rememberedPassword = localStorage.getItem(ADMIN_REMEMBER_PASSWORD) || ''

  if (rememberedPhone) {
    phone.value = rememberedPhone
    rememberPhone.value = true
  }

  if (rememberedPassword) {
    password.value = rememberedPassword
    rememberPassword.value = true
    rememberPhone.value = true
  }
}

function saveRememberedLogin() {
  if (rememberPhone.value || rememberPassword.value) {
    localStorage.setItem(ADMIN_REMEMBER_PHONE, phone.value)
  } else {
    localStorage.removeItem(ADMIN_REMEMBER_PHONE)
  }

  if (rememberPassword.value) {
    localStorage.setItem(ADMIN_REMEMBER_PASSWORD, password.value)
  } else {
    localStorage.removeItem(ADMIN_REMEMBER_PASSWORD)
  }
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(phone.value, password.value)
    saveRememberedLogin()
    const redirect = route.query.redirect || '/'
    router.replace(typeof redirect === 'string' ? redirect : '/')
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadRememberedLogin)
</script>

<style scoped>
.wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.box {
  width: 100%;
  max-width: 400px;
}
h1 {
  margin: 0 0 8px;
  font-size: 22px;
}
form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}
label {
  font-size: 13px;
  color: var(--muted);
}
.remember-row {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 4px;
}
.remember-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text);
}
.err {
  color: var(--danger);
  font-size: 13px;
  margin: 0;
}
button {
  margin-top: 12px;
}
</style>
