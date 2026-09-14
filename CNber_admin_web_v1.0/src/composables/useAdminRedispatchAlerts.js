import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchAdminNotifications,
  markAdminNotificationRead
} from '@/api/admin'

const SEEN_KEY = 'cnber_admin_seen_notification_ids'
const POLL_MS = 8000

function loadSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    const list = raw ? JSON.parse(raw) : []
    return new Set((Array.isArray(list) ? list : []).map((id) => String(id)))
  } catch {
    return new Set()
  }
}

function saveSeen(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set).slice(-300)))
}

function formatPickup(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
}

export function useAdminRedispatchAlerts() {
  const router = useRouter()
  const unreadCount = ref(0)
  const redispatchCount = ref(0)
  const notifications = ref([])
  const panelOpen = ref(false)
  const popup = ref(null)
  let timer = null
  let audio = null

  function soundUrl() {
    return `${window.location.origin}/admin/sounds/redispatch.wav`
  }

  function playSound() {
    try {
      if (!audio) audio = new Audio(soundUrl())
      audio.currentTime = 0
      void audio.play().catch(() => {
        audio = new Audio('/sounds/redispatch.wav')
        void audio.play().catch(() => {})
      })
    } catch {
      /* ignore */
    }
  }

  function browserNotify(item) {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    try {
      new Notification(item.title || '有订单需要重新派单', {
        body: item.body || item.orderNo || '',
        tag: item.id
      })
    } catch {
      /* ignore */
    }
  }

  function requestPermission() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

  async function poll() {
    try {
      const data = await fetchAdminNotifications()
      unreadCount.value = Number(data?.unreadCount || 0)
      redispatchCount.value = Number(data?.redispatchCount || 0)
      const list = Array.isArray(data?.notifications) ? data.notifications : []
      notifications.value = list
      const seen = loadSeen()
      const fresh = list.filter(
        (row) =>
          row &&
          row.id &&
          row.type === 'REDISPATCH_REQUIRED' &&
          row.status !== 'resolved' &&
          !seen.has(String(row.id))
      )
      if (!fresh.length) return
      const first = fresh[0]
      for (const row of fresh) seen.add(String(row.id))
      saveSeen(seen)
      playSound()
      browserNotify(first)
      popup.value = first
    } catch {
      /* ignore */
    }
  }

  function later() {
    const item = popup.value
    popup.value = null
    if (item?.id) {
      void markAdminNotificationRead(item.id).catch(() => {})
    }
  }

  function goDispatch(item) {
    const target = item || popup.value
    popup.value = null
    if (!target?.orderId) return
    if (target.id) void markAdminNotificationRead(target.id).catch(() => {})
    router.push(`/orders/${target.orderId}/dispatch`)
  }

  function openOrder(item) {
    panelOpen.value = false
    if (!item?.orderId) return
    if (item.id) void markAdminNotificationRead(item.id).catch(() => {})
    if (item.type === 'REDISPATCH_REQUIRED') {
      router.push(`/orders/${item.orderId}/dispatch`)
    } else {
      router.push(`/orders/${item.orderId}`)
    }
  }

  function togglePanel() {
    panelOpen.value = !panelOpen.value
  }

  onMounted(() => {
    requestPermission()
    void poll()
    timer = setInterval(poll, POLL_MS)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return {
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
  }
}
