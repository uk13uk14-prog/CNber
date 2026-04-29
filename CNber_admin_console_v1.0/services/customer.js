/**
 * 接口层：客户（复用 GET /user/list，role=user）
 */
import { get } from '../utils/request.js'

export function fetchCustomerList(params = {}) {
  return get('user/list', { ...params, role: 'user' })
}
