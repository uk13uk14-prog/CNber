/** 调度中心 — 司机下拉与派单辅助（与 OrdersView 逻辑一致） */

export function idOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref._id) return String(ref._id)
  return String(ref)
}

export function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
}

export function extractDriverRows(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.drivers)) return data.drivers
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.external)) return data.external
  return []
}

export function normalizeDriverForSelect(raw) {
  if (!raw) return null
  const userRef = raw.userId && typeof raw.userId === 'object' ? raw.userId : null
  const userId = idOf(userRef || raw.userId || raw.id || raw._id)
  if (!userId) return null
  const profile = raw.driverProfile || userRef?.driverProfile || {}
  const status = String(raw.status || profile.status || raw.serviceStatus || '').toLowerCase()
  const serviceStatus = String(raw.serviceStatus || profile.status || status || '').toLowerCase()
  const approvalStatus =
    raw.approvalStatus ||
    raw.reviewStatus ||
    profile.approvalStatus ||
    profile.documents?.reviewStatus ||
    raw.verificationStatus ||
    ''
  const phone = raw.phone || profile.phone || phoneOf(userRef) || ''
  const carPlate =
    raw.carPlate ||
    raw.vehiclePlate ||
    profile.vehiclePlate ||
    raw.vehicle?.plateNo ||
    profile.vehicle?.plateNo ||
    ''
  const carModel =
    raw.carModel ||
    raw.vehicleModel ||
    profile.vehicleModel ||
    raw.vehicle?.model ||
    profile.vehicle?.model ||
    ''
  const label = raw.label || `${phone || '—'} / ${carPlate || '—'} / ${carModel || '—'}`
  return {
    ...raw,
    id: userId,
    _id: userId,
    userId: userRef || { _id: userId, phone, driverProfile: profile },
    phone,
    label,
    status,
    serviceStatus,
    approvalStatus,
    carPlate,
    carModel,
    available:
      raw.available === true ||
      status === 'online' ||
      serviceStatus === 'idle' ||
      serviceStatus === 'available' ||
      serviceStatus === 'online'
  }
}

export function normalizeDriverList(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeDriverForSelect)
    .filter(Boolean)
}

export function driverOptionValue(driver) {
  return idOf(driver?.userId || driver?.id || driver?._id)
}

export function driverOptionLabel(driver) {
  const row = normalizeDriverForSelect(driver) || driver
  if (row?.label) return row.label
  return row?.phone || driverOptionValue(row) || '—'
}

function isDriverAvailable(driver) {
  const row = normalizeDriverForSelect(driver) || driver
  if (row.available === true) return true
  const status = String(row.status || '').toLowerCase()
  if (['online', 'available', 'approved', 'idle', 'active'].includes(status)) return true
  const serviceStatus = String(row.serviceStatus || '').toLowerCase()
  if (['idle', 'available', 'online'].includes(serviceStatus)) return true
  const approval = String(row.approvalStatus || row.reviewStatus || '').toLowerCase()
  if (['approved', 'passed', 'verified'].includes(approval)) {
    if (['offline', 'rejected', 'blocked'].includes(status)) return false
    return true
  }
  return false
}

function activeDriverIds(orders) {
  const ids = new Set()
  for (const order of orders || []) {
    if (
      !['assigned', 'accepted', 'driver_accepted', 'ready_to_start', 'started', 'in_progress'].includes(
        order.status
      )
    ) {
      continue
    }
    const id = idOf(order.driverId)
    if (id) ids.add(id)
  }
  return ids
}

function driverRecentOrderCount(driver) {
  const n = Number(driver.recentOrderCount ?? driver.totalOrders ?? 0)
  return Number.isFinite(n) ? n : 0
}

function hashText(text) {
  return String(text || '')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

function simulatedDistance(order, driver) {
  const seed = `${order.pickup || ''}:${order.destination || ''}:${driverOptionValue(driver)}`
  return ((hashText(seed) % 120) / 10 + 0.5).toFixed(1)
}

export function selectableDriversForOrder(order, drivers, allOrders) {
  const busyIds = activeDriverIds(allOrders)
  const available = (drivers || []).filter((d) => isDriverAvailable(d))
  const notBusy = available.filter(
    (d) => !busyIds.has(driverOptionValue(d)) || driverOptionValue(d) === idOf(order.driverId)
  )
  const sorted = notBusy.slice().sort((a, b) => {
    const recentDiff = driverRecentOrderCount(a) - driverRecentOrderCount(b)
    if (recentDiff !== 0) return recentDiff
    return Number(simulatedDistance(order, a)) - Number(simulatedDistance(order, b))
  })
  return sorted.length ? sorted : notBusy
}

export function canUnassignOrder(order, busyAssigning) {
  if (busyAssigning) return false
  if (!(order.assignedDriver || order.driverId)) return false
  if (['accepted', 'driver_accepted', 'started', 'in_progress', 'arrived', 'completed', 'cancelled'].includes(order.status)) {
    return false
  }
  return ['assigned', 'deposit_paid', 'pending'].includes(order.status) ||
    ['assigned', 'unassigned', 'pending', 'accepted'].includes(order.dispatchStatus || 'pending')
}
