<template>
  <div class="layout">
    <aside class="aside">
      <div class="brand">
        CNber 后台
        <span class="sidebar-version">菜单 V3</span>
      </div>
      <nav class="nav">
        <router-link
          v-if="auth.can('dashboard', 'view')"
          to="/"
          class="nav-item nav-top"
          active-class="nav-active"
        >
          工作台
        </router-link>

        <router-link
          to="/operations-dashboard"
          class="nav-item nav-top"
          active-class="nav-active"
        >
          运营驾驶舱
        </router-link>

        <div v-for="group in visibleMenuGroups" :key="group.title" class="nav-group">
          <button
            type="button"
            class="nav-group-title"
            :aria-expanded="isGroupExpanded(group.title)"
            @click="toggleGroup(group.title)"
          >
            <span class="nav-group-accent" aria-hidden="true"></span>
            <span class="nav-group-label">{{ group.title }}</span>
            <span class="nav-group-chevron" aria-hidden="true">
              {{ isGroupExpanded(group.title) ? '⌄' : '›' }}
            </span>
          </button>
          <div v-show="isGroupExpanded(group.title)" class="nav-group-items">
            <router-link
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="nav-item nav-sub"
              active-class="nav-active"
            >
              {{ item.label }}
            </router-link>
          </div>
        </div>
      </nav>
      <div class="foot">
        <span class="muted">{{ auth.user?.phone }}</span>
        <span v-if="roleLabel" class="role-tag">{{ roleLabel }}</span>
        <button type="button" class="btn" @click="onLogout">退出</button>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <button type="button" class="bell-btn" @click="togglePanel">
          🔔
          <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount }}</span>
        </button>
        <span v-if="redispatchCount > 0" class="redispatch-chip">
          待重新派单 {{ redispatchCount }}
        </span>
        <div v-if="panelOpen" class="notice-panel">
          <div class="notice-head">通知中心</div>
          <button
            v-for="item in notifications"
            :key="item.id"
            type="button"
            class="notice-item"
            @click="openOrder(item)"
          >
            <strong>{{ typeLabel(item.type) }}</strong>
            <span>{{ item.orderNo || item.title }}</span>
            <em>{{ item.status === 'unread' ? '未读' : item.status === 'resolved' ? '已处理' : '已读' }}</em>
          </button>
          <p v-if="!notifications.length" class="muted notice-empty">暂无未处理通知</p>
        </div>
      </header>
      <router-view />
      <div v-if="popup" class="alert-mask">
        <div class="alert-modal">
          <h3>有订单需要重新派单</h3>
          <p>订单号：{{ popup.orderNo || '—' }}</p>
          <p>原司机：{{ popup.payload?.previousDriverPhone || '—' }}</p>
          <p>取消原因：{{ popup.payload?.reason || '—' }}</p>
          <p>出发时间：{{ formatPickup(popup.payload?.pickupAt) }}</p>
          <p>出发地：{{ popup.payload?.pickup || '—' }}</p>
          <p>目的地：{{ popup.payload?.destination || '—' }}</p>
          <div class="alert-actions">
            <button type="button" class="btn" @click="later">稍后处理</button>
            <button type="button" class="btn btn-alert" @click="goDispatch()">立即重新派单</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS, MENU_GROUPS, filterMenuGroups } from '@/utils/staffRoles'
import { useAdminRedispatchAlerts } from '@/composables/useAdminRedispatchAlerts'

const SIDEBAR_STORAGE_KEY = 'cnber_admin_sidebar_groups'

const auth = useAuthStore()
const router = useRouter()
const {
  unreadCount,
  redispatchCount,
  notifications,
  panelOpen,
  popup,
  formatPickup,
  later,
  goDispatch,
  openOrder,
  togglePanel
} = useAdminRedispatchAlerts()

function typeLabel(type) {
  const map = {
    NEW_ORDER: '新订单',
    DRIVER_CANCELLED: '司机取消派单',
    REDISPATCH_REQUIRED: '待重新派单',
    DRIVER_CANCEL_REQUEST_APPROVED: '乘客同意取消'
  }
  return map[type] || type
}

const visibleMenuGroups = computed(() =>
  filterMenuGroups(auth.staffRole, auth.permissions, (module) => auth.can(module, 'view'))
)
const roleLabel = computed(() => ROLE_LABELS[auth.staffRole] || '')

const groupExpanded = ref({})

function readSavedGroupState() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistGroupState() {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(groupExpanded.value))
}

function initGroupState() {
  const saved = readSavedGroupState()
  const next = {}
  for (const group of MENU_GROUPS) {
    next[group.title] = saved[group.title] !== false
  }
  groupExpanded.value = next
}

function isGroupExpanded(title) {
  return groupExpanded.value[title] !== false
}

function toggleGroup(title) {
  groupExpanded.value = {
    ...groupExpanded.value,
    [title]: !isGroupExpanded(title)
  }
  persistGroupState()
}

watch(visibleMenuGroups, (groups) => {
  const next = { ...groupExpanded.value }
  let changed = false
  for (const group of groups) {
    if (next[group.title] === undefined) {
      next[group.title] = true
      changed = true
    }
  }
  if (changed) {
    groupExpanded.value = next
    persistGroupState()
  }
})

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

onMounted(async () => {
  initGroupState()
  if (auth.isAuthenticated && !auth.permissionsLoaded) {
    await auth.loadPermissions()
  }
})
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.aside {
  width: 220px;
  background: #1a2433;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.brand {
  padding: 20px 16px;
  font-weight: 700;
  font-size: 16px;
  border-bottom: 1px solid #2d3f55;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-version {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #60a5fa;
  text-transform: uppercase;
}

.nav {
  display: flex;
  flex-direction: column;
  padding: 10px 0 16px;
  flex: 1;
  overflow-y: auto;
}

.nav-group {
  margin-top: 10px;
}

.nav-group:first-of-type {
  margin-top: 6px;
}

.nav-group-title {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  margin: 0;
  padding: 10px 12px 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8fa3bd;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-group-title:hover {
  color: #b8c9dc;
  background: rgba(38, 54, 74, 0.45);
}

.nav-group-accent {
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: #5b8def;
  flex-shrink: 0;
}

.nav-group-label {
  flex: 1;
  line-height: 1.2;
}

.nav-group-chevron {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  font-size: 13px;
  color: #8fa3bd;
  line-height: 1;
}

.nav-group-items {
  padding-top: 2px;
  padding-bottom: 4px;
}

.nav-item {
  display: block;
  position: relative;
  color: #dbe7f3;
  padding: 9px 16px 9px 32px;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.35;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-top {
  padding: 10px 16px;
  margin-bottom: 4px;
  font-weight: 600;
}

.nav-sub {
  padding-left: 32px;
}

.nav-item:hover {
  background: #26364a;
  color: #fff;
}

.nav-active {
  background: #2563eb;
  color: #fff;
  font-weight: 600;
}

.nav-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #93c5fd;
}

.foot {
  margin-top: auto;
  padding: 14px 16px 16px;
  border-top: 1px solid #3d5168;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #172030;
}

.muted {
  font-size: 12px;
  color: #9ca3af;
}

.role-tag {
  font-size: 11px;
  color: #93c5fd;
}

.btn {
  align-self: flex-start;
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid #4b5563;
  border-radius: 6px;
  background: #26364a;
  color: #e5e7eb;
  cursor: pointer;
}

.btn:hover {
  background: #31465f;
}

.main {
  flex: 1;
  padding: 24px;
  overflow: auto;
  position: relative;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -24px -24px 16px;
  padding: 10px 20px;
  background: #fff7ed;
  border-bottom: 1px solid #fed7aa;
}

.bell-btn {
  position: relative;
  border: 0;
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 18px;
  cursor: pointer;
}

.bell-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #dc2626;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.redispatch-chip {
  background: #ea580c;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 10px;
}

.notice-panel {
  position: absolute;
  top: 46px;
  left: 20px;
  width: 320px;
  max-height: 360px;
  overflow: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
}

.notice-head {
  padding: 10px 12px;
  font-weight: 700;
  border-bottom: 1px solid #f3f4f6;
}

.notice-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  border: 0;
  border-bottom: 1px solid #f3f4f6;
  background: #fff;
  padding: 10px 12px;
  cursor: pointer;
}

.notice-item em {
  font-style: normal;
  font-size: 11px;
  color: #ea580c;
}

.notice-empty {
  padding: 12px;
}

.alert-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-modal {
  width: min(480px, calc(100vw - 32px));
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.24);
}

.alert-modal h3 {
  margin: 0 0 12px;
  color: #c2410c;
}

.alert-modal p {
  margin: 6px 0;
  color: #111827;
}

.alert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.btn-alert {
  background: #ea580c;
  border-color: #c2410c;
  color: #fff;
}
</style>
