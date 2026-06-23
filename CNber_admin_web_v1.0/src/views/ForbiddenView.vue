<template>
  <div>
    <h2>无权访问</h2>
    <p class="muted">当前角色没有此页面权限。</p>
    <router-link :to="home">返回首页</router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { defaultRouteForPermissions } from '@/router'

const auth = useAuthStore()
const home = computed(() => defaultRouteForPermissions(auth))
</script>
