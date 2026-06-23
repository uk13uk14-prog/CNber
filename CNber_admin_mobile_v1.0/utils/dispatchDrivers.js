export function idOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref._id) return String(ref._id)
  return String(ref)
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
  const phone = raw.phone || profile.phone || (userRef?.phone || '')
  const carPlate = raw.carPlate || raw.vehiclePlate || profile.vehiclePlate || ''
  const carModel = raw.carModel || raw.vehicleModel || profile.vehicleModel || ''
  const label = raw.label || `${phone || '—'} / ${carPlate || '—'} / ${carModel || '—'}`
  return { ...raw, id: userId, _id: userId, userId: userRef || { _id: userId, phone }, phone, label, carPlate, carModel }
}

export function normalizeDriverList(list) {
  return (Array.isArray(list) ? list : []).map(normalizeDriverForSelect).filter(Boolean)
}

export function driverOptionValue(driver) {
  return idOf(driver?.userId || driver?.id || driver?._id)
}

export function driverOptionLabel(driver) {
  const row = normalizeDriverForSelect(driver) || driver
  return row?.label || row?.phone || driverOptionValue(row) || '—'
}

export function canUnassignOrder(order, busyAssigning) {
  if (busyAssigning) return false
  if (!(order.assignedDriver || order.driverId)) return false
  if (['accepted', 'driver_accepted', 'started', 'in_progress', 'arrived', 'completed', 'cancelled'].includes(order.status)) {
    return false
  }
  return (
    ['assigned', 'deposit_paid', 'pending'].includes(order.status) ||
    ['assigned', 'unassigned', 'pending', 'accepted'].includes(order.dispatchStatus || 'pending')
  )
}
