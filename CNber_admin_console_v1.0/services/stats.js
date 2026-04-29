/**
 * 接口层：工作台统计 GET /admin/stats
 */
import { get } from '../utils/request.js'

export function fetchDashboardStats() {
  return get('admin/stats')
}
