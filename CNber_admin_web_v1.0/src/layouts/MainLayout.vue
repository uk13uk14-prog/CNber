<template>
  <div class="layout">
    <aside class="aside">
      <div class="brand">CNber 后台</div>
      <nav class="nav">
        <router-link to="/">工作台</router-link>
        <router-link to="/orders">订单</router-link>
        <router-link to="/drivers">司机管理</router-link>
        <router-link to="/pricing">报价设置</router-link>
      </nav>
      <div class="foot">
        <span class="muted">{{ auth.user?.phone }}</span>
        <button type="button" class="btn" @click="onLogout">退出</button>
      </div>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}
.aside {
  width: 200px;
  background: #1f2937;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.brand {
  padding: 20px 16px;
  font-weight: 700;
  font-size: 16px;
  border-bottom: 1px solid #374151;
}
.nav {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  flex: 1;
}
.nav a {
  color: #d1d5db;
  padding: 10px 16px;
  text-decoration: none;
}
.nav a:hover {
  background: #374151;
  color: #fff;
}
.nav a.router-link-active {
  background: #2563eb;
  color: #fff;
}
.foot {
  padding: 12px 16px;
  border-top: 1px solid #374151;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.muted {
  font-size: 12px;
  color: #9ca3af;
}
.main {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
</style>
