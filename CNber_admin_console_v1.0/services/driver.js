/**
 * 接口层：司机列表（管理端 GET /admin/drivers）
 */
import { get } from '../utils/request.js'

export function fetchDriverList(params = {}) {
  return get('admin/drivers', params)
}

export function fetchAvailableDrivers() {
  return get('admin/drivers/available')
}
