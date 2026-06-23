import { request } from './request.js'

export function getDriverDashboard() {
  return request({
    url: '/driver/dashboard',
    method: 'GET'
  })
}

export function updateDriverStatus(status) {
  return request({
    url: '/driver/status',
    method: 'POST',
    data: { status }
  })
}

export function updateDriverAccount(payload) {
  return request({
    url: '/driver/account',
    method: 'PATCH',
    data: payload
  })
}

export function getDriverProfile() {
  return request({
    url: '/driver/profile',
    method: 'GET'
  })
}

export function getDriverIncomeSummary() {
  return request({
    url: '/driver/income/summary',
    method: 'GET'
  })
}

export function getDriverSettlements(params = {}) {
  return request({
    url: '/driver/settlements',
    method: 'GET',
    data: params
  })
}

export function getDriverRatings(params = {}) {
  return request({
    url: '/driver/ratings',
    method: 'GET',
    data: params
  })
}

export function updateDriverProfile(payload) {
  return request({
    url: '/driver/profile',
    method: 'PATCH',
    data: payload
  })
}

export function getDriverOrders() {
  return request({
    url: '/driver/orders',
    method: 'GET'
  })
}

export function acceptAssignedOrder(orderId) {
  return request({
    url: `/driver/orders/${orderId}/accept`,
    method: 'PATCH'
  })
}

export function rejectAssignedOrder(orderId) {
  return request({
    url: `/driver/orders/${orderId}/reject`,
    method: 'PATCH'
  })
}
